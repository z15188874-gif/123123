import { createServerFn } from "@tanstack/react-start";
import { getRequest, setCookie, deleteCookie } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  SUPABASE_URL as DEFAULT_URL,
  SUPABASE_PUBLISHABLE_KEY as DEFAULT_KEY,
} from "@/integrations/supabase/client";
import {
  extractTrustedAppRole,
  requireAdminAuth,
  requireStudentAuth,
  requireSupabaseAuth,
} from "@/integrations/supabase/auth-middleware";

export type SessionInfo = {
  authenticated: true;
  userId: string;
  role: string | null;
  email: string | undefined;
};

export type LoginResult = {
  success: true;
  role: "admin" | "student";
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
};

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

export const loginServerFn = createServerFn({ method: "POST" })
  .validator((input: { email: string; password: string }) => {
    if (!input || typeof input.email !== "string" || typeof input.password !== "string") {
      throw new Error("Invalid login payload");
    }
    return {
      email: input.email.trim(),
      password: input.password,
    };
  })
  .handler(async ({ data }): Promise<LoginResult> => {
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

    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (authError || !authData.session || !authData.user) {
      throw new Error(authError?.message || "Invalid credentials");
    }
const { data: profile, error: profileError } = await supabase
  .from("profiles")
    .select("role")
      .eq("id", authData.user.id)
        .maybeSingle();

        if (profileError) {
          console.error("[Login] Failed to verify profile role:", profileError);
            throw new Error("Could not verify account role");
            }

            const role =
              profile?.role === "admin" || profile?.role === "student"
                  ? profile.role
                      : null;

                      if (!role) {
                        throw new Error("UNAUTHORIZED_ROLE");
                        }
 
    const request = getRequest();
    const isHttps = getIsHttps(request);

    const cookieOptions = {
      path: "/",
      sameSite: (isHttps ? "none" : "lax") as "none" | "lax",
      secure: isHttps,
      httpOnly: true,
      ...(isHttps ? { partitioned: true } : {}),
    };

    // Issue cookies via response headers
    setCookie("sb-access-token", authData.session.access_token, {
      ...cookieOptions,
      maxAge: 3600,
    });

    // Refresh token is strictly HttpOnly
    setCookie("sb-refresh-token", authData.session.refresh_token, {
      ...cookieOptions,
      maxAge: 60 * 60 * 24 * 7,
    });

    return {
      success: true,
      role,
      userId: authData.user.id,
      email: authData.user.email ?? data.email,
      accessToken: authData.session.access_token,
      refreshToken: authData.session.refresh_token,
    };
  });

export const logoutServerFn = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ success: true }> => {
    const request = getRequest();
    const isHttps = getIsHttps(request);

    const SUPABASE_URL = process.env["SUPABASE_URL"] || DEFAULT_URL;
    const SUPABASE_PUBLISHABLE_KEY = process.env["SUPABASE_PUBLISHABLE_KEY"] || DEFAULT_KEY;

    // Revoke token on Supabase if present
    const cookieHeader = request?.headers?.get("cookie");
    if (cookieHeader && SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY) {
      const accessMatch = cookieHeader.match(/(?:^|;\s*)sb-access-token=([^;]+)/);
      const token = accessMatch && accessMatch[1] ? decodeURIComponent(accessMatch[1]) : undefined;

      try {
        const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          },
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        });
        await supabase.auth.signOut();
      } catch (err) {
        // Log and proceed with cookie clearance
        console.error("[Auth] Error revoking session on Supabase:", err);
      }
    }

    const clearOptions = {
      path: "/",
      maxAge: 0,
      sameSite: (isHttps ? "none" : "lax") as "none" | "lax",
      secure: isHttps,
      httpOnly: true,
      ...(isHttps ? { partitioned: true } : {}),
    };

    // Clear all auth cookies with matching attributes
    setCookie("sb-access-token", "", clearOptions);
    setCookie("sb-refresh-token", "", clearOptions);
    deleteCookie("sb-access-token", { path: "/" });
    deleteCookie("sb-refresh-token", { path: "/", httpOnly: true });

    return { success: true };
  },
);

export const validateAdminSession = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }): Promise<SessionInfo> => {
    return {
      authenticated: true,
      userId: context.userId,
      role: "admin",
      email: context.user.email,
    };
  });

export const validateStudentSession = createServerFn({ method: "GET" })
  .middleware([requireStudentAuth])
  .handler(async ({ context }): Promise<SessionInfo> => {
    return {
      authenticated: true,
      userId: context.userId,
      role: "student",
      email: context.user.email,
    };
  });

export const getCurrentUserSession = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SessionInfo> => {
    return {
      authenticated: true,
      userId: context.userId,
      role: context.role,
      email: context.user.email,
    };
  });
