import { supabase } from "@/integrations/supabase/client";
import { logoutServerFn } from "./auth-server";

export const ACCESS_TOKEN_COOKIE_NAME = "sb-access-token";
export const REFRESH_TOKEN_COOKIE_NAME = "sb-refresh-token";
export const SESSION_COOKIE_NAME = ACCESS_TOKEN_COOKIE_NAME;

export function setSessionCookies(
  accessToken: string,
  refreshToken?: string | null,
  accessMaxAge = 3600, // 1 hour for access token
  refreshMaxAge = 60 * 60 * 24 * 7, // 7 days for refresh token
): void {
  if (typeof document === "undefined") return;
  const isHttps = typeof location !== "undefined" && location.protocol === "https:";
  const secureFlag = isHttps ? "; Secure; SameSite=Lax" : "; SameSite=Lax";
  document.cookie = `${ACCESS_TOKEN_COOKIE_NAME}=${encodeURIComponent(accessToken)}; path=/; max-age=${accessMaxAge}${secureFlag}`;
  if (refreshToken) {
    document.cookie = `${REFRESH_TOKEN_COOKIE_NAME}=${encodeURIComponent(refreshToken)}; path=/; max-age=${refreshMaxAge}${secureFlag}`;
  }
}

export function setSessionCookie(token: string, maxAge = 3600): void {
  setSessionCookies(token, null, maxAge);
}

export function clearSessionCookies(): void {
  if (typeof document === "undefined") return;
  const isHttps = typeof location !== "undefined" && location.protocol === "https:";
  const secureFlag = isHttps ? "; Secure; SameSite=Lax" : "; SameSite=Lax";

  document.cookie = `${ACCESS_TOKEN_COOKIE_NAME}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT${secureFlag}`;
  document.cookie = `${ACCESS_TOKEN_COOKIE_NAME}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  document.cookie = `${ACCESS_TOKEN_COOKIE_NAME}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; SameSite=None`;

  document.cookie = `${REFRESH_TOKEN_COOKIE_NAME}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT${secureFlag}`;
  document.cookie = `${REFRESH_TOKEN_COOKIE_NAME}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  document.cookie = `${REFRESH_TOKEN_COOKIE_NAME}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; SameSite=None`;
}

export function clearSessionCookie(): void {
  clearSessionCookies();
}

export function getSessionCookies(): { accessToken: string | null; refreshToken: string | null } {
  if (typeof document === "undefined") return { accessToken: null, refreshToken: null };
  const accessMatch = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${ACCESS_TOKEN_COOKIE_NAME}=([^;]+)`),
  );
  const refreshMatch = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${REFRESH_TOKEN_COOKIE_NAME}=([^;]+)`),
  );
  return {
    accessToken: accessMatch && accessMatch[1] ? decodeURIComponent(accessMatch[1]) : null,
    refreshToken: refreshMatch && refreshMatch[1] ? decodeURIComponent(refreshMatch[1]) : null,
  };
}

export function getSessionCookie(): string | null {
  return getSessionCookies().accessToken;
}

export function extractUserRole(
  user: { app_metadata?: Record<string, unknown> } | null | undefined,
): "admin" | "student" | null {
  if (!user || !user.app_metadata) return null;
  const directRole = user.app_metadata["role"];
  if (directRole === "admin") return "admin";
  if (directRole === "student") return "student";

  const roles = user.app_metadata["roles"];
  if (Array.isArray(roles)) {
    const hasAdmin = roles.includes("admin");
    const hasStudent = roles.includes("student");
    if (hasAdmin && !hasStudent) return "admin";
    if (hasStudent && !hasAdmin) return "student";
  }
  return null;
}

export function getArabicAuthErrorMessage(errorMsg: string): string {
  const lower = errorMsg.toLowerCase();
  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid_grant") ||
    lower.includes("invalid credentials")
  ) {
    return "بيانات الدخول غير صحيحة، يرجى التأكد من البريد الإلكتروني وكلمة المرور.";
  }
  if (lower.includes("email not confirmed")) {
    return "البريد الإلكتروني لم يتم تأكيده بعد، يرجى مراجعة بريدك الإلكتروني.";
  }
  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "تم تجاوز عدد المحاولات المسموح بها، يرجى الانتظار دقيقة والمحاولة مجددًا.";
  }
  if (lower.includes("user not found")) {
    return "لا يوجد حساب مسجل بهذا البريد، يرجى التواصل مع الإدارة لطلب حساب.";
  }
  if (lower.includes("password should be at least")) {
    return "كلمة المرور يجب أن تتكون من 6 أحرف على الأقل.";
  }
  if (lower.includes("network") || lower.includes("failed to fetch")) {
    return "تعذر الاتصال بالخادم، يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.";
  }
  return "حدث خطأ أثناء تسجيل الدخول: " + errorMsg;
}

export async function logout(): Promise<void> {
  try {
    await logoutServerFn();
  } catch (error) {
    console.error("Error signing out from server:", error);
  }
  clearSessionCookie();
  try {
    await supabase.auth.signOut();
  } catch {
    // Ignore client sign out errors
  }
  if (typeof window !== "undefined") {
    window.location.href = "/";
  }
}
