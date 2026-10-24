/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, Plus, Trash2, Edit, Loader2, HelpCircle, Upload } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { adminHead } from "@/components/AdminPage";
import { getQuizzesFn, saveQuizFn, deleteQuizFn, generateQuizFromPdfFn } from "@/lib/admin-server";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/exercises")({
  head: adminHead("إدارة التدريبات", "إنشاء وإدارة التدريبات والاختبارات والأسئلة."),
  loader: async () => {
    try {
      return await getQuizzesFn();
    } catch {
      return [];
    }
  },
  component: AdminExercises,
});

function AdminExercises() {
  const queryClient = useQueryClient();
  const initialData = Route.useLoaderData();
  const { data: quizzes = [], isLoading } = useQuery({
    queryKey: ["admin-quizzes"],
    queryFn: () => getQuizzesFn(),
    initialData,
  });

  const [isOpen, setIsOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<any | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [grade, setGrade] = useState("");
  const [published, setPublished] = useState(false);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      toast.error("يرجى اختيار ملف PDF صحيح");
      return;
    }

    setIsGeneratingPdf(true);
    toast.info("جاري تحليل ملف الـ PDF وتوليد الأسئلة بالذكاء الاصطناعي...");

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64String = (reader.result as string).split(",")[1];
        const res = await generateQuizFromPdfFn({
          data: {
            base64Data: base64String,
            mimeType: file.type || "application/pdf",
          },
        });

        if (res && Array.isArray(res.questions)) {
          const formatted = res.questions.map((q: any) => ({
            ...q,
            id: Math.random().toString(36).substring(2, 9),
          }));
          setQuestions((prev) => [...prev, ...formatted]);
          toast.success(`تم بنجاح توليد واستخراج ${formatted.length} سؤالاً من ملف الـ PDF!`);
        }
      } catch (err: any) {
        toast.error(err.message || "فشل توليد الأسئلة من ملف الـ PDF");
      } finally {
        setIsGeneratingPdf(false);
        e.target.value = "";
      }
    };
    reader.onerror = () => {
      setIsGeneratingPdf(false);
      toast.error("فشل قراءة الملف");
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setEditingQuiz(null);
    setTitle("");
    setDescription("");
    setGrade("");
    setPublished(false);
    setMaxAttempts(1);
    setDurationMinutes(0);
    setStartDate("");
    setEndDate("");
    setQuestions([]);
  };

  const handleOpenEdit = (quiz: any) => {
    setEditingQuiz(quiz);
    setTitle(quiz.title || "");
    setDescription(quiz.parsedDescription || "");
    setGrade(quiz.grade || "");
    setPublished(quiz.published ?? false);
    setMaxAttempts(quiz.maxAttempts || 1);
    setDurationMinutes(quiz.durationMinutes || 0);
    setStartDate(quiz.startDate || "");
    setEndDate(quiz.endDate || "");
    setQuestions(quiz.questions || []);
    setIsOpen(true);
  };

  const handleAddMcqQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: Math.random().toString(36).substring(2, 9),
        text: "",
        type: "mcq",
        options: ["", "", "", ""],
        correctAnswer: "",
        points: 5,
      },
    ]);
  };

  const handleAddEssayQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: Math.random().toString(36).substring(2, 9),
        text: "",
        type: "essay",
        points: 5,
      },
    ]);
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const handleQuestionChange = (id: string, field: string, value: any) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, [field]: value } : q)));
  };

  const handleOptionChange = (qId: string, optIndex: number, val: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === qId) {
          const newOpts = [...(q.options || ["", "", "", ""])];
          newOpts[optIndex] = val;
          return { ...q, options: newOpts };
        }
        return q;
      }),
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await saveQuizFn({
        data: {
          id: editingQuiz?.id,
          title,
          description,
          grade,
          published,
          maxAttempts,
          durationMinutes,
          startDate,
          endDate,
          questions,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["admin-quizzes"] });
      toast.success("تم حفظ التدريب والأسئلة بنجاح");
      setIsOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء حفظ التدريب");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذا التدريب؟")) {
      try {
        await deleteQuizFn({ data: { id } });
        queryClient.invalidateQueries({ queryKey: ["admin-quizzes"] });
        toast.success("تم حذف التدريب بنجاح");
      } catch (err: any) {
        toast.error(err.message || "حدث خطأ أثناء الحذف");
      }
    }
  };

  return (
    <>
      <PageHeader
        title="إدارة التدريبات"
        desc="أنشئ الاختبارات وأضف أسئلة الاختيار من متعدد والأسئلة المقالية وتحديد عدد المحاولات."
        action={
          <Button
            onClick={() => {
              resetForm();
              setIsOpen(true);
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="ml-2 size-4" /> إضافة تدريب
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : quizzes.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center shadow-card">
          <ClipboardList className="mx-auto size-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-bold text-primary">لم تُضف أي تدريب بعد</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            أضف اختباراً جديداً مع الأسئلة وتحديد عدد المحاولات لتقييم تحصيل الطلاب.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((qz: any) => (
            <div
              key={qz.id}
              className="rounded-2xl border bg-card p-5 shadow-card flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                    {qz.grade || "عام"}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      qz.published
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {qz.published ? "منشور" : "مسودة"}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-bold text-foreground">{qz.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {qz.parsedDescription || "لا يوجد وصف مختصر."}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-primary">
                  <span>الأسئلة: {qz.questions?.length || 0}</span>
                  <span>|</span>
                  <span>المحاولات: {qz.maxAttempts || 1}</span>
                  {qz.durationMinutes > 0 && (
                    <>
                      <span>|</span>
                      <span>المدة: {qz.durationMinutes} دقيقة</span>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t pt-4">
                <span className="text-xs text-muted-foreground">
                  {new Date(qz.created_at).toLocaleDateString("ar-EG")}
                </span>
                <div className="space-x-2 space-x-reverse">
                  <Button size="sm" variant="outline" onClick={() => handleOpenEdit(qz)}>
                    <Edit className="size-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(qz.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Quiz Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-primary">
              {editingQuiz ? "تعديل التدريب والأسئلة" : "إضافة تدريب جديد مع الأسئلة"}
            </DialogTitle>
            <DialogDescription>
              أدخل عنوان التدريب، إعدادات الوقت والمدة، ثم أضف أسئلة الاختبار.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-6 mt-2">
            <div className="space-y-4 rounded-xl border p-4 bg-secondary/20">
              <h3 className="font-bold text-foreground">البيانات الأساسية وإعدادات الامتحان</h3>
              <div>
                <Label>عنوان التدريب / الاختبار</Label>
                <Input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: اختبار الفصل الأول"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>الصف الدراسي</Label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full rounded-xl border border-gold/40 bg-card/90 py-3.5 px-4 text-sm text-foreground outline-none transition duration-200 focus:border-gold focus:ring-2 focus:ring-gold/30 shadow-sm"
                  >
                    <option value="">عام (جميع الصفوف)</option>
                    <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
                    <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
                    <option value="الصف الثالث الثانوي">الصف الثالث الثانوي</option>
                  </select>
                </div>
                <div>
                  <Label>عدد مرات محاولات الامتحان المسموحة</Label>
                  <Input
                    type="number"
                    min={1}
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 1)}
                    placeholder="مثال: 1 أو 2 أو 3"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>مدة الامتحان (بالدقائق)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                    placeholder="0 = بدون حد زمني"
                  />
                </div>
                <div>
                  <Label>تاريخ ووقت بدء الاختبار</Label>
                  <Input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>تاريخ ووقت انتهاء الاختبار</Label>
                  <Input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label>تعليمات أو وصف التدريب</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="أجب عن الأسئلة التالية بدقة..."
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border p-3 bg-card">
                <Label htmlFor="pub-quiz" className="cursor-pointer font-medium">
                  نشر التدريب للطلاب
                </Label>
                <Switch id="pub-quiz" checked={published} onCheckedChange={setPublished} />
              </div>
            </div>

            {/* Questions Section */}
            <div className="space-y-4">
              <div className="rounded-xl border border-gold/40 bg-gold/5 p-4 text-xs leading-6 text-foreground">
                <p className="font-bold text-primary mb-1">💡 تنبيه للمشرف أو المساعد البشري:</p>
                عند رفع ملف PDF يتم توليد الأسئلة وعرضها هنا للمراجعة **قبل نشرها نهائياً**. يمكنك تعديل النصوص، تغيير الخيارات، وتحديد الإجابة الصحيحة أو حذف وإضافة أي سؤال بكل حريتك كعضو بشري قبل الضغط على حفظ ونشر التدريب.
              </div>

              <div className="flex flex-wrap items-center justify-between border-b pb-2 gap-2">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <HelpCircle className="size-5 text-primary" /> أسئلة الاختبار ({questions.length})
                </h3>
                <div className="flex flex-wrap gap-2 items-center">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold px-3 py-1.5 rounded-lg transition">
                    <Upload className="size-4" />
                    {isGeneratingPdf ? "جاري التوليد..." : "رفع امتحان PDF وتوليد الأسئلة"}
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      disabled={isGeneratingPdf}
                      onChange={handlePdfUpload}
                    />
                  </label>
                  <Button type="button" size="sm" onClick={handleAddMcqQuestion}>
                    + اختيار من متعدد
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddEssayQuestion}
                  >
                    + سؤال مقالي
                  </Button>
                </div>
              </div>

              {questions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-xl">
                  لم تضف أي أسئلة بعد. استخدم أزرار الإضافة بالأعلى لإدراج الأسئلة.
                </p>
              ) : (
                questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="rounded-xl border p-4 bg-card shadow-sm space-y-3 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                        السؤال {idx + 1} ({q.type === "mcq" ? "اختيار من متعدد" : "سؤال مقالي"})
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRemoveQuestion(q.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    <div>
                      نص السؤال
                      <Input
                        required
                        value={q.text}
                        onChange={(e) => handleQuestionChange(q.id, "text", e.target.value)}
                        placeholder="اكتب نص السؤال هنا..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        الدرجة المخصصة
                        <Input
                          type="number"
                          min={1}
                          value={q.points}
                          onChange={(e) =>
                            handleQuestionChange(q.id, "points", parseInt(e.target.value) || 1)
                          }
                        />
                      </div>
                    </div>

                    {q.type === "mcq" && (
                      <div className="space-y-2 pt-2 border-t">
                        <Label className="text-xs font-semibold">
                          الخيارات (اختر الإجابة الصحيحة)
                        </Label>
                        {q.options.map((opt: string, optIdx: number) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-${q.id}`}
                              checked={q.correctAnswer === opt && opt !== ""}
                              onChange={() => handleQuestionChange(q.id, "correctAnswer", opt)}
                              className="accent-primary size-4"
                              title="الإجابة الصحيحة"
                            />
                            <Input
                              required
                              value={opt}
                              onChange={(e) => handleOptionChange(q.id, optIdx, e.target.value)}
                              placeholder={`الخيار ${optIdx + 1}`}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {q.type === "essay" && (
                      <p className="text-xs text-muted-foreground italic bg-secondary/40 p-2 rounded">
                        * يتم إرسال إجابة الطالب المقالية إلى الإدارة لمراجعتها وتصحيحها يدوياً.
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="ml-2 size-4 animate-spin" />}
                حفظ التدريب بالأسئلة
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
