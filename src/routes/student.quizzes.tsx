/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { getStudentContentFn, submitQuizAttemptFn } from "@/lib/admin-server";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["student-content"],
    queryFn: () => getStudentContentFn(),
    initialData,
  });

  const quizzes = data?.quizzes || [];
  const [activeQuiz, setActiveQuiz] = useState<any | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  const submitMutation = useMutation({
    mutationFn: (vars: any) => submitQuizAttemptFn({ data: vars }),
    onSuccess: () => {
      toast.success("تم تسجيل إجابات الاختبار بنجاح");
      setSubmitted(true);
      refetch();
    },
    onError: (err: Error) => {
      toast.error(err.message || "حدث خطأ أثناء حفظ النتيجة");
    },
  });

  const handleSubmitQuizAuto = useCallback(() => {
    if (!activeQuiz || submitted) return;
    let calculatedScore = 0;
    let maxPoints = 0;
    const questions = activeQuiz.questions || [];
    questions.forEach((q: any) => {
      const qPoints = q.points || 5;
      maxPoints += qPoints;
      if (q.type === "mcq") {
        const studentAns = answers[q.id];
        if (studentAns && studentAns === q.correctAnswer) {
          calculatedScore += qPoints;
        }
      }
    });

    setFinalScore(calculatedScore);
    setTotalPoints(maxPoints > 0 ? maxPoints : 10);

    submitMutation.mutate({
      quizId: activeQuiz.id,
      score: calculatedScore,
      totalPoints: maxPoints > 0 ? maxPoints : 10,
      answers,
    });
  }, [activeQuiz, submitted, answers, submitMutation]);

  useEffect(() => {
    if (!activeQuiz || submitted || timeRemaining === null) return;
    if (timeRemaining <= 0) {
      toast.error("انتهى وقت الامتحان! جاري تسليم إجاباتك تلقائياً.");
      handleSubmitQuizAuto();
      return;
    }
    const timer = setInterval(() => {
      setTimeRemaining((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [activeQuiz, submitted, timeRemaining, handleSubmitQuizAuto]);

  const handleStartQuiz = (qz: any) => {
    const now = new Date();
    if (qz.startDate && new Date(qz.startDate) > now) {
      toast.error(
        `لم يبدأ موعد الاختبار بعد. يبدأ في: ${new Date(qz.startDate).toLocaleString("ar-EG")}`,
      );
      return;
    }
    if (qz.endDate && new Date(qz.endDate) < now) {
      toast.error("انتهى موعد هذا الاختبار.");
      return;
    }
    if (qz.attemptCount >= qz.maxAttempts) {
      toast.error("لقد استنفذت الحد الأقصى لعدد محاولات هذا الامتحان.");
      return;
    }
    setActiveQuiz(qz);
    setAnswers({});
    setSubmitted(false);
    setFinalScore(0);
    setTotalPoints(0);
    if (qz.durationMinutes && qz.durationMinutes > 0) {
      setTimeRemaining(qz.durationMinutes * 60);
    } else {
      setTimeRemaining(null);
    }
  };

  const handleAnswerChange = (qId: string, val: string) => {
    setAnswers({ ...answers, [qId]: val });
  };

  const handleSubmitQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuiz) return;

    let calculatedScore = 0;
    let maxPoints = 0;

    const questions = activeQuiz.questions || [];
    questions.forEach((q: any) => {
      const qPoints = q.points || 5;
      maxPoints += qPoints;

      if (q.type === "mcq") {
        const studentAns = answers[q.id];
        if (studentAns && studentAns === q.correctAnswer) {
          calculatedScore += qPoints;
        }
      }
    });

    setFinalScore(calculatedScore);
    setTotalPoints(maxPoints > 0 ? maxPoints : 10);

    submitMutation.mutate({
      quizId: activeQuiz.id,
      score: calculatedScore,
      totalPoints: maxPoints > 0 ? maxPoints : 10,
      answers,
    });
  };

  return (
    <>
      <PageHeader
        title="التدريبات والاختبارات"
        desc="اختبر فهمك لدروس التاريخ عبر التدريبات المتاحة."
      />

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
            <div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                {activeQuiz.grade || "عام"}
              </span>
              <h2 className="mt-2 text-xl font-bold text-primary">{activeQuiz.title}</h2>
            </div>
            <Button variant="outline" size="sm" onClick={() => setActiveQuiz(null)}>
              العودة للقائمة
            </Button>
          </div>

          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            {activeQuiz.parsedDescription || "أجب عن الأسئلة المرفقة بعناية."}
          </p>

          {timeRemaining !== null && !submitted && (
            <div className="mt-4 bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2.5 rounded-xl flex items-center justify-between font-bold text-sm">
              <span>الوقت المتبقي للامتحان:</span>
              <span className="text-base font-mono bg-white px-3 py-1 rounded-md shadow-sm border border-amber-200 text-primary">
                {Math.floor(timeRemaining / 60)
                  .toString()
                  .padStart(2, "0")}
                :{(timeRemaining % 60).toString().padStart(2, "0")}
              </span>
            </div>
          )}

          {submitted ? (
            <div className="my-8 rounded-xl bg-emerald-50 border border-emerald-200 p-6 text-center text-emerald-900">
              <CheckCircle2 className="mx-auto size-12 text-emerald-600 mb-2" />
              <h3 className="text-lg font-bold">تم تسليم الاختبار بنجاح!</h3>
              <p className="mt-2 text-sm">
                درجة الأسئلة التلقائية (اختيار من متعدد):{" "}
                <span className="font-bold">
                  {finalScore} / {totalPoints}
                </span>
              </p>
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs leading-relaxed text-right">
                <strong>ملاحظة هامة:</strong> تم إرسال إجاباتك المقالية إلى المعلم للمراجعة، **ولا
                تُعتبر النتيجة النهائية نهائية أو تُرسل لك درجات الأسئلة المقالية إلا بعد تصحيحها
                ومراجعتها واعتمادها من قبل المدير/المعلم**.
              </div>
              <Button onClick={() => setActiveQuiz(null)} className="mt-6">
                الانتقال للتدريبات الأخرى
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmitQuiz} className="mt-6 space-y-6">
              {!activeQuiz.questions || activeQuiz.questions.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground border rounded-xl">
                  <AlertCircle className="mx-auto size-8 mb-2 text-amber-500" />
                  لا توجد أسئلة مضافة لهذا التدريب بعد.
                </div>
              ) : (
                activeQuiz.questions.map((q: any, idx: number) => (
                  <div key={q.id} className="rounded-xl border p-5 bg-card shadow-sm space-y-3">
                    <p className="font-bold text-foreground">
                      {idx + 1}. {q.text}{" "}
                      <span className="text-xs text-primary font-normal">
                        ({q.points || 5} درجات)
                      </span>
                    </p>

                    {q.type === "mcq" && (
                      <div className="space-y-2 pt-2">
                        {q.options.map((opt: string, optIdx: number) => (
                          <label
                            key={optIdx}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/40 cursor-pointer"
                          >
                            <input
                              type="radio"
                              name={`question-${q.id}`}
                              required
                              checked={answers[q.id] === opt}
                              onChange={() => handleAnswerChange(q.id, opt)}
                              className="accent-primary size-4"
                            />
                            <span className="text-sm">{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {q.type === "essay" && (
                      <div className="pt-2">
                        <Textarea
                          required
                          value={answers[q.id] || ""}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          placeholder="اكتب إجابتك المقالية هنا..."
                          rows={4}
                        />
                      </div>
                    )}
                  </div>
                ))
              )}

              {activeQuiz.questions && activeQuiz.questions.length > 0 && (
                <Button
                  type="submit"
                  disabled={submitMutation.isPending}
                  className="w-full bg-primary text-primary-foreground py-3 font-bold text-base"
                >
                  {submitMutation.isPending && <Loader2 className="ml-2 size-4 animate-spin" />}
                  إنهاء وتسليم الاختبار
                </Button>
              )}
            </form>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {quizzes.map((qz: any) => {
            const now = new Date();
            const notStarted = qz.startDate && new Date(qz.startDate) > now;
            const expired = qz.endDate && new Date(qz.endDate) < now;
            const exhausted = qz.attemptCount >= qz.maxAttempts;

            return (
              <div
                key={qz.id}
                className="rounded-2xl border bg-card p-6 shadow-card flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                      {qz.grade || "عام"}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      المحاولات: {qz.attemptCount} / {qz.maxAttempts}
                    </span>
                  </div>
                  <h3 className="mt-3 text-xl font-bold text-foreground">{qz.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {qz.parsedDescription || "اختبر معلوماتك في هذا الدرس."}
                  </p>

                  <div className="mt-3 space-y-1 text-xs text-muted-foreground border-t pt-2">
                    <p>عدد الأسئلة: {qz.questions?.length || 0}</p>
                    {qz.durationMinutes > 0 && <p>مدة الامتحان: {qz.durationMinutes} دقيقة</p>}
                    {qz.startDate && (
                      <p>يبدأ في: {new Date(qz.startDate).toLocaleString("ar-EG")}</p>
                    )}
                    {qz.endDate && <p>ينتهي في: {new Date(qz.endDate).toLocaleString("ar-EG")}</p>}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {new Date(qz.created_at).toLocaleDateString("ar-EG")}
                  </span>
                  {exhausted ? (
                    <span className="text-xs font-bold text-destructive px-3 py-1.5 rounded-lg bg-destructive/10">
                      استنفذت عدد المحاولات
                    </span>
                  ) : notStarted ? (
                    <span className="text-xs font-bold text-amber-700 px-3 py-1.5 rounded-lg bg-amber-100">
                      يبدأ قريباً
                    </span>
                  ) : expired ? (
                    <span className="text-xs font-bold text-destructive px-3 py-1.5 rounded-lg bg-destructive/10">
                      انتهى موعد الاختبار
                    </span>
                  ) : (
                    <Button
                      onClick={() => handleStartQuiz(qz)}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      بدء التدريب ←
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
