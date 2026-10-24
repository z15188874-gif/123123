/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { Trophy, Award, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { getWeeklyHonorBoardFn } from "@/lib/admin-server";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/student/leaderboard")({
  head: () => ({
    meta: [
      { title: "لوحة الشرف الأسبوعية | منصة الإبحار" },
      { name: "description", content: "قائمة الطلاب الأوائل والمتفوقين على المنصة هذا الأسبوع." },
      { property: "og:title", content: "لوحة الشرف الأسبوعية | منصة الإبحار" },
      { property: "og:description", content: "تابع قائمة المتفوقين والطلاب الأوائل في التدريبات." },
    ],
  }),
  loader: async () => {
    try {
      return await getWeeklyHonorBoardFn();
    } catch {
      return [];
    }
  },
  component: StudentLeaderboard,
});

function StudentLeaderboard() {
  const initialData = Route.useLoaderData();
  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ["weekly-honor-board"],
    queryFn: () => getWeeklyHonorBoardFn(),
    initialData,
  });

  return (
    <>
      <PageHeader
        title="لوحة الشرف الأسبوعية"
        desc="نخبة طلاب منصة الإبحار المتفوقين في التدريبات والاختبارات."
      />

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center shadow-card">
          <Trophy className="mx-auto size-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-bold text-primary">لم تُسجل أي نتائج بعد هذا الأسبوع</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            قم بحل التدريبات والاختبارات لتظهر في لوحة الشرف الأسبوعية!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-6 shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b text-sm text-muted-foreground">
                    <th className="pb-3 pr-4 font-semibold">المركز</th>
                    <th className="pb-3 pr-4 font-semibold">اسم الطالب</th>
                    <th className="pb-3 pr-4 font-semibold">عدد الاختبارات</th>
                    <th className="pb-3 pr-4 font-semibold">مجموع الدرجات</th>
                    <th className="pb-3 pr-4 font-semibold">النسبة المئوية</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {leaderboard.map((item, index) => {
                    const rank = index + 1;
                    return (
                      <tr key={index} className="hover:bg-secondary/20 transition-colors">
                        <td className="py-4 pr-4 font-bold">
                          {rank === 1 ? (
                            <span className="inline-flex items-center gap-1.5 text-gold font-black">
                              <Trophy className="size-5 text-gold" /> الأول
                            </span>
                          ) : rank === 2 ? (
                            <span className="inline-flex items-center gap-1.5 text-foreground font-bold">
                              <Award className="size-5 text-muted-foreground" /> الثاني
                            </span>
                          ) : rank === 3 ? (
                            <span className="inline-flex items-center gap-1.5 text-amber-600 font-bold">
                              <Award className="size-5 text-amber-600" /> الثالث
                            </span>
                          ) : (
                            <span className="text-muted-foreground font-semibold">#{rank}</span>
                          )}
                        </td>
                        <td className="py-4 pr-4 font-bold text-primary">{item.name}</td>
                        <td className="py-4 pr-4 text-sm text-muted-foreground">
                          {item.count} اختبارات
                        </td>
                        <td className="py-4 pr-4 font-semibold text-foreground">
                          {item.totalScore} / {item.maxPossible}
                        </td>
                        <td className="py-4 pr-4">
                          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-sm">
                            {item.percentage}%
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
