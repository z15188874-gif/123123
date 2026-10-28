/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Award,
  Calendar,
  CheckCircle2,
  FileCheck2,
  GraduationCap,
  History,
  Layers,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { getStudentResultsFn } from "@/lib/admin-server";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/student/results")({
  head: () => ({
    meta: [
      { title: "سجل نتائج اختباراتي | منصة الإبحار" },
      {
        name: "description",
        content: "سجل دائم لنتائج ودرجات الطالب في جميع التدريبات والاختبارات المنجزة.",
      },
      { property: "og:title", content: "سجل نتائج اختباراتي | منصة الإبحار" },
      {
        property: "og:description",
        content: "تابع درجاتك وتقييماتك في التاريخ مع حفظ دائم حتى بعد أرشفة الامتحانات.",
      },
    ],
  }),
  loader: async () => {
    try {
      return await getStudentResultsFn();
    } catch {
      return [];
    }
  },
  component: StudentResultsPage,
});

function StudentResultsPage() {
  const initialData = Route.useLoaderData();
  const { data: results = [], isLoading } = useQuery({
    queryKey: ["student-results"],
    queryFn: () => getStudentResultsFn(),
    initialData,
  });

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "excellent" | "passed">("all");

  const filteredResults = useMemo(() => {
    return results.filter((item: any) => {
      const matchSearch = item.quizTitle.toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;
      if (filter === "excellent") return item.percentage >= 85;
      if (filter === "passed") return item.percentage >= 50;
      return true;
    });
  }, [results, search, filter]);

  // Statistics calculation
  const stats = useMemo(() => {
    if (results.length === 0) {
      return { total: 0, avgPercentage: 0, highestScore: 0, excellentCount: 0 };
    }
    const total = results.length;
    const sumPercentage = results.reduce((acc: number, cur: any) => acc + (cur.percentage || 0), 0);
    const avgPercentage = Math.round(sumPercentage / total);
    const highestScore = Math.max(...results.map((r: any) => r.percentage || 0));
    const excellentCount = results.filter((r: any) => (r.percentage || 0) >= 85).length;
    return { total, avgPercentage, highestScore, excellentCount };
  }, [results]);

  const getScoreColor = (percentage: number) => {
    if (percentage >= 85)
      return "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800";
    if (percentage >= 70)
      return "text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800";
    if (percentage >= 50)
      return "text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800";
    return "text-red-600 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800";
  };

  const getBadgeText = (percentage: number) => {
    if (percentage >= 95) return "ممتاز مع مرتبة الشرف 🌟";
    if (percentage >= 85) return "ممتاز 🏆";
    if (percentage >= 75) return "جيد جداً ⭐";
    if (percentage >= 65) return "جيد 👍";
    if (percentage >= 50) return "ناجح ✔️";
    return "يحتاج مراجعة ⚠️";
  };

  return (
    <>
      <PageHeader
        title="سجل نتائج اختباراتي"
        desc="سجلك الأكاديمي الدائم: جميع درجاتك ونسبتك المئوية محفوظة هنا ولا تُحذف حتى بعد حذف الامتحان من قبل الإدارة."
      />

      {/* Guarantee Banner */}
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-gold">
            <CheckCircle2 className="size-5" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-primary">سجل إلكتروني دائم وموثق</h2>
            <p className="text-xs text-muted-foreground">
              يتم حفظ عنوان الاختبار وتاريخ المحاولة ودرجاتك الكاملة بشكل مستقل ودائم في قاعدة
              البيانات.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/15 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5 text-gold" />
            حفظ تلقائي مدى الحياة
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">الاختبارات المنجزة</span>
            <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <FileCheck2 className="size-5" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-primary">{stats.total}</p>
          <p className="mt-1 text-xs text-muted-foreground">امتحان وتدريب مكتمل</p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">متوسط النسبة المئوية</span>
            <span className="grid size-9 place-items-center rounded-lg bg-blue-500/10 text-blue-600">
              <TrendingUp className="size-5" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-primary">{stats.avgPercentage}%</p>
          <p className="mt-1 text-xs text-muted-foreground">المعدل العام لأدائك</p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">أعلى نتيجة محققة</span>
            <span className="grid size-9 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <Award className="size-5" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-primary">{stats.highestScore}%</p>
          <p className="mt-1 text-xs text-muted-foreground">أفضل إنجاز حتى الآن</p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">الاختبارات الممتازة</span>
            <span className="grid size-9 place-items-center rounded-lg bg-gold/20 text-gold-foreground">
              <GraduationCap className="size-5" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-primary">{stats.excellentCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">بنسبة 85% أو أكثر</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم الامتحان أو التدريب..."
            className="w-full rounded-xl border bg-background py-2.5 pl-4 pr-10 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              filter === "all"
                ? "bg-primary text-primary-foreground shadow"
                : "border bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            الكل ({results.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("excellent")}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              filter === "excellent"
                ? "bg-primary text-primary-foreground shadow"
                : "border bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            الممتاز فقط ({stats.excellentCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("passed")}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              filter === "passed"
                ? "bg-primary text-primary-foreground shadow"
                : "border bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            الناجح (50%+)
          </button>
        </div>
      </div>

      {/* Results List */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center shadow-card">
          <History className="mx-auto size-12 text-muted-foreground/60" />
          <h2 className="mt-4 text-xl font-bold text-primary">لا توجد نتائج اختبارات مسجلة بعد</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            لم تقم بحل أي اختبار حتى الآن. انتقل لقسم الاختبارات وابدأ أول تجربة لك!
          </p>
          <Link
            to="/student/quizzes"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow transition hover:opacity-90"
          >
            <Layers className="size-4" /> الانتقال إلى التدريبات والاختبارات
          </Link>
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center shadow-card">
          <p className="text-base font-semibold text-muted-foreground">
            لا توجد اختبارات تطابق بحثك
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setFilter("all");
            }}
            className="mt-3 text-sm font-bold text-primary hover:underline"
          >
            إعادة تعيين الفلاتر
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                    <th className="py-3.5 px-4 font-semibold">#</th>
                    <th className="py-3.5 px-4 font-semibold">اسم الاختبار / التدريب</th>
                    <th className="py-3.5 px-4 font-semibold">الدرجة المحققة</th>
                    <th className="py-3.5 px-4 font-semibold">النسبة المئوية والتقدير</th>
                    <th className="py-3.5 px-4 font-semibold">تاريخ التسليم</th>
                    <th className="py-3.5 px-4 font-semibold">حالة السجل</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {filteredResults.map((res: any, idx: number) => {
                    const formattedDate = res.submittedAt
                      ? new Date(res.submittedAt).toLocaleDateString("ar-EG", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "مسجل سابقاً";

                    return (
                      <tr key={res.id || idx} className="transition hover:bg-muted/20">
                        <td className="py-4 px-4 font-bold text-muted-foreground">{idx + 1}</td>
                        <td className="py-4 px-4">
                          <div className="font-bold text-foreground">{res.quizTitle}</div>
                          {res.isExamDeleted ? (
                            <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                              (تم أرشفة الاختبار الأصلي من الإدارة - النتيجة مثبتة بالسجل)
                            </span>
                          ) : (
                            <span className="mt-0.5 text-xs text-muted-foreground">
                              اختبار معتمد
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 font-extrabold text-foreground">
                          <span className="text-base text-primary">{res.score}</span>
                          <span className="text-xs text-muted-foreground">
                            {" "}
                            / {res.totalPoints}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-block rounded-lg border px-2.5 py-1 text-xs font-bold ${getScoreColor(
                                res.percentage,
                              )}`}
                            >
                              {res.percentage}%
                            </span>
                            <span className="text-xs font-medium text-muted-foreground">
                              {getBadgeText(res.percentage)}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="size-3.5" />
                            {formattedDate}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="size-3.5" />
                            محفوظ دائمًا
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
