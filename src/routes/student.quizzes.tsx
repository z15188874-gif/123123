import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, Loader2, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { getStudentContentFn, submitQuizAttemptFn } from "@/lib/admin-server";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/student/quizzes")({
  head: () => ({
    meta: [
      { title: "التدريبات والاختبارات | منصة الإبحار" },
      { name: "description", content: "تدريبات واختبارات في مادة التاريخ." },
      { property: "og:title", content: "التدريبات والاختبارات | منصة الإبحار" },
      { property: "og:description", content: "اختبر فهمك لدروس التاريخ." },
    ],
  }),
  loader: async () => {
    try {
      return await getStudentContentFn();
    } catch {
      return { lessons: [], quizzes: [] };
    }
  },
  component: StudentQuizzes,
});

function StudentQuizzes() {
  const initialData = Route.useLoaderData();
  const { data, isLoading } = useQuery({
    queryKey: ["student-content"],
    queryFn: () => getStudentContentFn(),
    initialData,
  });

  const quizzes = data?.quizzes || [];
  const [activeQuiz, setActiveQuiz] = useState<any | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const submitMutation = useMutation({
    mutationFn: submitQuizAttemptFn,
    onSuccess: () => {
      toast.success("تم تسجيل إجابتك ونتيجة التدريب بنجاح");
      setSubmitted(true);
    },
    onError: (err: Error) => {
      toast.error(err.message || "حدث خطأ أثناء حفظ النتيجة");
    },
  });

  const handleStartQuiz = (qz: any) => {
    setActiveQuiz(qz);
    setSubmitted(false);
    setScore(10); // default simulated full score upon completion for interactive test demonstration
  };

  return (
    <>
      <PageHeader title="التدريبات والاختبارات" desc="اختبر فهمك لدروس التاريخ عبر التدريبات المتاحة." />

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : quizzes.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center shadow-card">
          <ClipboardList className="mx-auto size-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-bold text-primary">لا توجد اختبارات متاحة حالياً</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            ستظهر هنا التدريبات فور نشرها من قبل الإدارة.
          </p>
        </div>
      ) : activeQuiz ? (
        <div className="rounded-2xl border bg-card p-6 md:p-8 shadow-card max-w-2xl mx-auto">
          <div className="flex items-center justify-between border-b pb-4">
            <h2 className="text-xl font-bold text-primary">{activeQuiz.title}</h2>
            <Button variant="outline" size="sm" onClick={() => setActiveQuiz(null)}>
              العودة للقائمة
            </Button>
          </div>

          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            {activeQuiz.description || "أجب عن الأسئلة المرفقة بعناية."}
          </p>

          {submitted ? (
            <div className="my-8 rounded-xl bg-emerald-50 border border-emerald-200 p-6 text-center text-emerald-900">
              <CheckCircle2 className="mx-auto size-12 text-emerald-600 mb-2" />
              <h3 className="text-lg font-bold">تم تسليم الاختبار بنجاح!</h3>
              <p className="mt-2 text-sm">حصلت على درجة: <span className="font-bold">{score} / 10</span></p>
              <Button onClick={() => setActiveQuiz(null)} className="mt-4">
                الانتقال للتدريبات الأخرى
              </Button>
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              <div className="rounded-xl border p-4 bg-secondary/30">
                <p className="font-medium text-foreground">سؤال تقييمي: هل أكملت قراءة الدرس المتعلق بهذا التدريب؟</p>
                <div className="mt-3 flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="q1" defaultChecked className="accent-primary" /> نعم، أتممت القراءة
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="q1" className="accent-primary" /> لم أتممها بعد
                  </label>
                </div>
              </div>

              <Button
                onClick={() => {
                  submitMutation.mutate({
                    quizId: activeQuiz.id,
                    score: 10,
                    totalPoints: 10,
                  });
                }}
                disabled={submitMutation.isPending}
                className="w-full bg-primary text-primary-foreground py-3 font-bold"
              >
                {submitMutation.isPending && <Loader2 className="ml-2 size-4 animate-spin" />}
                إنهاء وتسليم الاختبار
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {quizzes.map((qz: any) => (
            <div key={qz.id} className="rounded-2xl border bg-card p-6 shadow-card flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  {qz.grade || "عام"}
                </span>
                <h3 className="mt-3 text-xl font-bold text-foreground">{qz.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {qz.description || "اختبر معلوماتك في هذا الدرس."}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {new Date(qz.created_at).toLocaleDateString("ar-EG")}
                </span>
                <Button onClick={() => handleStartQuiz(qz)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  بدء التدريب ←
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
