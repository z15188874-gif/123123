import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, Plus, Trash2, Edit, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { adminHead } from "@/components/AdminPage";
import { getQuizzesFn, saveQuizFn, deleteQuizFn } from "@/lib/admin-server";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  head: adminHead("إدارة التدريبات", "إنشاء وإدارة التدريبات والاختبارات."),
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

  const saveMutation = useMutation({
    mutationFn: saveQuizFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-quizzes"] });
      toast.success("تم حفظ التدريب بنجاح");
      setIsOpen(false);
      resetForm();
    },
    onError: (err: Error) => {
      toast.error(err.message || "حدث خطأ أثناء حفظ التدريب");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteQuizFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-quizzes"] });
      toast.success("تم حذف التدريب بنجاح");
    },
    onError: (err: Error) => {
      toast.error(err.message || "حدث خطأ أثناء الحذف");
    },
  });

  const resetForm = () => {
    setEditingQuiz(null);
    setTitle("");
    setDescription("");
    setGrade("");
    setPublished(false);
  };

  const handleOpenEdit = (quiz: any) => {
    setEditingQuiz(quiz);
    setTitle(quiz.title || "");
    setDescription(quiz.description || "");
    setGrade(quiz.grade || "");
    setPublished(quiz.published ?? false);
    setIsOpen(true);
  };

  return (
    <>
      <PageHeader
        title="إدارة التدريبات"
        desc="أنشئ الاختبارات والتدريبات لقياس مستوى الطلاب."
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
            أضف اختباراً جديداً لتقييم تحصيل الطلاب وتدريبهم على أسئلة الامتحانات.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((qz: any) => (
            <div key={qz.id} className="rounded-2xl border bg-card p-5 shadow-card flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                    {qz.grade || "عام"}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      qz.published ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {qz.published ? "منشور" : "مسودة"}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-bold text-foreground">{qz.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {qz.description || "لا يوجد وصف مختصر."}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t pt-4">
                <span className="text-xs text-muted-foreground">
                  {new Date(qz.created_at).toLocaleDateString("ar-EG")}
                </span>
                <div className="space-x-2 space-x-reverse">
                  <Button size="sm" variant="outline" onClick={() => handleOpenEdit(qz)}>
                    <Edit className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (confirm("هل أنت متأكد من حذف هذا التدريب؟")) {
                        deleteMutation.mutate({ id: qz.id });
                      }
                    }}
                  >
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
        <DialogContent className="text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-primary">
              {editingQuiz ? "تعديل التدريب" : "إضافة تدريب جديد"}
            </DialogTitle>
            <DialogDescription>أدخل عنوان التدريب ووصفه للصف الدراسي.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate({
                id: editingQuiz?.id,
                title,
                description,
                grade,
                published,
              });
            }}
            className="space-y-4 mt-2"
          >
            <div>
              <Label>عنوان التدريب / الاختبار</Label>
              <Input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: اختبار الفصل الأول"
              />
            </div>
            <div>
              <Label>الصف الدراسي</Label>
              <Input
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="مثال: الصف الثالث الثانوي"
              />
            </div>
            <div>
              <Label>تعليمات أو وصف التدريب</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="أجب عن الأسئلة التالية بدقة..."
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border p-3">
              <Label htmlFor="pub-quiz" className="cursor-pointer font-medium">
                نشر التدريب للطلاب
              </Label>
              <Switch
                id="pub-quiz"
                checked={published}
                onCheckedChange={setPublished}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="ml-2 size-4 animate-spin" />}
                حفظ التدريب
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
