/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PlayCircle, Plus, Trash2, Edit, Loader2, Eye, EyeOff } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { adminHead } from "@/components/AdminPage";
import { getLessonsFn, saveLessonFn, deleteLessonFn } from "@/lib/admin-server";
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

export const Route = createFileRoute("/admin/lectures")({
  head: adminHead("إدارة المحاضرات", "رفع وتنظيم المحاضرات المصوّرة."),
  loader: async () => {
    try {
      return await getLessonsFn();
    } catch {
      return [];
    }
  },
  component: AdminLectures,
});

function AdminLectures() {
  const queryClient = useQueryClient();
  const initialData = Route.useLoaderData();
  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ["admin-lessons"],
    queryFn: () => getLessonsFn(),
    initialData,
  });

  const [isOpen, setIsOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [grade, setGrade] = useState("عام لجميع الطلاب");
  const [videoUrl, setVideoUrl] = useState("");
  const [published, setPublished] = useState(true);

  const saveMutation = useMutation({
    mutationFn: (vars: any) => saveLessonFn({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-lessons"] });
      toast.success("تم حفظ المحاضرة بنجاح");
      setIsOpen(false);
      resetForm();
    },
    onError: (err: Error) => {
      toast.error(err.message || "حدث خطأ أثناء حفظ المحاضرة");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (vars: any) => deleteLessonFn({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-lessons"] });
      toast.success("تم حذف المحاضرة بنجاح");
    },
    onError: (err: Error) => {
      toast.error(err.message || "حدث خطأ أثناء الحذف");
    },
  });

  const resetForm = () => {
    setEditingLesson(null);
    setTitle("");
    setDescription("");
    setGrade("عام لجميع الطلاب");
    setPublished(true);
  };

  const handleOpenEdit = (lesson: any) => {
    setEditingLesson(lesson);
    setTitle(lesson.title || "");
    setDescription(lesson.description || "");
    setGrade("عام لجميع الطلاب");
    setVideoUrl(lesson.video_url || "");
    setPublished(lesson.published ?? true);
    setIsOpen(true);
  };

  return (
    <>
      <PageHeader
        title="إدارة المحاضرات"
        desc="أضف المحاضرات ورتّبها حسب الصفوف والوحدات."
        action={
          <Button
            onClick={() => {
              resetForm();
              setIsOpen(true);
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="ml-2 size-4" /> إضافة محاضرة
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : lessons.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center shadow-card">
          <PlayCircle className="mx-auto size-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-bold text-primary">لم تُضف أي محاضرة بعد</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            أنشئ أول محاضرة وابدأ برفع الروابط ومشاركة الشروحات مع طلابك.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lessons.map((les: any) => (
            <div
              key={les.id}
              className="rounded-2xl border bg-card p-5 shadow-card flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                    متاح لجميع الطلاب
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      les.published
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {les.published ? "منشور" : "مسودة"}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-bold text-foreground">{les.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {les.description || "لا يوجد وصف مختصر."}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t pt-4">
                <span className="text-xs text-muted-foreground">
                  {new Date(les.created_at).toLocaleDateString("ar-EG")}
                </span>
                <div className="space-x-2 space-x-reverse">
                  <Button size="sm" variant="outline" onClick={() => handleOpenEdit(les)}>
                    <Edit className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (confirm("هل أنت متأكد من حذف هذه المحاضرة؟")) {
                        deleteMutation.mutate({ id: les.id });
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

      {/* Add/Edit Lesson Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-primary">
              {editingLesson ? "تعديل المحاضرة" : "إضافة محاضرة جديدة"}
            </DialogTitle>
            <DialogDescription>أدخل تفاصيل المحاضرة ورابط الفيديو.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate({
                id: editingLesson?.id,
                title,
                description,
                grade: "عام لجميع الطلاب",
                videoUrl,
                published,
              });
            }}
            className="space-y-4 mt-2"
          >
            <div>
              <Label>عنوان المحاضرة</Label>
              <Input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: الحملة الفرنسية على مصر"
              />
            </div>
            <div>
              <Label>نطاق النشر والطلاب</Label>
              <div className="flex items-center gap-2 p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 text-sm font-semibold">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
                متاح لجميع الطلاب تلقائياً (الصف الأول والثاني والثالث الثانوي)
              </div>
            </div>
            <div>
              <Label>رابط الفيديو (يوتيوب أو رابط مباشر)</Label>
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
            <div>
              <Label>وصف المحاضرة</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="تفاصيل الدرس ومحتواه..."
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border p-3">
              <Label htmlFor="pub-switch" className="cursor-pointer font-medium">
                نشر المحاضرة للطلاب
              </Label>
              <Switch id="pub-switch" checked={published} onCheckedChange={setPublished} />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="ml-2 size-4 animate-spin" />}
                حفظ المحاضرة
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
