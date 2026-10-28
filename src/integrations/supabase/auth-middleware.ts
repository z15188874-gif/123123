import { createMiddleware } from "@tanstack/react-start";
import { createClient, type User } from "@supabase/supabase-js";
import type { Database } from "./types";
import { SUPABASE_URL as DEFAULT_URL, SUPABASE_PUBLISHABLE_KEY as DEFAULT_KEY } from "./client";

function getIsHttps(request: Request | null | undefined): boolean {
  const proto = request?.headers?.get("x-forwarded-proto");
  const host = request?.headers?.get("host") || "";
  const referer = request?.headers?.get("referer") || "";
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
  return (
    proto === "https" ||
    (request?.url ? request.url.startsWith("https:") : false) ||
    process.env["NODE_ENV"] === "production" ||
    (!isLocal &&
      (host.includes("run.app") ||
        host.includes("app.github.dev") ||
        host.includes("webcontainer.io") ||
        referer.startsWith("https:")))
  );
}

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

export type AppRole = "admin" | "student";

export function extractTrustedAppRole(
  appMetadata: Record<string, unknown> | undefined,
): AppRole | null {
  if (!appMetadata) return null;

  const directRole = appMetadata["role"];
  if (directRole === "admin") return "admin";
  if (directRole === "student") return "student";

  const roles = appMetadata["roles"];
  if (Array.isArray(roles)) {
    const hasAdmin = roles.includes("admin");
    const hasStudent = roles.includes("student");
    // Administrators must not automatically receive student permissions and vice versa
    if (hasAdmin && !hasStudent) return "admin";
    if (hasStudent && !hasAdmin) return "student";
  }

  return null;
}

export type AuthTokens = {
  accessToken: string | null;
  refreshToken: string | null;
};

export function extractTokensFromRequest(request: Request | null | undefined): AuthTokens {
  let accessToken: string | null = null;
  let refreshToken: string | null = null;

  if (!request?.headers) {
    return { accessToken: null, refreshToken: null };
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const bearer = authHeader.replace("Bearer ", "").trim();
    if (bearer) accessToken = bearer;
  }

  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    // 1. Check sb-access-token
    const accessMatch = cookieHeader.match(/(?:^|;\s*)sb-access-token=([^;]+)/);
    if (accessMatch && accessMatch[1]) {
      let val = decodeURIComponent(accessMatch[1]).trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      if (val && !accessToken) accessToken = val;
    }

    // 2. Check sb-refresh-token
    const refreshMatch = cookieHeader.match(/(?:^|;\s*)sb-refresh-token=([^;]+)/);
    if (refreshMatch && refreshMatch[1]) {
      let val = decodeURIComponent(refreshMatch[1]).trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      if (val) refreshToken = val;
    }

    // 3. Fallback: check for standard Supabase auth cookie (sb-*-auth-token)
    const sbMatch = cookieHeader.match(/(?:^|;\s*)sb-[^=]+-auth-token=([^;]+)/);
    if (sbMatch && sbMatch[1]) {
      try {
        let raw = decodeURIComponent(sbMatch[1]).trim();
        if (raw.startsWith('"') && raw.endsWith('"')) {
          raw = raw.slice(1, -1);
        }
        if (raw.startsWith("base64-")) {
          raw =
            typeof Buffer !== "undefined"
              ? Buffer.from(raw.slice(7), "base64").toString("utf-8")
              : atob(raw.slice(7));
        }
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          if (!accessToken && typeof parsed[0] === "string" && parsed[0]) {
            accessToken = parsed[0];
          }
          if (!refreshToken && typeof parsed[1] === "string" && parsed[1]) {
            refreshToken = parsed[1];
          }
        } else if (parsed && typeof parsed === "object") {
          const obj = parsed as Record<string, unknown>;
          if (!accessToken && typeof obj["access_token"] === "string" && obj["access_token"]) {
            accessToken = obj["access_token"];
          }
          if (!refreshToken && typeof obj["refresh_token"] === "string" && obj["refresh_token"]) {
            refreshToken = obj["refresh_token"];
          }
        }
      } catch {
        // Ignore fallback parse error
      }
    }
  }

  return { accessToken, refreshToken };
}

export function extractTokenFromRequest(request: Request | null | undefined): string | null {
  return extractTokensFromRequest(request).accessToken;
}

// In-memory promise map for deduplicating concurrent refresh requests for the same refresh token.
// NOTE: An in-memory promise map only coordinates concurrent requests within the same Node.js server process.
const refreshPromiseMap = new Map<
  string,
  Promise<{
    user: User | null;
    session: { access_token: string; refresh_token: string } | null;
    error: Error | null;
  }>
>();

export async function performDeduplicatedRefresh(
  refreshToken: string,
  supabaseUrl: string,
  supabaseKey: string,
): Promise<{
  user: User | null;
  session: { access_token: string; refresh_token: string } | null;
  error: Error | null;
}> {
  let existingPromise = refreshPromiseMap.get(refreshToken);
  if (!existingPromise) {
    existingPromise = (async () => {
      try {
        const client = createClient<Database>(supabaseUrl, supabaseKey, {
          global: {
            fetch: createSupabaseFetch(supabaseKey),
          },
          auth: {
            storage: undefined,
            persistSession: false,
            autoRefreshToken: false,
          },
        });

        const { data, error } = await client.auth.refreshSession({
          refresh_token: refreshToken,
        });

        if (error || !data.session || !data.user) {
          return {
            user: null,
            session: null,
            error: error ? new Error(error.message) : new Error("Failed to refresh session"),
          };
        }

        return {
          user: data.user,
          session: {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          },
          error: null,
        };
      } catch (err) {
        return {
          user: null,
          session: null,
          error: err instanceof Error ? err : new Error("Unexpected error during session refresh"),
        };
      }
    })();

    refreshPromiseMap.set(refreshToken, existingPromise);

    existingPromise.finally(() => {
      refreshPromiseMap.delete(refreshToken);
    });
  }

  return existingPromise;
}

export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const { getRequest, setCookie, deleteCookie } = await import("@tanstack/react-start/server");
    const SUPABASE_URL =
      process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"] || DEFAULT_URL;
    const SUPABASE_PUBLISHABLE_KEY =
      process.env["SUPABASE_PUBLISHABLE_KEY"] ||
      process.env["SUPABASE_ANON_KEY"] ||
      process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
      process.env["VITE_SUPABASE_ANON_KEY"] ||
      DEFAULT_KEY;

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    const request = getRequest();

    const clearAuthCookiesOnResponse = async (_req?: Request | null | undefined) => {
      try {
        const isHttps = getIsHttps(request);
        const clearOptions = {
          path: "/",
          maxAge: 0,
          sameSite: (isHttps ? "none" : "lax") as "none" | "lax",
          secure: isHttps,
          httpOnly: true,
          ...(isHttps ? { partitioned: true } : {}),
        };
        setCookie("sb-access-token", "", clearOptions);
        setCookie("sb-refresh-token", "", clearOptions);
        deleteCookie("sb-access-token", { path: "/" });
        deleteCookie("sb-refresh-token", { path: "/" });
      } catch {
        // Ignore in contexts where response context is unavailable
      }
    };
    const { accessToken, refreshToken } = extractTokensFromRequest(request);

    if (!accessToken && !refreshToken) {
      throw new Error("Unauthorized: No token provided");
    }

    const createAuthedClient = (token?: string) => {
      return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        global: {
          fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
        auth: {
          storage: undefined,
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    };

    let user: User | null = null;
    let activeToken = accessToken;

    // 1. Try validating existing access token using official setSession or getUser(accessToken)
    if (accessToken) {
      try {
        const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: {
            fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
          },
          auth: {
            storage: undefined,
            persistSession: false,
            autoRefreshToken: false,
          },
        });

        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken ?? "",
        });

        if (!sessionError && sessionData.user) {
          user = sessionData.user;
          activeToken = sessionData.session?.access_token || accessToken;
        } else {
          const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
          if (!userError && userData?.user) {
            user = userData.user;
          } else {
            console.error(
              "[AuthMiddleware] Validation failed:",
              sessionError?.message || userError?.message,
            );
          }
        }
      } catch (err) {
        console.error("[AuthMiddleware] Validation exception:", err);
      }
    }

    // 2. If access token is expired/missing but refresh token is available, refresh the session with deduplication
    if (!user && refreshToken) {
      const refreshResult = await performDeduplicatedRefresh(
        refreshToken,
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY,
      );

      if (!refreshResult.error && refreshResult.session && refreshResult.user) {
        user = refreshResult.user;
        activeToken = refreshResult.session.access_token;
        const newRefreshToken = refreshResult.session.refresh_token;

        // Persist refreshed tokens via server response cookies with strict attributes
        try {
          const isHttps = getIsHttps(request);
          const cookieOptions = {
            path: "/",
            sameSite: (isHttps ? "none" : "lax") as "none" | "lax",
            secure: isHttps,
            httpOnly: true,
            ...(isHttps ? { partitioned: true } : {}),
          };
          setCookie("sb-access-token", activeToken, {
            ...cookieOptions,
            maxAge: 3600,
          });
          if (newRefreshToken) {
            setCookie("sb-refresh-token", newRefreshToken, {
              ...cookieOptions,
              maxAge: 60 * 60 * 24 * 7,
            });
          }
        } catch {
          // If setCookie is not supported in the current test or execution context, ignore
        }
      } else {
        // When token refresh fails, clear all auth cookies immediately
        await clearAuthCookiesOnResponse(request);
      }
    }

    // 3. If user still cannot be verified, clear cookies and fail with clear unauthorized error
    if (!user) {
      await clearAuthCookiesOnResponse(request);
      if (!accessToken && !refreshToken) {
        throw new Error("Unauthorized: No token provided");
      }
      if (accessToken && accessToken.split(".").length !== 3 && !refreshToken) {
        throw new Error("Unauthorized: Invalid token format");
      }
      throw new Error("Unauthorized: Invalid or expired token");
    }

    const supabase = createAuthedClient(activeToken ?? undefined);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, grade")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("[AuthMiddleware] Failed to verify profile role:", profileError);
      throw new Error("Unauthorized: Could not verify account role");
    }

    const isAssistant =
      user.app_metadata?.role === "assistant" ||
      user.user_metadata?.role === "assistant" ||
      profile?.role === "assistant" ||
      Boolean(
        profile?.grade &&
        (profile.grade.includes('"isAssistant":true') || profile.grade.includes('"canAdd')),
      );

    let role: "admin" | "assistant" | "student" | null = null;
    if (isAssistant) {
      role = "assistant";
    } else if (profile?.role === "admin") {
      role = "admin";
    } else if (profile?.role === "student") {
      role = "student";
    }

    return next({
      context: {
        supabase,
        userId: user.id,
        user,
        role,
        claims: user.app_metadata,
      },
    });
  },
);

export const requireAdminAuth = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    if (context.role !== "admin" && context.role !== "assistant") {
      throw new Error("Forbidden: Requires admin or assistant role");
    }
    return next({
      context: {
        ...context,
        isAdmin: true as const,
      },
    });
  });

export const requireStudentAuth = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    if (context.role !== "student" && context.role !== "admin" && context.role !== "assistant") {
      throw new Error("Forbidden: Requires student role");
    }
    return next({
      context: {
        ...context,
        isStudent: true as const,
      },
    });
  });
