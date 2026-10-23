/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Megaphone,
  Plus,
  Trash2,
  Edit,
  Loader2,
  BarChart2,
  Star,
  CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { adminHead } from "@/components/AdminPage";
import { getPlatformPostsFn, savePlatformPostFn, deletePlatformPostFn } from "@/lib/admin-server";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/posts")({
  head: adminHead(
    "منشورات المنصة والاستطلاعات",
    "إنشاء وإدارة منشورات المنصة واستطلاعات الرأي وتقييمات الطلاب.",
  ),
  loader: async () => {
    try {
      return await getPlatformPostsFn();
    } catch {
      return [];
    }
  },
  component: AdminPosts,
});

function AdminPosts() {
  const queryClient = useQueryClient();
  const initialData = Route.useLoaderData();
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["admin-platform-posts"],
    queryFn: () => getPlatformPostsFn(),
    initialData,
  });

  const [isOpen, setIsOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<any | null>(null);

  const [title, setTitle] = useState("");
  const [type, setType] = useState("announcement"); // announcement, poll, rating
  const [content, setContent] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setEditingPost(null);
    setTitle("");
    setType("announcement");
    setContent("");
    setOptions(["", ""]);
  };

  const handleOpenEdit = (post: any) => {
    setEditingPost(post);
    setTitle(post.title || "");
    setType(post.type || "announcement");
    setContent(post.content || "");
    setOptions(post.options || ["", ""]);
    setIsOpen(true);
  };

  const handleAddOption = () => {
    setOptions([...options, ""]);
  };

  const handleOptionChange = (idx: number, val: string) => {
    const newOpts = [...options];
    newOpts[idx] = val;
    setOptions(newOpts);
  };

  const handleRemoveOption = (idx: number) => {
    setOptions(options.filter((_, i) => i !== idx));
  };

  const saveMutation = useMutation({
    mutationFn: (vars: any) => savePlatformPostFn({ data: vars }),
    onSuccess: () => {
      toast.success("تم حفظ المنشور/الاستطلاع بنجاح");
      queryClient.invalidateQueries({ queryKey: ["admin-platform-posts"] });
      setIsOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.message || "حدث خطأ أثناء الحفظ");
    },
    onSettled: () => {
      setIsSaving(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (vars: { id: string }) => deletePlatformPostFn({ data: vars }),
    onSuccess: () => {
      toast.success("تم حذف العنصر بنجاح");
      queryClient.invalidateQueries({ queryKey: ["admin-platform-posts"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "حدث خطأ أثناء الحذف");
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    saveMutation.mutate({
      id: editingPost?.id,
      title,
      type,
      content,
      options: type === "poll" ? options.filter((o) => o.trim() !== "") : undefined,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذا العنصر؟")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <>
      <PageHeader
        title="منشورات المنصة والاستطلاعات"
        desc="أنشئ الإعلانات العامة، استطلاعات الرأي التفاعلية، ووحدات تقييم المنصة للطلاب."
        action={
          <Button
            onClick={() => {
              resetForm();
              setIsOpen(true);
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="ml-2 size-4" /> إضافة عنصر جديد
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center shadow-card">
          <Megaphone className="mx-auto size-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-bold text-primary">
            لا توجد منشورات أو استطلاعات حالياً
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            أضف إعلاناً أو استطلاع رأي أو وحدة تقييم ليراها الطلاب في لوحاتهم.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p: any) => {
            const typeLabel =
              p.type === "poll"
                ? "استطلاع رأي"
                : p.type === "rating"
                  ? "تقييم المنصة"
                  : "منشور إعلاني";

            const totalVotes =
              p.type === "poll" && p.votes
                ? Object.values(p.votes).reduce(
                    (acc: number, v: any) => acc + (Array.isArray(v) ? v.length : 0),
                    0,
                  )
                : 0;

            const ratingsList = p.ratings || [];
            const avgRating =
              ratingsList.length > 0
                ? (
                    ratingsList.reduce((acc: number, r: any) => acc + (r.stars || 0), 0) /
                    ratingsList.length
                  ).toFixed(1)
                : "0.0";

            return (
              <div
                key={p.id}
                className="rounded-2xl border bg-card p-6 shadow-card flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                      {typeLabel}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("ar-EG")}
                    </span>
                  </div>

                  <h3 className="mt-3 text-xl font-bold text-foreground">{p.title}</h3>
                  {p.content && (
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {p.content}
                    </p>
                  )}

                  {p.type === "poll" && (
                    <div className="mt-4 space-y-2 border-t pt-3">
                      <p className="text-xs font-bold text-foreground">
                        خيارات الاستطلاع ({totalVotes} صوت):
                      </p>
                      {p.options?.map((opt: string, idx: number) => {
                        const optVotes = Array.isArray(p.votes?.[opt]) ? p.votes[opt].length : 0;
                        const pct = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;
                        return (
                          <div
                            key={idx}
                            className="bg-secondary/40 p-2.5 rounded-lg text-xs space-y-1"
                          >
                            <div className="flex justify-between font-medium">
                              <span>{opt}</span>
                              <span className="text-primary font-bold">
                                {optVotes} صوت ({pct}%)
                              </span>
                            </div>
                            <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-primary h-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {p.type === "rating" && (
                    <div className="mt-4 border-t pt-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Star className="size-5 fill-amber-400 text-amber-500" />
                        <span className="font-bold text-foreground text-lg">{avgRating} / 5</span>
                        <span className="text-xs text-muted-foreground">
                          ({ratingsList.length} تقييم)
                        </span>
                      </div>
                      {ratingsList.length > 0 && (
                        <div className="max-h-32 overflow-y-auto space-y-2 pt-2">
                          {ratingsList.map((r: any, rIdx: number) => (
                            <div
                              key={rIdx}
                              className="bg-secondary/30 p-2 rounded text-xs space-y-1"
                            >
                              <div className="flex justify-between font-semibold">
                                <span>{r.studentName}</span>
                                <span className="text-amber-500">{"★".repeat(r.stars)}</span>
                              </div>
                              {r.comment && <p className="text-muted-foreground">{r.comment}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 border-t pt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenEdit(p)}
                    className="gap-1.5"
                  >
                    <Edit className="size-3.5" /> تعديل
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(p.id)}
                    className="gap-1.5"
                  >
                    <Trash2 className="size-3.5" /> حذف
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary">
              {editingPost ? "تعديل العنصر" : "إضافة عنصر جديد في المنشورات والاستطلاعات"}
            </DialogTitle>
            <DialogDescription>
              اختر نوع العنصر (إعلان، استطلاع رأي، أو تقييم نجوم) واكتب التفاصيل.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="postType">نوع العنصر:</Label>
              <select
                id="postType"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-lg border bg-background p-2.5 text-sm font-medium"
              >
                <option value="announcement">منشور إعلاني (خبر / تنبيه)</option>
                <option value="poll">استطلاع رأي تفاعلي (اختيار من متعدد)</option>
                <option value="rating">وحدة تقييم المنصة (نجوم وتعليقات)</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="postTitle">العنوان أو السؤال:</Label>
              <Input
                id="postTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: إعلان هام بخصوص موعد الاختبار التجريبي..."
                required
              />
            </div>

            {type !== "rating" && (
              <div className="space-y-2">
                <Label htmlFor="postContent">المحتوى والتفاصيل:</Label>
                <Textarea
                  id="postContent"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="اكتب تفاصيل المنشور هنا..."
                  rows={4}
                />
              </div>
            )}

            {type === "poll" && (
              <div className="space-y-3 border-t pt-3">
                <div className="flex items-center justify-between">
                  <Label>خيارات الاستطلاع:</Label>
                  <Button type="button" size="sm" variant="outline" onClick={handleAddOption}>
                    + إضافة خيار
                  </Button>
                </div>
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={opt}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      placeholder={`الخيار ${idx + 1}`}
                      required
                    />
                    {options.length > 2 && (
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        onClick={() => handleRemoveOption(idx)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-primary text-primary-foreground"
              >
                {isSaving && <Loader2 className="ml-2 size-4 animate-spin" />}
                حفظ ونشر
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
