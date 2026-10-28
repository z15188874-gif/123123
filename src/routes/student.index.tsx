/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  Award,
  Calendar,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  GraduationCap,
  Megaphone,
  PlayCircle,
  Sparkles,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { ProfilesSection } from "@/components/DeveloperCard";
import { getStudentResultsFn, getWeeklyHonorBoardFn } from "@/lib/admin-server";
import { validateStudentSession } from "@/lib/auth-server";

export const Route = createFileRoute("/student/")({
  head: () => ({
    meta: [
      { title: "لوحة الطالب | منصة الإبحار" },
      { name: "description", content: "الوصول إلى المحاضرات المصوّرة والتدريبات في مادة التاريخ." },
      { property: "og:title", content: "لوحة الطالب | منصة الإبحار" },
      { property: "og:description", content: "محاضرات وتدريبات التاريخ في مكان واحد." },
    ],
  }),
  loader: async ({ context }) => {
    try {
      const [honorBoard, studentResults, session] = await Promise.all([
        getWeeklyHonorBoardFn().catch(() => []),
        getStudentResultsFn().catch(() => []),
        (context as any)?.session ?? validateStudentSession().catch(() => null),
      ]);
      return { honorBoard, studentResults, session };
    } catch {
      return { honorBoard: [], studentResults: [], session: null };
    }
  },
  component: StudentHome,
});

function StudentHome() {
  const { studentResults = [], session } = Route.useLoaderData();
  const studentName = session?.fullName || "طالبنا العزيز";
  const studentGrade = session?.grade || "الصف الثاني الثانوي";

  useEffect(() => {
    if (studentName && typeof window !== "undefined") {
      const greetedKey = `greeted_session_${session?.userId || "student"}`;
      if (!sessionStorage.getItem(greetedKey)) {
        sessionStorage.setItem(greetedKey, "1");
        toast.success(`مرحبًا بك يا ${studentName}! نتمنى لك تجربة ممتعة وتفوقًا دائمًا.`);
      }
    }
  }, [session?.userId, studentName]);

  const cards = [
    {
      to: "/student/lectures",
      icon: PlayCircle,
      title: "المحاضرات المصوّرة",
      text: "شاهد شروح الدروس مرتبةً حسب الوحدات والفصول.",
    },
    {
      to: "/student/quizzes",
      icon: ClipboardList,
      title: "التدريبات والاختبارات",
      text: "اختبر فهمك بأسئلة متنوعة وتابع نتائجك فورياً.",
    },
    {
      to: "/student/results",
      icon: Award,
      title: "سجل نتائج اختباراتي",
      text: "استعرض درجاتك السابقة المحفوظة بشكل دائم ومستمر.",
    },
    {
      to: "/student/posts",
      icon: Megaphone,
      title: "منشورات المنصة والاستطلاعات",
      text: "تابع أحدث الإعلانات، شارك في استطلاعات الرأي، وقيم المنصة.",
    },
    {
      to: "/student/leaderboard",
      icon: Trophy,
      title: "لوحة الشرف الأسبوعية",
      text: "تابع قائمة الطلاب الأوائل والمتفوقين على المنصة هذا الأسبوع.",
    },
  ] as const;

  const getScoreColor = (percentage: number) => {
    if (percentage >= 85)
      return "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800";
    if (percentage >= 70)
      return "text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800";
    if (percentage >= 50)
      return "text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800";
    return "text-red-600 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800";
  };

  return (
    <>
      {/* Welcome Banner */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-card to-background p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-gold shadow-md">
              <Sparkles className="size-6" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-primary">
                مرحبًا، {studentName} 👋
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                أهلًا بك في لوحة تحكم الطالب - نتمنى لك رحلة موفقة وتفوقًا دائمًا في مادة التاريخ!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/15 px-3.5 py-1.5 text-xs font-bold text-primary">
              <GraduationCap className="size-4 text-gold" />
              {studentGrade}
            </span>
          </div>
        </div>
      </div>

      <PageHeader
        title={`لوحة الطالب | مرحبًا ${studentName}`}
        desc="اختر القسم الذي تريد البدء به لمتابعة دروسك واختباراتك."
      />

      {/* Quick Navigation Cards */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="group rounded-2xl border bg-card p-6 shadow-card transition hover:-translate-y-1 hover:border-gold"
          >
            <span className="grid size-12 place-items-center rounded-xl bg-primary text-gold">
              <c.icon className="size-6" />
            </span>
            <h2 className="mt-4 text-xl font-bold text-primary">{c.title}</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{c.text}</p>
            <span className="mt-4 inline-block text-sm font-bold text-primary group-hover:text-accent-foreground">
              الدخول إلى القسم ←
            </span>
          </Link>
        ))}
      </div>

      {/* Dedicated Section: Permanent Student Results */}
      <section id="my-results" className="mt-12 rounded-2xl border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-primary text-gold">
              <Award className="size-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-primary">سجل نتائج اختباراتي المنجزة</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5" />
                  محفوظ دائمًا
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                نتائجك موثقة ومحفوظة في حسابك حتى لو تم حذف الاختبار من قبل إدارة المنصة لاحقاً.
              </p>
            </div>
          </div>
          <Link
            to="/student/results"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary/10 px-4 py-2 text-xs font-bold text-primary transition hover:bg-primary/20"
          >
            عرض السجل الكامل والتفاصيل ←
          </Link>
        </div>

        {studentResults.length === 0 ? (
          <div className="py-8 text-center">
            <FileCheck2 className="mx-auto size-10 text-muted-foreground/60" />
            <p className="mt-3 text-sm font-medium text-foreground">
              لم تقم بإجراء أي اختبارات حتى الآن
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              عند إتمامك لأي تدريب أو امتحان، ستظهر نتيجتك ونسبتك هنا بشكل دائم.
            </p>
            <Link
              to="/student/quizzes"
              className="mt-4 inline-block rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow transition hover:opacity-90"
            >
              الانتقال إلى التدريبات الآن
            </Link>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {studentResults.slice(0, 6).map((res: any, idx: number) => {
                const formattedDate = res.submittedAt
                  ? new Date(res.submittedAt).toLocaleDateString("ar-EG", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "سابقاً";

                return (
                  <div
                    key={res.id || idx}
                    className="flex flex-col justify-between rounded-xl border bg-background/60 p-4 transition hover:border-gold/60"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-2 text-sm font-bold text-foreground">
                          {res.quizTitle}
                        </h3>
                        <span
                          className={`shrink-0 rounded-lg border px-2 py-0.5 text-xs font-black ${getScoreColor(
                            res.percentage,
                          )}`}
                        >
                          {res.percentage}%
                        </span>
                      </div>
                      {res.isExamDeleted && (
                        <p className="mt-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                          (مؤرشف - الامتحان الأصلي حُذف والنتيجة محفوظة)
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                      <span className="font-bold text-primary">
                        الدرجة: {res.score} / {res.totalPoints}
                      </span>
                      <span className="flex items-center gap-1 text-[11px]">
                        <Calendar className="size-3" />
                        {formattedDate}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {studentResults.length > 6 && (
              <div className="pt-2 text-center">
                <Link
                  to="/student/results"
                  className="text-xs font-bold text-primary hover:underline"
                >
                  عرض جميع الاختبارات ({studentResults.length}) ←
                </Link>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="mt-8">
        <ProfilesSection />
      </div>
    </>
  );
}
