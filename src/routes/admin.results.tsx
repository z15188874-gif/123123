/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { adminHead } from "@/components/AdminPage";
import { getResultsFn } from "@/lib/admin-server";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/admin/results")({
  head: adminHead("نتائج الطلاب", "متابعة درجات ومحاولات الطلاب في التدريبات والاختبارات."),
  loader: async () => {
    try {
      return await getResultsFn();
    } catch {
      return [];
    }
  },
  component: AdminResults,
});

function AdminResults() {
  const initialData = Route.useLoaderData();
  const { data: results = [], isLoading } = useQuery({
    queryKey: ["admin-results"],
    queryFn: () => getResultsFn(),
    initialData,
  });

  return (
    <>
      <PageHeader
        title="نتائج الطلاب"
        desc="متابعة تفصيلية لنتائج المحاولات والاختبارات التي اجتازها الطلاب."
      />

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center shadow-card">
          <BarChart3 className="mx-auto size-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-bold text-primary">لا توجد نتائج مسجّلة بعد</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            ستظهر درجات الطلاب ومحاولاتهم هنا فور إتمامهم للاختبارات والتدريبات المنشورة.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card shadow-card">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b bg-secondary/50 text-xs font-semibold text-muted-foreground">
                <th className="p-4">اسم الطالب</th>
                <th className="p-4">الصف الدراسي</th>
                <th className="p-4">عنوان التدريب / الاختبار</th>
                <th className="p-4">النتيجة</th>
                <th className="p-4">تاريخ التسليم</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {results.map((res: any) => {
                const percentage =
                  res.total_points > 0 ? Math.round((res.score / res.total_points) * 100) : 0;
                return (
                  <tr key={res.id} className="hover:bg-secondary/20 transition">
                    <td className="p-4 font-bold text-foreground">
                      {res.student?.full_name || "طالب محذوف"}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {res.student?.grade || "غير محدد"}
                    </td>
                    <td className="p-4 font-medium text-foreground">
                      {res.quiz?.title || "اختبار"}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 font-bold text-primary">
                        {res.score} / {res.total_points} ({percentage}%)
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {new Date(res.submitted_at).toLocaleString("ar-EG")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
