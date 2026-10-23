/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Loader2, FileText, CheckCircle, Clock } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { adminHead } from "@/components/AdminPage";
import { getResultsFn, updateQuizAttemptScoreFn } from "@/lib/admin-server";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/results")({
  head: adminHead(
    "نتائج الطلاب",
    "متابعة درجات ومحاولات الطلاب في التدريبات والاختبارات وتصحيح الأسئلة المقالية.",
  ),
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
  const queryClient = useQueryClient();
  const initialData = Route.useLoaderData();
  const { data: results = [], isLoading } = useQuery({
    queryKey: ["admin-results"],
    queryFn: () => getResultsFn(),
    initialData,
  });

  const [selectedAttempt, setSelectedAttempt] = useState<any | null>(null);
  const [newScore, setNewScore] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (vars: { attemptId: string; newScore: number; graded: boolean }) =>
      updateQuizAttemptScoreFn({ data: vars }),
    onSuccess: () => {
      toast.success("تم تحديث واعتماد درجة الطالب بنجاح");
      queryClient.invalidateQueries({ queryKey: ["admin-results"] });
      setSelectedAttempt(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "حدث خطأ أثناء تحديث الدرجة");
    },
    onSettled: () => {
      setIsUpdating(false);
    },
  });

  const handleOpenGrade = (att: any) => {
    setSelectedAttempt(att);
    setNewScore(att.score ?? 0);
  };

  const handleSaveGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttempt) return;
    setIsUpdating(true);
    updateMutation.mutate({
      attemptId: selectedAttempt.id,
      newScore: Number(newScore),
      graded: true,
    });
  };

  return (
    <>
      <PageHeader
        title="نتائج الطلاب وتصحيح المقالي"
        desc="متابعة درجات الطلاب ومراجعة وتصحيح إجابات الأسئلة المقالية واعتماد الدرجات النهائية."
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
                <th className="p-4">حالة التصحيح</th>
                <th className="p-4">النتيجة</th>
                <th className="p-4">تاريخ التسليم</th>
                <th className="p-4 text-center">إجراءات التصحيح</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {results.map((res: any) => {
                const percentage =
                  res.total_points > 0 ? Math.round((res.score / res.total_points) * 100) : 0;
                const isGraded = res.graded;
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
                      {isGraded ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          <CheckCircle className="size-3.5" /> تم التصحيح والاعتماد
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                          <Clock className="size-3.5" /> بانتظار تصحيح المقالي
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 font-bold text-primary">
                        {res.score} / {res.total_points} ({percentage}%)
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {new Date(res.submitted_at).toLocaleString("ar-EG")}
                    </td>
                    <td className="p-4 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenGrade(res)}
                        className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                      >
                        <FileText className="size-4" /> مراجعة وتصحيح الإجابات
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Grading Modal */}
      <Dialog open={!!selectedAttempt} onOpenChange={() => setSelectedAttempt(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary">مراجعة وتصحيح إجابات الطالب</DialogTitle>
            <DialogDescription>
              {selectedAttempt?.student?.full_name} - {selectedAttempt?.quiz?.title}
            </DialogDescription>
          </DialogHeader>

          {selectedAttempt && (
            <div className="space-y-6 pt-2">
              <div className="rounded-xl border bg-secondary/30 p-4 space-y-4">
                <h4 className="font-bold text-foreground text-sm">
                  إجابات الأسئلة المقدمة من الطالب:
                </h4>
                {selectedAttempt.answers && typeof selectedAttempt.answers === "object" ? (
                  Object.entries(selectedAttempt.answers).map(
                    ([qId, ansText]: [string, any], idx: number) => {
                      const qObj = (selectedAttempt.quizQuestions || []).find(
                        (q: any) => q.id === qId,
                      );
                      return (
                        <div key={qId} className="bg-card p-3 rounded-lg border space-y-1">
                          <p className="text-xs font-semibold text-primary">
                            السؤال {idx + 1}: {qObj ? qObj.text : "سؤال"} (
                            {qObj?.type === "essay" ? "مقالي" : "اختيار من متعدد"})
                          </p>
                          <p className="text-sm text-foreground bg-secondary/40 p-2.5 rounded">
                            إجابة الطالب: {String(ansText || "لم يُجب")}
                          </p>
                          {qObj?.type === "essay" && (
                            <p className="text-xs text-amber-700 font-medium pt-1">
                              * يتطلب هذا السؤال المقالي مراجعتك وتعديل الدرجة النهائية أدناه.
                            </p>
                          )}
                        </div>
                      );
                    },
                  )
                ) : (
                  <p className="text-sm text-muted-foreground p-3 bg-card rounded border">
                    لا توجد إجابات تفصيلية مسجّلة لهذه المحاولة (تم تسجيل الدرجة التلقائية فقط).
                  </p>
                )}
              </div>

              <form onSubmit={handleSaveGrade} className="space-y-4 border-t pt-4">
                <div className="space-y-2">
                  <Label htmlFor="gradeScore">
                    الدرجة النهائية المعتمدة (من {selectedAttempt.total_points}):
                  </Label>
                  <Input
                    id="gradeScore"
                    type="number"
                    max={selectedAttempt.total_points}
                    min={0}
                    step="0.5"
                    value={newScore}
                    onChange={(e) => setNewScore(Number(e.target.value))}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    قم بتعديل الدرجة بإضافة نقاط الأسئلة المقالية بعد تصحيحها، ثم اضغط حفظ واعتماد
                    لتظهر للطالب.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setSelectedAttempt(null)}>
                    إلغاء
                  </Button>
                  <Button
                    type="submit"
                    disabled={isUpdating}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isUpdating && <Loader2 className="ml-2 size-4 animate-spin" />}
                    حفظ واعتماد الدرجة النهائية
                  </Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
