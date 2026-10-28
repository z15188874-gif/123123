/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ClipboardList,
  Plus,
  Trash2,
  Edit,
  Loader2,
  HelpCircle,
  Image as ImageIcon,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { adminHead } from "@/components/AdminPage";
import { getQuizzesFn, saveQuizFn, deleteQuizFn } from "@/lib/admin-server";
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
  head: adminHead("إدارة التدريبات", "إنشاء وإدارة التدريبات والاختبارات المصوّرة ونماذج الإجابة."),
  loader: async () => {
    try {
      return await getQuizzesFn();
    } catch {
      return [];
    }
  },
  component: AdminExercises,
});

const ARABIC_ORDINALS = [
  "الأول",
  "الثاني",
  "الثالث",
  "الرابع",
  "الخامس",
  "السادس",
  "السابع",
  "الثامن",
  "التاسع",
  "العاشر",
  "الحادي عشر",
  "الثاني عشر",
  "الثالث عشر",
  "الرابع عشر",
  "الخامس عشر",
  "السادس عشر",
  "السابع عشر",
  "الثامن عشر",
  "التاسع عشر",
  "العشرون",
  "الحادي والعشرون",
  "الثاني والعشرون",
  "الثالث والعشرون",
  "الرابع والعشرون",
  "الخامس والعشرون",
  "السادس والعشرون",
  "السابع والعشرون",
  "الثامن والعشرون",
  "التاسع والعشرون",
  "الثلاثون",
  "الحادي والثلاثون",
  "الثاني والثلاثون",
  "الثالث والثلاثون",
  "الرابع والثلاثون",
  "الخامس والثلاثون",
  "السادس والثلاثون",
  "السابع والثلاثون",
  "الثامن والثلاثون",
  "التاسع والثلاثون",
  "الأربعون",
  "الحادي والأربعون",
  "الثاني والأربعون",
  "الثالث والأربعون",
  "الرابع والأربعون",
  "الخامس والأربعون",
  "السادس والأربعون",
  "السابع والأربعون",
  "الثامن والأربعون",
  "التاسع والأربعون",
  "الخمسون",
];

function getQuestionTitle(index: number): string {
  if (index < ARABIC_ORDINALS.length) {
    return `السؤال ${ARABIC_ORDINALS[index]}`;
  }
  return `السؤال ${index + 1}`;
}

const DEFAULT_OPTIONS = ["أ", "ب", "ج", "د"];

function createDefaultQuestion(index: number) {
  return {
    id: Math.random().toString(36).substring(2, 9),
    text: getQuestionTitle(index),
    type: "mcq",
    options: [...DEFAULT_OPTIONS],
    correctAnswer: "أ",
    points: 1,
  };
}

function compressImageFile(file: File, maxDimension = 1600, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`فشل قراءة الملف ${file.name}`));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error(`فشل تحميل الصورة ${file.name}`));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Compress as clean JPEG
        const compressed = canvas.toDataURL("image/jpeg", quality);
        resolve(compressed);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

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
  const [grade, setGrade] = useState("عام لجميع الطلاب");
  const [published, setPublished] = useState(true);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);

  const handleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const validFiles: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.type.startsWith("image/")) {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) {
      toast.error("يرجى اختيار ملفات صور صالحة (JPG, PNG, WEBP)");
      return;
    }

    setIsProcessingImages(true);
    const toastId = toast.loading(
      `جاري ضغط ومعالجة ${validFiles.length} صفحة للامتحان بأعلى نقاء وأخف حجم...`,
    );

    try {
      // Process in exact order
      const compressedList = await Promise.all(
        validFiles.map((f) => compressImageFile(f, 1600, 0.82)),
      );

      setImages((prev) => {
        const updated = [...prev, ...compressedList];
        if (!imageUrl && updated.length > 0) {
          setImageUrl(updated[0]);
        }
        return updated;
      });

      toast.dismiss(toastId);
      toast.success(
        `تم بنجاح رفع وتجهيز ${validFiles.length} صفحة لورقة الامتحان بدقة واضحة وحجم خفيف.`,
      );
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.message || "حدث خطأ أثناء معالجة الصور");
    } finally {
      setIsProcessingImages(false);
      e.target.value = "";
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => {
      const updated = prev.filter((_, i) => i !== indexToRemove);
      setImageUrl(updated[0] || "");
      return updated;
    });
    toast.info("تم حذف الصفحة");
  };

  const resetForm = () => {
    setEditingQuiz(null);
    setTitle("");
    setDescription("");
    setGrade("عام لجميع الطلاب");
    setPublished(true);
    setMaxAttempts(1);
    setDurationMinutes(0);
    setStartDate("");
    setEndDate("");
    setImageUrl("");
    setImages([]);
    setQuestions([
      createDefaultQuestion(0),
      createDefaultQuestion(1),
      createDefaultQuestion(2),
      createDefaultQuestion(3),
      createDefaultQuestion(4),
    ]);
  };

  const handleOpenEdit = (quiz: any) => {
    setEditingQuiz(quiz);
    setTitle(quiz.title || "");
    setDescription(quiz.parsedDescription || "");
    setGrade("عام لجميع الطلاب");
    setPublished(quiz.published ?? true);
    setMaxAttempts(quiz.maxAttempts || 1);
    setDurationMinutes(quiz.durationMinutes || 0);
    setStartDate(quiz.startDate || "");
    setEndDate(quiz.endDate || "");
    const loadedImages =
      Array.isArray(quiz.images) && quiz.images.length > 0
        ? quiz.images
        : quiz.imageUrl
          ? [quiz.imageUrl]
          : [];
    setImages(loadedImages);
    setImageUrl(loadedImages[0] || quiz.imageUrl || "");
    setQuestions(
      quiz.questions && quiz.questions.length > 0
        ? quiz.questions
        : [
            createDefaultQuestion(0),
            createDefaultQuestion(1),
            createDefaultQuestion(2),
            createDefaultQuestion(3),
            createDefaultQuestion(4),
          ],
    );
    setIsOpen(true);
  };

  const handleAddSingleQuestion = () => {
    setQuestions((prev) => [...prev, createDefaultQuestion(prev.length)]);
  };

  const handleBulkAddQuestions = (count: number) => {
    setQuestions((prev) => {
      const currentCount = prev.length;
      const newItems = Array.from({ length: count }, (_, idx) =>
        createDefaultQuestion(currentCount + idx),
      );
      return [...prev, ...newItems];
    });
    toast.success(`تمت إضافة ${count} أسئلة بنجاح مرتبة تسلسلياً`);
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions((prev) => {
      const filtered = prev.filter((q) => q.id !== id);
      return filtered.map((q, idx) => ({
        ...q,
        text: q.text.startsWith("السؤال") ? getQuestionTitle(idx) : q.text,
      }));
    });
  };

  const handleQuestionChange = (id: string, field: string, value: any) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, [field]: value } : q)));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessingImages) {
      toast.info("يرجى الانتظار حتى يكتمل تجهيز الصور...");
      return;
    }
    if (questions.length === 0) {
      toast.error("يرجى إضافة سؤال واحد على الأقل لنموذج الإجابة");
      return;
    }
    setIsSaving(true);
    try {
      await saveQuizFn({
        data: {
          id: editingQuiz?.id,
          title,
          description,
          imageUrl: images[0] || imageUrl || "",
          images,
          grade: "عام لجميع الطلاب",
          published,
          maxAttempts,
          durationMinutes,
          startDate,
          endDate,
          questions,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["admin-quizzes"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("تم حفظ التدريب ونموذج الإجابة بنجاح");
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
        queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
        toast.success("تم حذف التدريب بنجاح");
      } catch (err: any) {
        toast.error(err.message || "حدث خطأ أثناء الحذف");
      }
    }
  };

  return (
    <>
      <PageHeader
        title="إدارة التدريبات والاختبارات"
        desc="ارفع صورة ورقة الامتحان وحدد الإجابات الصحيحة (أ، ب، ج، د) للتصحيح التلقائي المباشر."
        action={
          <Button
            onClick={() => {
              resetForm();
              setIsOpen(true);
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="ml-2 size-4" /> إضافة تدريب جديد
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
            أضف اختباراً جديداً عبر رفع صورة ورقة الأسئلة وتحديد نموذج الإجابة (أ، ب، ج، د).
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
                    متاح لجميع الطلاب
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

                {((qz.images && qz.images.length > 0) || qz.imageUrl) && (
                  <div className="mt-3 relative rounded-lg overflow-hidden border bg-muted/40 h-28 flex items-center justify-center">
                    <img
                      src={qz.images?.[0] || qz.imageUrl}
                      alt={qz.title}
                      className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition"
                      onClick={() => setPreviewImageModal(qz.images?.[0] || qz.imageUrl)}
                    />
                    <span className="absolute bottom-1 right-1 text-[10px] bg-slate-900/80 text-white px-2 py-0.5 rounded backdrop-blur-xs flex items-center gap-1 font-semibold">
                      <ImageIcon className="size-3 text-gold" />
                      {qz.images && qz.images.length > 1
                        ? `${qz.images.length} أوراق للامتحان`
                        : "ورقة الامتحان مرفقة"}
                    </span>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-primary">
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-primary">
              {editingQuiz
                ? "تعديل التدريب والأسئلة"
                : "إضافة تدريب جديد (ورقة الامتحان ونموذج الإجابة)"}
            </DialogTitle>
            <DialogDescription>
              ارفع صورة ورقة الامتحان، ثم حدد الإجابات الصحيحة (أ، ب، ج، د) لكل سؤال لتفعيل التصحيح
              التلقائي.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-6 mt-2">
            {/* Basic Info */}
            <div className="space-y-4 rounded-xl border p-4 bg-secondary/20">
              <h3 className="font-bold text-foreground">بيانات الامتحان وإعدادات الوقت</h3>
              <div>
                <Label>عنوان التدريب / الاختبار</Label>
                <Input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: تدريب الفصل الأول - تاريخ ثانوية عامة"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>نطاق النشر والطلاب</Label>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 text-sm font-semibold">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    متاح لجميع الطلاب تلقائياً (الصف الأول والثاني والثالث الثانوي)
                  </div>
                </div>
                <div>
                  <Label>عدد محاولات الاختبار المسموحة للطالب</Label>
                  <Input
                    type="number"
                    min={1}
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 1)}
                    placeholder="مثال: 1 أو 2"
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
                <Label>تعليمات أو وصف الاختبار للطلاب</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="اطلع على ورقة الأسئلة المرفقة بعناية ثم ظلل الإجابة الصحيحة لكل سؤال أدناه..."
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border p-3 bg-card">
                <Label htmlFor="pub-quiz" className="cursor-pointer font-medium">
                  نشر التدريب للطلاب الآن
                </Label>
                <Switch id="pub-quiz" checked={published} onCheckedChange={setPublished} />
              </div>
            </div>

            {/* Exam Paper Images Upload (Supports 1 or multiple sheets/pages) */}
            <div className="space-y-4 rounded-xl border-2 border-dashed border-gold/40 p-5 bg-card shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-foreground flex items-center gap-2">
                    <ImageIcon className="size-5 text-gold" /> أوراق الامتحان المصوّرة (
                    {images.length} {images.length === 1 ? "ورقة" : "أوراق"})
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    يمكنك رفع صورة واحدة أو عدة صور للامتحان إذا كان مكوّناً من عدة صفحات.
                  </p>
                </div>
                <label
                  className={`cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold px-4 py-2 rounded-lg transition inline-flex items-center gap-2 shadow-sm ${
                    isProcessingImages ? "opacity-60 pointer-events-none" : ""
                  }`}
                >
                  {isProcessingImages ? (
                    <>
                      <Loader2 className="size-4 animate-spin text-gold" />
                      جاري ضغط وتجهيز الصور...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="size-4" />
                      {images.length > 0 ? "إضافة ورقة / صفحة أخرى" : "رفع أوراق الامتحان"}
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={isProcessingImages}
                    className="hidden"
                    onChange={handleImagesUpload}
                  />
                </label>
              </div>

              {images.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative rounded-xl overflow-hidden border bg-muted/30 group flex flex-col justify-between shadow-sm"
                    >
                      <div className="relative h-44 flex items-center justify-center p-2 bg-slate-950/5">
                        <img
                          src={img}
                          alt={`ورقة الامتحان - صفحة ${idx + 1}`}
                          className="max-h-full max-w-full object-contain cursor-pointer transition group-hover:scale-105"
                          onClick={() => setPreviewImageModal(img)}
                        />
                        <span className="absolute top-2 right-2 text-xs font-bold px-2.5 py-1 rounded-md bg-slate-900/85 text-gold shadow">
                          الصفحة {idx + 1}
                        </span>
                      </div>
                      <div className="p-2 border-t bg-card/90 flex items-center justify-between gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setPreviewImageModal(img)}
                          className="text-xs h-7 px-2"
                        >
                          عرض مكبّر
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRemoveImage(idx)}
                          className="text-xs h-7 px-2"
                        >
                          حذف الصفحة
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-muted-foreground border rounded-lg bg-secondary/20 space-y-2">
                  <ImageIcon className="size-8 mx-auto text-muted-foreground opacity-50" />
                  <p>لم يتم رفع أي ورقة امتحان بعد.</p>
                  <p className="text-[11px] text-muted-foreground/80">
                    اضغط على زر "رفع أوراق الامتحان" لاختيار ورقة أو عدة ورقات دفعة واحدة.
                  </p>
                </div>
              )}
            </div>

            {/* Questions / Answer Sheet Section */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between border-b pb-3 gap-2">
                <div>
                  <h3 className="font-bold text-foreground flex items-center gap-2">
                    <HelpCircle className="size-5 text-primary" /> نموذج الإجابة والتصحيح التلقائي
                    (أ، ب، ج، د)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    إجمالي الأسئلة: {questions.length} | حدد الإجابة الصحيحة بالضغط على الرمز (أ أو
                    ب أو ج أو د).
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 items-center">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddSingleQuestion}
                    className="bg-primary text-primary-foreground text-xs"
                  >
                    + إضافة سؤال
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAddQuestions(5)}
                    className="text-xs"
                  >
                    + 5 أسئلة
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAddQuestions(10)}
                    className="text-xs"
                  >
                    + 10 أسئلة
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAddQuestions(20)}
                    className="text-xs"
                  >
                    + 20 سؤال
                  </Button>
                  {questions.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (confirm("هل تريد تصفير كافة الأسئلة؟")) setQuestions([]);
                      }}
                      className="text-xs"
                    >
                      مسح الكل
                    </Button>
                  )}
                </div>
              </div>

              {questions.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-xl">
                  لا توجد أسئلة مضافة حالياً. اضغط على أزرار الإضافة السريعة بالأعلى لتوليد الأسئلة.
                </div>
              ) : (
                <div className="space-y-3">
                  {questions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="rounded-xl border p-4 bg-card shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition hover:border-gold/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center size-8 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-bold text-foreground text-sm">
                            {q.text || getQuestionTitle(idx)}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">الدرجة:</span>
                            <input
                              type="number"
                              min={1}
                              value={q.points || 1}
                              onChange={(e) =>
                                handleQuestionChange(q.id, "points", parseInt(e.target.value) || 1)
                              }
                              className="w-16 rounded border px-2 py-0.5 text-xs text-center font-bold text-primary"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Options selection: أ ب ج د */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground ml-1">
                          الإجابة الصحيحة:
                        </span>
                        {DEFAULT_OPTIONS.map((opt) => {
                          const isSelected = q.correctAnswer === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => handleQuestionChange(q.id, "correctAnswer", opt)}
                              className={`size-10 rounded-xl font-bold text-base transition flex items-center justify-center border-2 ${
                                isSelected
                                  ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                                  : "bg-secondary/40 text-foreground border-border hover:border-primary/50"
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}

                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveQuestion(q.id)}
                          className="text-destructive hover:bg-destructive/10 mr-2 size-8"
                          title="حذف هذا السؤال"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isSaving} className="font-bold">
                {isSaving && <Loader2 className="ml-2 size-4 animate-spin" />}
                حفظ ونشر التدريب
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Full image preview modal */}
      {previewImageModal && (
        <Dialog open={!!previewImageModal} onOpenChange={() => setPreviewImageModal(null)}>
          <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">ورقة الامتحان المصوّرة</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center mt-2">
              <img
                src={previewImageModal}
                alt="ورقة الامتحان"
                className="max-w-full h-auto rounded-lg shadow-lg"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
