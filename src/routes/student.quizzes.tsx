/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ClipboardList,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  ZoomIn,
  X,
  Trophy,
} from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { getStudentContentFn, submitQuizAttemptFn } from "@/lib/admin-server";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/student/quizzes")({
  head: () => ({
    meta: [
      { title: "التدريبات والاختبارات | منصة الإبحار" },
      { name: "description", content: "تدريبات واختبارات مصوّرة ونماذج إجابة في مادة التاريخ." },
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

const DEFAULT_OPTIONS = ["أ", "ب", "ج", "د"];

function StudentQuizzes() {
  const initialData = Route.useLoaderData();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["student-content"],
    queryFn: () => getStudentContentFn(),
    initialData,
  });

  const quizzes = useMemo(() => data?.quizzes || [], [data?.quizzes]);
  const [activeQuiz, setActiveQuiz] = useState<any | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [correctAnswers, setCorrectAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const submitMutation = useMutation({
    mutationFn: (vars: { quizId: string; answers?: Record<string, string> }) =>
      submitQuizAttemptFn({ data: vars }),
    onSuccess: (res: any) => {
      toast.success("تم تصحيح وتسجيل إجاباتك بنجاح");
      setFinalScore(typeof res?.score === "number" ? res.score : 0);
      setTotalPoints(
        typeof res?.totalPoints === "number" && res.totalPoints > 0 ? res.totalPoints : 10,
      );
      if (res?.correctAnswers) {
        setCorrectAnswers(res.correctAnswers);
      }
      setSubmitted(true);
      if (activeQuiz) {
        try {
          localStorage.removeItem(`exam_deadline_${activeQuiz.id}`);
          localStorage.removeItem(`exam_answers_${activeQuiz.id}`);
          localStorage.removeItem("active_exam_id");
        } catch {
          // ignore
        }
      }
      refetch();
    },
    onError: (err: Error) => {
      toast.error(err.message || "حدث خطأ أثناء حفظ النتيجة");
    },
  });

  const handleSubmitQuizAuto = useCallback(() => {
    if (!activeQuiz || submitted) return;

    try {
      localStorage.removeItem(`exam_deadline_${activeQuiz.id}`);
      localStorage.removeItem(`exam_answers_${activeQuiz.id}`);
      localStorage.removeItem("active_exam_id");
    } catch {
      // ignore
    }

    submitMutation.mutate({
      quizId: activeQuiz.id,
      answers,
    });
  }, [activeQuiz, submitted, answers, submitMutation]);

  useEffect(() => {
    if (!activeQuiz || submitted || timeRemaining === null) return;
    const timerKey = `exam_deadline_${activeQuiz.id}`;

    const checkTimer = () => {
      try {
        const saved = localStorage.getItem(timerKey);
        if (saved) {
          const deadline = parseInt(saved, 10);
          const rem = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
          setTimeRemaining(rem);
          if (rem <= 0) {
            try {
              localStorage.removeItem(timerKey);
              localStorage.removeItem(`exam_answers_${activeQuiz.id}`);
              localStorage.removeItem("active_exam_id");
            } catch {
              // ignore
            }
            toast.error("انتهى وقت الامتحان! جاري تسليم إجاباتك وتصحيحها تلقائياً.");
            handleSubmitQuizAuto();
          }
          return;
        }
      } catch {
        // ignore
      }
      setTimeRemaining((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    };

    const timer = setInterval(checkTimer, 1000);
    return () => clearInterval(timer);
  }, [activeQuiz, submitted, timeRemaining, handleSubmitQuizAuto]);

  const handleStartQuiz = useCallback((qz: any) => {
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

    const timerKey = `exam_deadline_${qz.id}`;
    let remaining: number | null = null;

    if (qz.durationMinutes && qz.durationMinutes > 0) {
      let deadline: number;
      try {
        const savedDeadline = localStorage.getItem(timerKey);
        if (savedDeadline) {
          deadline = parseInt(savedDeadline, 10);
        } else {
          deadline = Date.now() + qz.durationMinutes * 60 * 1000;
          localStorage.setItem(timerKey, deadline.toString());
        }
      } catch {
        deadline = Date.now() + qz.durationMinutes * 60 * 1000;
      }

      remaining = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      if (remaining <= 0) {
        toast.error("انتهى وقت هذا الاختبار!");
        try {
          localStorage.removeItem(timerKey);
          localStorage.removeItem(`exam_answers_${qz.id}`);
          localStorage.removeItem("active_exam_id");
        } catch {
          // ignore
        }
        return;
      }
    }

    let initialAnswers: Record<string, string> = {};
    try {
      const savedAnswers = localStorage.getItem(`exam_answers_${qz.id}`);
      if (savedAnswers) {
        initialAnswers = JSON.parse(savedAnswers);
      }
      localStorage.setItem("active_exam_id", qz.id);
    } catch {
      // ignore
    }

    setActiveQuiz(qz);
    setActiveImageIndex(0);
    setAnswers(initialAnswers);
    setCorrectAnswers({});
    setSubmitted(false);
    setFinalScore(0);
    setTotalPoints(0);
    setTimeRemaining(remaining);
  }, []);

  // Auto-restore ongoing quiz on page refresh if timer is still running
  useEffect(() => {
    if (activeQuiz || !quizzes.length || submitted) return;
    try {
      const activeId = localStorage.getItem("active_exam_id");
      if (activeId) {
        const found = quizzes.find((q: any) => q.id === activeId);
        if (found && found.attemptCount < found.maxAttempts) {
          const timerKey = `exam_deadline_${found.id}`;
          const savedDeadline = localStorage.getItem(timerKey);
          if (savedDeadline) {
            const deadline = parseInt(savedDeadline, 10);
            if (deadline > Date.now()) {
              handleStartQuiz(found);
            } else {
              localStorage.removeItem(timerKey);
              localStorage.removeItem(`exam_answers_${found.id}`);
              localStorage.removeItem("active_exam_id");
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }, [quizzes, activeQuiz, submitted, handleStartQuiz]);

  const handleSelectAnswer = (qId: string, val: string) => {
    if (submitted || !activeQuiz) return;
    setAnswers((prev) => {
      const updated = { ...prev, [qId]: val };
      try {
        localStorage.setItem(`exam_answers_${activeQuiz.id}`, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleSubmitQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuiz) return;

    try {
      localStorage.removeItem(`exam_deadline_${activeQuiz.id}`);
      localStorage.removeItem(`exam_answers_${activeQuiz.id}`);
      localStorage.removeItem("active_exam_id");
    } catch {
      // ignore
    }

    submitMutation.mutate({
      quizId: activeQuiz.id,
      answers,
    });
  };

  const answeredCount = Object.keys(answers).length;
  const totalQuestionsCount = activeQuiz?.questions?.length || 0;

  return (
    <>
      <PageHeader
        title="التدريبات والاختبارات"
        desc="اطلع على ورقة الامتحان وظلّل الإجابة الصحيحة لكل سؤال (أ، ب، ج، د)."
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
            ستظهر هنا التدريبات فور نشرها من قبل إدارة المنصة.
          </p>
        </div>
      ) : activeQuiz ? (
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Active Quiz Header */}
          <div className="rounded-2xl border bg-card p-5 md:p-6 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  متاح لجميع الصفوف
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  الأسئلة: {totalQuestionsCount}
                </span>
              </div>
              <h2 className="mt-2 text-2xl font-bold text-primary">{activeQuiz.title}</h2>
              {activeQuiz.parsedDescription && (
                <p className="mt-1 text-sm text-muted-foreground">{activeQuiz.parsedDescription}</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              {timeRemaining !== null && !submitted && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 px-3 py-1.5 rounded-xl font-bold text-sm flex items-center gap-2">
                  <span>الوقت المتبقي:</span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded shadow-sm border border-amber-200 text-primary">
                    {Math.floor(timeRemaining / 60)
                      .toString()
                      .padStart(2, "0")}
                    :{(timeRemaining % 60).toString().padStart(2, "0")}
                  </span>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={() => setActiveQuiz(null)}>
                العودة للقائمة
              </Button>
            </div>
          </div>

          {/* Exam Paper Image View (Multi-Page / Single-Page) */}
          {(() => {
            const quizImages: string[] =
              Array.isArray(activeQuiz.images) && activeQuiz.images.length > 0
                ? activeQuiz.images
                : activeQuiz.imageUrl
                  ? [activeQuiz.imageUrl]
                  : [];

            if (quizImages.length === 0) return null;

            const safeIndex = Math.min(Math.max(0, activeImageIndex), quizImages.length - 1);
            const currentImg = quizImages[safeIndex] || quizImages[0];

            return (
              <div className="rounded-2xl border bg-card p-4 md:p-6 shadow-card space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-foreground flex items-center gap-2 text-base">
                      <ImageIcon className="size-5 text-gold" />
                      ورقة الامتحان المصوّرة
                    </h3>
                    {quizImages.length > 1 && (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                        الصفحة {safeIndex + 1} من {quizImages.length}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {quizImages.length > 1 && (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={safeIndex === 0}
                          onClick={() => setActiveImageIndex((prev) => Math.max(0, prev - 1))}
                          className="text-xs"
                        >
                          الصفحة السابقة
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={safeIndex === quizImages.length - 1}
                          onClick={() =>
                            setActiveImageIndex((prev) => Math.min(quizImages.length - 1, prev + 1))
                          }
                          className="text-xs"
                        >
                          الصفحة التالية
                        </Button>
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setZoomImage(currentImg)}
                      className="text-xs flex items-center gap-1.5"
                    >
                      <ZoomIn className="size-4" /> تكبير الصفحة بحجم الشاشة
                    </Button>
                  </div>
                </div>

                {/* Multiple Pages Quick Tabs */}
                {quizImages.length > 1 && (
                  <div className="flex flex-wrap items-center gap-2 border-b pb-3">
                    <span className="text-xs text-muted-foreground ml-1">انتقل للصفحة:</span>
                    {quizImages.map((_, pIdx) => (
                      <Button
                        key={pIdx}
                        type="button"
                        size="sm"
                        variant={safeIndex === pIdx ? "default" : "secondary"}
                        onClick={() => setActiveImageIndex(pIdx)}
                        className={`text-xs font-bold px-3 h-8 ${
                          safeIndex === pIdx
                            ? "bg-primary text-primary-foreground shadow"
                            : "bg-secondary text-foreground hover:bg-secondary/80"
                        }`}
                      >
                        ورقة {pIdx + 1}
                      </Button>
                    ))}
                  </div>
                )}

                <div
                  className="rounded-xl overflow-hidden border bg-muted/20 flex items-center justify-center cursor-pointer hover:border-gold transition p-2 min-h-[350px]"
                  onClick={() => setZoomImage(currentImg)}
                  title="اضغط لتكبير صورة الصفحة"
                >
                  <img
                    src={currentImg}
                    alt={`ورقة الامتحان - صفحة ${safeIndex + 1}`}
                    className="w-full max-h-[650px] object-contain rounded-lg"
                  />
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  اضغط على صورة الصفحة لتكبيرها بوضوح كامل
                  {quizImages.length > 1
                    ? "، واستخدم أزرار الصفحات للتبديل بين أوراق الامتحان"
                    : ""}
                  .
                </p>
              </div>
            );
          })()}

          {/* Submitted Result Celebration View */}
          {submitted ? (
            <div className="rounded-2xl border bg-card p-6 md:p-8 shadow-card space-y-6">
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-6 text-center text-emerald-950">
                <Trophy className="mx-auto size-14 text-emerald-600 mb-3 animate-bounce" />
                <h3 className="text-2xl font-extrabold text-emerald-900">
                  تم تسليم وتصحيح الاختبار بنجاح!
                </h3>
                <div className="mt-4 inline-flex items-center gap-3 bg-white px-6 py-3 rounded-2xl shadow-sm border border-emerald-200">
                  <span className="text-sm font-semibold text-muted-foreground">
                    درجتك النهائية:
                  </span>
                  <span className="text-3xl font-extrabold text-primary">
                    {finalScore}{" "}
                    <span className="text-base text-muted-foreground font-normal">
                      / {totalPoints}
                    </span>
                  </span>
                  <span className="text-sm font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 mr-2">
                    {Math.round((finalScore / (totalPoints || 1)) * 100)}%
                  </span>
                </div>
              </div>

              {/* Answers Review */}
              <div className="space-y-3">
                <h4 className="font-bold text-foreground text-base">
                  مراجعة نموذج الإجابات والتصحيح:
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {activeQuiz.questions?.map((q: any, idx: number) => {
                    const studentAns = answers[q.id] ?? answers[String(idx)];
                    const correctAns =
                      correctAnswers[q.id] ?? correctAnswers[String(idx)] ?? q.correctAnswer;
                    const isCorrect = Boolean(
                      studentAns && correctAns && studentAns.trim() === correctAns.trim(),
                    );
                    return (
                      <div
                        key={q.id || idx}
                        className={`rounded-xl border p-4 flex items-center justify-between ${
                          isCorrect
                            ? "bg-emerald-50/60 border-emerald-300"
                            : "bg-destructive/5 border-destructive/30"
                        }`}
                      >
                        <div className="space-y-1">
                          <p className="font-bold text-foreground text-sm">
                            {q.text || `السؤال ${idx + 1}`}
                          </p>
                          <div className="text-xs flex items-center gap-3">
                            <span>
                              إجابتك:{" "}
                              <strong className="font-bold text-primary">
                                {studentAns || "لم تُجب"}
                              </strong>
                            </span>
                            <span>
                              الصحيحة:{" "}
                              <strong className="font-bold text-emerald-700">
                                {correctAns || "—"}
                              </strong>
                            </span>
                          </div>
                        </div>

                        <div>
                          {isCorrect ? (
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="size-3.5" /> صحيحة (+{q.points || 1})
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-destructive bg-destructive/10 px-2.5 py-1 rounded-full flex items-center gap-1">
                              <X className="size-3.5" /> خاطئة (0)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="text-center pt-2">
                <Button onClick={() => setActiveQuiz(null)} className="px-8 font-bold">
                  الانتقال للتدريبات الأخرى
                </Button>
              </div>
            </div>
          ) : (
            /* Student Answer Sheet (Bubble Sheet) */
            <form
              onSubmit={handleSubmitQuiz}
              className="rounded-2xl border bg-card p-6 md:p-8 shadow-card space-y-6"
            >
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="text-lg font-bold text-primary">ورقة الإجابة (اختر أ، ب، ج، د)</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    اختر الحرف المطابق لإجابتك الصحيحة لكل سؤال في ورقة الامتحان.
                  </p>
                </div>
                <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-secondary text-foreground">
                  تمت الإجابة: {answeredCount} من {totalQuestionsCount}
                </span>
              </div>

              {!activeQuiz.questions || activeQuiz.questions.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground border rounded-xl">
                  <AlertCircle className="mx-auto size-8 mb-2 text-amber-500" />
                  لا توجد أسئلة مضافة لهذا التدريب بعد.
                </div>
              ) : (
                <div className="space-y-4">
                  {activeQuiz.questions.map((q: any, idx: number) => {
                    const selected = answers[q.id];
                    const optionsList =
                      q.options && q.options.length > 0 ? q.options : DEFAULT_OPTIONS;

                    return (
                      <div
                        key={q.id}
                        className={`rounded-xl border p-4 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          selected ? "bg-card border-gold/60 shadow-sm" : "bg-card/60 border-border"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex items-center justify-center size-8 rounded-full font-bold text-sm shrink-0 ${
                              selected
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-bold text-foreground text-sm">
                              {q.text || `السؤال ${idx + 1}`}
                            </p>
                            <span className="text-[11px] text-muted-foreground">
                              درجة السؤال: {q.points || 1}
                            </span>
                          </div>
                        </div>

                        {/* Options Buttons: أ ب ج د */}
                        <div className="flex items-center gap-2 justify-center sm:justify-end">
                          {optionsList.map((opt: string) => {
                            const isChosen = selected === opt;
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => handleSelectAnswer(q.id, opt)}
                                className={`size-11 rounded-2xl font-bold text-base transition-all flex items-center justify-center border-2 ${
                                  isChosen
                                    ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                                    : "bg-secondary/40 text-foreground border-border hover:border-primary/50 hover:bg-secondary"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeQuiz.questions && activeQuiz.questions.length > 0 && (
                <div className="pt-4 border-t">
                  <Button
                    type="submit"
                    disabled={submitMutation.isPending}
                    className="w-full bg-primary text-primary-foreground py-3.5 font-bold text-base shadow-lg hover:bg-primary/90"
                  >
                    {submitMutation.isPending && <Loader2 className="ml-2 size-5 animate-spin" />}
                    إنهاء وتسليم الاختبار والتصحيح الفوري
                  </Button>
                </div>
              )}
            </form>
          )}
        </div>
      ) : (
        /* Quizzes Grid List */
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
                      متاح لجميع الصفوف
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      المحاولات: {qz.attemptCount} / {qz.maxAttempts}
                    </span>
                  </div>

                  <h3 className="mt-3 text-xl font-bold text-foreground">{qz.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {qz.parsedDescription || "اختبر معلوماتك في هذا الدرس."}
                  </p>

                  {((qz.images && qz.images.length > 0) || qz.imageUrl) && (
                    <div className="mt-3 relative rounded-lg overflow-hidden border bg-muted/30 h-24 flex items-center justify-center">
                      <img
                        src={qz.images?.[0] || qz.imageUrl}
                        alt={qz.title}
                        className="w-full h-full object-cover opacity-90"
                      />
                      <span className="absolute bottom-1 right-1 text-[10px] bg-slate-900/80 text-white px-2 py-0.5 rounded backdrop-blur-xs flex items-center gap-1 font-semibold">
                        <ImageIcon className="size-3 text-gold" />
                        {qz.images && qz.images.length > 1
                          ? `${qz.images.length} أوراق للامتحان`
                          : "ورقة امتحان مصوّرة"}
                      </span>
                    </div>
                  )}

                  <div className="mt-3 space-y-1 text-xs text-muted-foreground border-t pt-2">
                    <p>عدد الأسئلة: {qz.questions?.length || 0}</p>
                    {qz.durationMinutes > 0 && <p>مدة الامتحان: {qz.durationMinutes} دقيقة</p>}
                    {qz.startDate && (
                      <p>يبدأ في: {new Date(qz.startDate).toLocaleString("ar-EG")}</p>
                    )}
                    {qz.endDate && <p>ينتهي في: {new Date(qz.endDate).toLocaleString("ar-EG")}</p>}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    {new Date(qz.created_at).toLocaleDateString("ar-EG")}
                  </span>
                  {exhausted ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-destructive px-3 py-1.5 rounded-lg bg-destructive/10">
                        لقد استنفذت جميع محاولاتك
                      </span>
                      {qz.myScore !== null && qz.myScore !== undefined && (
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs">
                          <Trophy className="size-3.5 text-amber-600" />
                          النتيجة: {qz.myScore} / {qz.myTotalPoints || 10}
                          <span className="text-[11px] font-semibold text-emerald-700">
                            ({Math.round((qz.myScore / (qz.myTotalPoints || 10)) * 100)}%)
                          </span>
                        </span>
                      )}
                    </div>
                  ) : notStarted ? (
                    <span className="text-xs font-bold text-amber-700 px-3 py-1.5 rounded-lg bg-amber-100">
                      يبدأ قريباً
                    </span>
                  ) : expired ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-destructive px-3 py-1.5 rounded-lg bg-destructive/10">
                        انتهى موعد الاختبار
                      </span>
                      {qz.myScore !== null && qz.myScore !== undefined && (
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs">
                          <Trophy className="size-3.5 text-amber-600" />
                          النتيجة: {qz.myScore} / {qz.myTotalPoints || 10}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      {qz.myScore !== null && qz.myScore !== undefined && (
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-lg flex items-center gap-1">
                          <Trophy className="size-3 text-amber-600" />
                          آخر درجة: {qz.myScore} / {qz.myTotalPoints || 10}
                        </span>
                      )}
                      <Button
                        onClick={() => handleStartQuiz(qz)}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        بدء التدريب ←
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full image zoom modal */}
      {zoomImage && (
        <Dialog open={!!zoomImage} onOpenChange={() => setZoomImage(null)}>
          <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">ورقة الامتحان المصوّرة</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center mt-2">
              <img
                src={zoomImage}
                alt="ورقة الامتحان"
                className="max-w-full h-auto rounded-lg shadow-xl"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
