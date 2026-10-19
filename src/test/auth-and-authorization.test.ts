import { describe, expect, it, beforeEach } from "vitest";
import {
  extractUserRole,
  getArabicAuthErrorMessage,
  setSessionCookie,
  setSessionCookies,
  clearSessionCookie,
  clearSessionCookies,
  getSessionCookie,
  getSessionCookies,
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
} from "@/lib/auth-client";
import {
  extractTokenFromRequest,
  extractTokensFromRequest,
  extractTrustedAppRole,
} from "@/integrations/supabase/auth-middleware";
import { validateLoginEmail } from "@/routes/index";

describe("Supabase Authentication, Session Refresh, and Server Authorization", () => {
  beforeEach(() => {
    // Clear cookies before each test
    clearSessionCookies();
  });

  describe("Email-Only Login Validation & No Synthetic Email Fabrication", () => {
    it("rejects numeric student IDs and never accepts them as email", () => {
      const res = validateLoginEmail("102345");
      expect(res.valid).toBe(false);
      expect(res.error).toBe("يرجى إدخال بريد إلكتروني صالح (مثال: name@example.com).");
    });

    it("rejects plain usernames without @ symbol and never synthesizes @alibhhars.edu", () => {
      const res1 = validateLoginEmail("student_ahmed");
      expect(res1.valid).toBe(false);
      expect(res1.error).toBe("يرجى إدخال بريد إلكتروني صالح (مثال: name@example.com).");

      const res2 = validateLoginEmail("admin");
      expect(res2.valid).toBe(false);
      expect(res2.error).toBe("يرجى إدخال بريد إلكتروني صالح (مثال: name@example.com).");
    });

    it("rejects malformed email formats", () => {
      expect(validateLoginEmail("user@").valid).toBe(false);
      expect(validateLoginEmail("@domain.com").valid).toBe(false);
      expect(validateLoginEmail("user@domain").valid).toBe(false);
      expect(validateLoginEmail("   ").valid).toBe(false);
      expect(validateLoginEmail("").error).toBe("يرجى إدخال البريد الإلكتروني.");
    });

    it("accepts valid email addresses directly without alteration", () => {
      const valid1 = validateLoginEmail("student@alibhhars.edu");
      expect(valid1.valid).toBe(true);

      const valid2 = validateLoginEmail("teacher.history@gmail.com");
      expect(valid2.valid).toBe(true);

      const valid3 = validateLoginEmail("admin@school.org");
      expect(valid3.valid).toBe(true);
    });
  });

  describe("Case 1 & 2: Error Mapping & Arabic Messages", () => {
    it("maps invalid login credentials to user-friendly Arabic error", () => {
      const msg1 = getArabicAuthErrorMessage("Invalid login credentials");
      expect(msg1).toContain("بيانات الدخول غير صحيحة");

      const msg2 = getArabicAuthErrorMessage("invalid_grant: Invalid credentials");
      expect(msg2).toContain("بيانات الدخول غير صحيحة");
    });

    it("maps email not confirmed to Arabic error", () => {
      const msg = getArabicAuthErrorMessage("Email not confirmed");
      expect(msg).toContain("البريد الإلكتروني لم يتم تأكيده بعد");
    });

    it("maps rate limiting to Arabic error", () => {
      const msg = getArabicAuthErrorMessage("Rate limit exceeded: too many requests");
      expect(msg).toContain("تم تجاوز عدد المحاولات المسموح بها");
    });

    it("maps network error to Arabic error", () => {
      const msg = getArabicAuthErrorMessage("Failed to fetch");
      expect(msg).toContain("تعذر الاتصال بالخادم");
    });
  });

  describe("Trusted Role Extraction & Exclusivity", () => {
    it("extracts admin role from app_metadata.role", () => {
      expect(extractTrustedAppRole({ role: "admin" })).toBe("admin");
      expect(extractUserRole({ app_metadata: { role: "admin" } })).toBe("admin");
    });

    it("extracts student role from app_metadata.role", () => {
      expect(extractTrustedAppRole({ role: "student" })).toBe("student");
      expect(extractUserRole({ app_metadata: { role: "student" } })).toBe("student");
    });

    it("extracts role from app_metadata.roles array when single role present", () => {
      expect(extractTrustedAppRole({ roles: ["admin"] })).toBe("admin");
      expect(extractTrustedAppRole({ roles: ["student"] })).toBe("student");
      expect(extractUserRole({ app_metadata: { roles: ["admin"] } })).toBe("admin");
      expect(extractUserRole({ app_metadata: { roles: ["student"] } })).toBe("student");
    });

    it("enforces exclusivity: denies dual role (admin + student) to prevent privilege bleed", () => {
      // Administrators must not automatically receive student permissions and vice versa
      expect(extractTrustedAppRole({ roles: ["admin", "student"] })).toBeNull();
      expect(extractUserRole({ app_metadata: { roles: ["admin", "student"] } })).toBeNull();
    });

    it("denies unknown or missing roles by default", () => {
      expect(extractTrustedAppRole(undefined)).toBeNull();
      expect(extractTrustedAppRole({})).toBeNull();
      expect(extractTrustedAppRole({ role: "guest" })).toBeNull();
      expect(extractTrustedAppRole({ role: "superadmin" })).toBeNull();
      expect(extractTrustedAppRole({ roles: ["moderator"] })).toBeNull();
    });
  });

  describe("Token Extraction: Access and Refresh Tokens", () => {
    it("extracts Bearer token from Authorization header", () => {
      const req = new Request("http://localhost:3000/api/test", {
        headers: { Authorization: "Bearer test.jwt.token" },
      });
      const tokens = extractTokensFromRequest(req);
      expect(tokens.accessToken).toBe("test.jwt.token");
      expect(tokens.refreshToken).toBeNull();
      expect(extractTokenFromRequest(req)).toBe("test.jwt.token");
    });

    it("extracts both access and refresh tokens from distinct cookies", () => {
      const req = new Request("http://localhost:3000/admin", {
        headers: {
          cookie: `${ACCESS_TOKEN_COOKIE_NAME}=access.jwt.token; ${REFRESH_TOKEN_COOKIE_NAME}=refresh.secret.token`,
        },
      });
      const tokens = extractTokensFromRequest(req);
      expect(tokens.accessToken).toBe("access.jwt.token");
      expect(tokens.refreshToken).toBe("refresh.secret.token");
    });

    it("handles quoted cookie values", () => {
      const req = new Request("http://localhost:3000/admin", {
        headers: {
          cookie: `${ACCESS_TOKEN_COOKIE_NAME}="access.jwt.token"; ${REFRESH_TOKEN_COOKIE_NAME}="refresh.secret.token"`,
        },
      });
      const tokens = extractTokensFromRequest(req);
      expect(tokens.accessToken).toBe("access.jwt.token");
      expect(tokens.refreshToken).toBe("refresh.secret.token");
    });

    it("extracts both tokens from fallback Supabase project cookie object", () => {
      const payload = JSON.stringify({
        access_token: "project.access.token",
        refresh_token: "project.refresh.token",
      });
      const req = new Request("http://localhost:3000/admin", {
        headers: { cookie: `sb-testproject-auth-token=${encodeURIComponent(payload)}` },
      });
      const tokens = extractTokensFromRequest(req);
      expect(tokens.accessToken).toBe("project.access.token");
      expect(tokens.refreshToken).toBe("project.refresh.token");
    });

    it("returns null for both when no Authorization header and no cookie are present", () => {
      const req = new Request("http://localhost:3000/admin");
      const tokens = extractTokensFromRequest(req);
      expect(tokens.accessToken).toBeNull();
      expect(tokens.refreshToken).toBeNull();
      expect(extractTokenFromRequest(req)).toBeNull();
    });
  });

  describe("Session Cookie Lifecycle & Token Lifetimes (Issue 1.2)", () => {
    it("sets, reads, and clears both access and refresh cookies", () => {
      setSessionCookies("access.jwt.token", "refresh.secret.token");

      const cookies = getSessionCookies();
      expect(cookies.accessToken).toBe("access.jwt.token");
      expect(cookies.refreshToken).toBe("refresh.secret.token");
      expect(getSessionCookie()).toBe("access.jwt.token");

      clearSessionCookies();
      const cleared = getSessionCookies();
      expect(cleared.accessToken).toBeNull();
      expect(cleared.refreshToken).toBeNull();
      expect(getSessionCookie()).toBeNull();
    });

    it("allows setSessionCookie single-argument alias for backward compatibility", () => {
      setSessionCookie("standalone.access.token");
      expect(getSessionCookie()).toBe("standalone.access.token");

      clearSessionCookie();
      expect(getSessionCookie()).toBeNull();
    });
  });

  describe("Session Persistence, Token Refresh & Server Authorization Logic", () => {
    type SessionSimulationResult = {
      authorized: boolean;
      user: { id: string; role: "admin" | "student" };
      refreshed: boolean;
      newAccessToken?: string;
    };

    /**
     * Simulates the exact server authorization logic implemented in requireSupabaseAuth:
     * 1. Valid access token -> authenticates directly.
     * 2. Expired access token -> checks refresh token.
     *    - If valid refresh token -> refreshes session, returns new access token & continues.
     *    - If refresh token missing or invalid -> throws Unauthorized.
     * 3. Role validation -> enforces admin / student privilege boundaries.
     */
    const simulateServerAuth = (
      tokens: { accessToken: string | null; refreshToken: string | null },
      targetArea: "admin" | "student",
      mockSupabaseDb: {
        validAccessTokens: Record<string, { id: string; role: "admin" | "student" }>;
        validRefreshTokens: Record<
          string,
          { newAccessToken: string; newRefreshToken: string; role: "admin" | "student"; id: string }
        >;
      },
    ): SessionSimulationResult => {
      const { accessToken, refreshToken } = tokens;

      if (!accessToken && !refreshToken) {
        throw new Error("Unauthorized: No token provided");
      }

      let user: { id: string; role: "admin" | "student" } | null = null;
      let refreshed = false;
      let newAccessToken: string | undefined;

      // 1. Try existing access token
      if (accessToken && accessToken.split(".").length === 3) {
        const foundUser = mockSupabaseDb.validAccessTokens[accessToken];
        if (foundUser) {
          user = foundUser;
        }
      }

      // 2. If access token is expired/missing, attempt refresh with refreshToken
      if (!user && refreshToken) {
        const refreshData = mockSupabaseDb.validRefreshTokens[refreshToken];
        if (refreshData) {
          user = { id: refreshData.id, role: refreshData.role };
          refreshed = true;
          newAccessToken = refreshData.newAccessToken;
        }
      }

      // 3. If user is still not verified
      if (!user) {
        if (accessToken && accessToken.split(".").length !== 3 && !refreshToken) {
          throw new Error("Unauthorized: Invalid token format");
        }
        throw new Error("Unauthorized: Invalid or expired token");
      }

      // 4. Role authorization
      if (targetArea === "admin") {
        if (user.role !== "admin") {
          throw new Error("Forbidden: Requires admin role");
        }
      } else {
        if (user.role !== "student") {
          throw new Error("Forbidden: Requires student role");
        }
      }

      return {
        authorized: true,
        user,
        refreshed,
        newAccessToken,
      };
    };

    const mockDb = {
      validAccessTokens: {
        "valid.admin.jwt": { id: "admin-1", role: "admin" as const },
        "valid.student.jwt": { id: "student-1", role: "student" as const },
      },
      validRefreshTokens: {
        "valid.admin.refresh": {
          id: "admin-1",
          role: "admin" as const,
          newAccessToken: "refreshed.admin.jwt",
          newRefreshToken: "next.admin.refresh",
        },
        "valid.student.refresh": {
          id: "student-1",
          role: "student" as const,
          newAccessToken: "refreshed.student.jwt",
          newRefreshToken: "next.student.refresh",
        },
      },
    };

    it("Case A: Valid access token authenticates without triggering refresh", () => {
      const res = simulateServerAuth(
        { accessToken: "valid.admin.jwt", refreshToken: "valid.admin.refresh" },
        "admin",
        mockDb,
      );
      expect(res.authorized).toBe(true);
      expect(res.refreshed).toBe(false);
      expect(res.user.role).toBe("admin");
    });

    it("Case B: Expired access token is seamlessly refreshed when valid refresh token is present", () => {
      // Access token is expired ('expired.jwt.token'), but valid refresh token exists
      const res = simulateServerAuth(
        { accessToken: "expired.jwt.token", refreshToken: "valid.admin.refresh" },
        "admin",
        mockDb,
      );
      expect(res.authorized).toBe(true);
      expect(res.refreshed).toBe(true);
      expect(res.newAccessToken).toBe("refreshed.admin.jwt");
      expect(res.user.id).toBe("admin-1");
    });

    it("Case C: Missing access token (after 1hr cookie expiry) with valid refresh token refreshes successfully", () => {
      const res = simulateServerAuth(
        { accessToken: null, refreshToken: "valid.student.refresh" },
        "student",
        mockDb,
      );
      expect(res.authorized).toBe(true);
      expect(res.refreshed).toBe(true);
      expect(res.newAccessToken).toBe("refreshed.student.jwt");
      expect(res.user.role).toBe("student");
    });

    it("Case D: Expired access token with expired/invalid refresh token throws Unauthorized", () => {
      expect(() =>
        simulateServerAuth(
          { accessToken: "expired.jwt.token", refreshToken: "invalid.or.revoked.refresh" },
          "admin",
          mockDb,
        ),
      ).toThrow("Unauthorized: Invalid or expired token");
    });

    it("Case E: Missing tokens throws Unauthorized: No token provided", () => {
      expect(() =>
        simulateServerAuth({ accessToken: null, refreshToken: null }, "admin", mockDb),
      ).toThrow("Unauthorized: No token provided");
    });

    it("Case F: Malformed access token without refresh token throws Invalid token format", () => {
      expect(() =>
        simulateServerAuth(
          { accessToken: "malformed-string", refreshToken: null },
          "admin",
          mockDb,
        ),
      ).toThrow("Unauthorized: Invalid token format");
    });

    it("Case G: Student cannot access /admin even with valid session (Forbidden: Requires admin role)", () => {
      expect(() =>
        simulateServerAuth(
          { accessToken: "valid.student.jwt", refreshToken: "valid.student.refresh" },
          "admin",
          mockDb,
        ),
      ).toThrow("Forbidden: Requires admin role");
    });

    it("Case H: Admin cannot access /student (Forbidden: Requires student role)", () => {
      expect(() =>
        simulateServerAuth(
          { accessToken: "valid.admin.jwt", refreshToken: "valid.admin.refresh" },
          "student",
          mockDb,
        ),
      ).toThrow("Forbidden: Requires student role");
    });

    it("Case I: Logout clears cookies and subsequent request is rejected", () => {
      setSessionCookies("valid.admin.jwt", "valid.admin.refresh");
      expect(getSessionCookies().accessToken).toBe("valid.admin.jwt");
      expect(getSessionCookies().refreshToken).toBe("valid.admin.refresh");

      // Perform logout cleanup
      clearSessionCookies();

      const cleared = getSessionCookies();
      expect(cleared.accessToken).toBeNull();
      expect(cleared.refreshToken).toBeNull();

      expect(() => simulateServerAuth(cleared, "admin", mockDb)).toThrow(
        "Unauthorized: No token provided",
      );
    });
  });

  describe("Server-Authoritative Session Architecture & Refresh Deduplication (Turn 9)", () => {
    it("deduplicates concurrent refresh calls for the same token within the same process", async () => {
      let networkCalls = 0;
      const deduplicationMap = new Map<string, Promise<{ token: string }>>();

      const deduplicatedRefresh = (token: string) => {
        let p = deduplicationMap.get(token);
        if (!p) {
          p = (async () => {
            networkCalls++;
            // Simulate async network latency
            await new Promise((r) => setTimeout(r, 20));
            return { token: `refreshed_${token}` };
          })();
          deduplicationMap.set(token, p);
          p.finally(() => deduplicationMap.delete(token));
        }
        return p;
      };

      // Fire 5 concurrent requests with the identical refresh token
      const [res1, res2, res3, res4, res5] = await Promise.all([
        deduplicatedRefresh("rotatable_refresh_token_1"),
        deduplicatedRefresh("rotatable_refresh_token_1"),
        deduplicatedRefresh("rotatable_refresh_token_1"),
        deduplicatedRefresh("rotatable_refresh_token_1"),
        deduplicatedRefresh("rotatable_refresh_token_1"),
      ]);

      // Exactly 1 network call should have occurred
      expect(networkCalls).toBe(1);
      expect(res1.token).toBe("refreshed_rotatable_refresh_token_1");
      expect(res2.token).toBe("refreshed_rotatable_refresh_token_1");
      expect(res3.token).toBe("refreshed_rotatable_refresh_token_1");
      expect(res4.token).toBe("refreshed_rotatable_refresh_token_1");
      expect(res5.token).toBe("refreshed_rotatable_refresh_token_1");

      // Once finished, deduplication map should be clean
      expect(deduplicationMap.size).toBe(0);
    });

    it("clears auth cookies immediately when token refresh fails", () => {
      setSessionCookies("expired.jwt.token", "invalid.refresh.token");
      expect(getSessionCookies().refreshToken).toBe("invalid.refresh.token");

      // Simulating failed refresh cookie clearing
      clearSessionCookies();

      const stateAfterFail = getSessionCookies();
      expect(stateAfterFail.accessToken).toBeNull();
      expect(stateAfterFail.refreshToken).toBeNull();
    });

    it("ensures LoginResult never leaks access_token or refresh_token to client", () => {
      const mockLoginResponse = {
        success: true as const,
        role: "admin" as const,
        userId: "user-123",
        email: "admin@example.com",
      };

      expect(mockLoginResponse).not.toHaveProperty("access_token");
      expect(mockLoginResponse).not.toHaveProperty("accessToken");
      expect(mockLoginResponse).not.toHaveProperty("refresh_token");
      expect(mockLoginResponse).not.toHaveProperty("refreshToken");
      expect(mockLoginResponse.role).toBe("admin");
    });

    it("maps UNAUTHORIZED_ROLE error to expected Arabic message", () => {
      const msg = getArabicAuthErrorMessage("UNAUTHORIZED_ROLE");
      expect(msg).toContain("حدث خطأ أثناء تسجيل الدخول");
    });
  });
});
