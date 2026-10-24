import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { KeyRound, Loader2, Mail, MessageCircle } from "lucide-react";
import { getArabicAuthErrorMessage, setSessionCookies } from "@/lib/auth-client";
import { loginServerFn } from "@/lib/auth-server";
import { supabase } from "@/integrations/supabase/client";
import { ProfilesSection } from "@/components/DeveloperCard";

export function validateLoginEmail(input: string): { valid: boolean; error?: string } {
  const cleanEmail = input.trim();
  if (!cleanEmail) {
    return { valid: false, error: "يرجى إدخال البريد الإلكتروني." };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return {
      valid: false,
      error: "يرجى إدخال بريد إلكتروني صالح (مثال: name@example.com).",
    };
  }
  return { valid: true };
}

type LoginSearchParams = {
  error?: string;
};

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): LoginSearchParams => ({
    error: typeof search["error"] === "string" ? search["error"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "تسجيل الدخول | منصة الأستاذ سعيد مطر" },
      {
        name: "description",
        content: "سجّل دخولك إلى منصة الأستاذ سعيد مطر لتعلّم التاريخ.",
      },
      { property: "og:title", content: "تسجيل الدخول | منصة الأستاذ سعيد مطر" },
      { property: "og:description", content: "منصة تعليمية متخصصة في مادة التاريخ." },
    ],
  }),
  component: Login,
});

const WHATSAPP =
  "https://wa.me/201126719478?text=" +
  encodeURIComponent(
    "السلام عليكم ورحمة الله وبركاته،\nبسم الله الرحمن الرحيم،\nأسعد الله أوقاتكم بكل خير يا رب.\n\nأود طلب إنشاء حساب جديد على منصة الأستاذ سعيد مطر (منصة الإبحار التعليمية) لكي أتمكن من متابعة الدروس والمحاضرات والتدريبات.\n\nجزاكم الله خيراً وجعله في ميزان حسناتكم، وفي انتظار تفعيل حسابي بارك الله فيكم.",
  );

function Login() {
  const router = useRouter();
  const search = Route.useSearch();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const getNoticeFromUrl = (): string | null => {
    if (search.error === "unauthorized_admin") {
      return "عذرًا، الوصول إلى لوحة الإدارة يتطلب تسجيل الدخول بحساب مسؤول (Admin).";
    }
    if (search.error === "unauthorized_student") {
      return "عذرًا، الوصول إلى لوحة الطالب يتطلب تسجيل الدخول بحساب طالب (Student).";
    }
    if (search.error === "unauthenticated") {
      return "يرجى تسجيل الدخول أولاً للوصول إلى الصفحة المطلوبة.";
    }
    return null;
  };

  const urlNotice = getNoticeFromUrl();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const validation = validateLoginEmail(email);
    if (!validation.valid) {
      setErrorMessage(validation.error ?? "يرجى إدخال بريد إلكتروني صالح.");
      return;
    }

    if (!password) {
      setErrorMessage("يرجى إدخال كلمة المرور.");
      return;
    }

    setLoading(true);

    try {
      const result = await loginServerFn({
        data: {
          email: email.trim(),
          password,
        },
      });

      setSessionCookies(result.accessToken, result.refreshToken);
      await supabase.auth.setSession({
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
      });

      if (result.role === "admin") {
        setSuccessMessage("تم تسجيل الدخول بنجاح! جاري التوجيه إلى لوحة الإدارة...");
        await router.invalidate();
        window.location.assign("/admin");
      } else if (result.role === "student") {
        setSuccessMessage("تم تسجيل الدخول بنجاح! جاري التوجيه إلى لوحة الطالب...");
        await router.invalidate();
        window.location.assign("/student");
      } else {
        setErrorMessage(
          "حسابك غير مزود بصلاحية معتمدة (طالب أو مسؤول). يرجى مراجعة إدارة المنصة لاعتماد الصلاحيات.",
        );
        setLoading(false);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
      if (msg.includes("UNAUTHORIZED_ROLE")) {
        setErrorMessage(
          "حسابك غير مزود بصلاحية معتمدة (طالب أو مسؤول). يرجى مراجعة إدارة المنصة لاعتماد الصلاحيات.",
        );
      } else {
        setErrorMessage(getArabicAuthErrorMessage(msg));
      }
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <section className="relative flex flex-col justify-between p-8 text-white sm:p-12 bg-slate-900 overflow-hidden lg:rounded-l-[3rem] lg:my-6 lg:mr-6 shadow-2xl border border-gold/30">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-85 pointer-events-none mix-blend-normal scale-105 transition duration-700 hover:scale-100"
          style={{ backgroundImage: `url('/assets/aistudio/1792226093974_15388eac.jpg')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/50 to-slate-950/20 pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <img
            src="/assets/aistudio/1792226093974_15388eac.jpg"
            alt="شعار المنصة"
            className="size-12 rounded-full object-cover border-2 border-gold shadow-lg"
          />
          <span className="text-sm tracking-wide text-gold font-semibold drop-shadow">
            منصة الأستاذ سعيد مطر
          </span>
        </div>
        <div className="relative z-10 my-10">
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl text-white drop-shadow-md">
            منصة <span className="text-gold">الأستاذ سعيد مطر</span>
          </h1>
          <p className="mt-4 max-w-md text-lg leading-8 text-white/95 drop-shadow">
            رحلتك في أعماق التاريخ تبدأ هنا؛ محاضرات مصوّرة وتدريبات منظّمة تصنع فهمًا لا يُنسى.
          </p>
          <div className="mt-8 border-r-2 border-gold pr-4 bg-white/5 backdrop-blur-xs p-3 rounded-l-xl">
            <p className="text-xs text-gold/90 font-medium drop-shadow">المحاضر</p>
            <p className="font-display text-xl text-white drop-shadow mt-0.5">
              أ. سعيد سيد عبد الفتاح مطر
            </p>
          </div>
        </div>
        <p className="relative z-10 text-sm font-display text-gold font-bold drop-shadow bg-slate-900/80 backdrop-blur-sm p-3 rounded-xl border border-gold/30">
          تصميم وتطوير م. زياد علي محمد محمد خزيم (القائد)
        </p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm space-y-1.5">
          <h2 className="text-3xl font-extrabold text-amber-200 drop-shadow-sm tracking-tight">
            تسجيل الدخول
          </h2>
          <p className="text-sm font-medium text-slate-200">
            أدخل بيانات الحساب التي حصلت عليها من إدارة المنصة.
          </p>

          {urlNotice && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
            >
              {urlNotice}
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
            >
              {successMessage}
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <Field
              icon={Mail}
              label="البريد الإلكتروني"
              id="email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            <Field
              icon={KeyRound}
              label="كلمة المرور"
              id="pwd"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              {loading ? "جاري التحقق والدخول..." : "دخول"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            ليس لديك حساب؟
            <span className="h-px flex-1 bg-border" />
          </div>
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-whatsapp py-3 font-bold text-primary-foreground transition hover:opacity-90"
          >
            <MessageCircle className="size-5" /> اطلب حسابك عبر واتساب
          </a>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            الحسابات تُنشأ وتُفعّل من قِبل الإدارة فقط.
          </p>

          <div className="mt-6">
            <ProfilesSection />
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  id,
  value,
  onChange,
  disabled,
  ...rest
}: {
  icon: typeof Mail;
  label: string;
  id: string;
  type: string;
  placeholder: string;
  autoComplete?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-bold text-amber-200 drop-shadow-sm tracking-wide"
      >
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-primary" />
        <input
          id={id}
          required
          value={value}
          onChange={onChange}
          disabled={disabled}
          {...rest}
          className="w-full rounded-xl border border-gold/40 bg-card/90 py-3.5 pl-4 pr-11 text-sm text-foreground outline-none transition duration-200 focus:border-gold focus:ring-2 focus:ring-gold/30 disabled:opacity-50 shadow-sm"
        />
      </div>
    </div>
  );
}
