/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Megaphone, Star, BarChart2, Loader2, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { getPlatformPostsFn, votePollFn, submitPlatformRatingFn } from "@/lib/admin-server";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/student/posts")({
  head: () => ({
    meta: [
      { title: "منشورات المنصة والاستطلاعات | منصة الإبحار" },
      { name: "description", content: "تابع الإعلانات الرسمية وشارك في استطلاعات الرأي وتقييم المنصة." },
      { property: "og:title", content: "منشورات المنصة والاستطلاعات | منصة الإبحار" },
      { property: "og:description", content: "منشورات واستطلاعات الرأي وتقييمات الطلاب." },
    ],
  }),
  loader: async () => {
    try {
      return await getPlatformPostsFn();
    } catch {
      return [];
    }
  },
  component: StudentPosts,
});

function StudentPosts() {
  const queryClient = useQueryClient();
  const initialData = Route.useLoaderData();
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["student-platform-posts"],
    queryFn: () => getPlatformPostsFn(),
    initialData,
  });

  const [ratingStars, setRatingStars] = useState<Record<string, number>>({});
  const [ratingComments, setRatingComments] = useState<Record<string, string>>({});

  const voteMutation = useMutation({
    mutationFn: (vars: { postId: string; option: string }) => votePollFn({ data: vars }),
    onSuccess: () => {
      toast.success("تم تسجيل صوتك بنجاح");
      queryClient.invalidateQueries({ queryKey: ["student-platform-posts"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "حدث خطأ أثناء التصويت");
    },
  });

  const ratingMutation = useMutation({
    mutationFn: (vars: { postId: string; stars: number; comment?: string }) =>
      submitPlatformRatingFn({ data: vars }),
    onSuccess: () => {
      toast.success("شكراً لتقييمك! تم إرسال تقييمك بنجاح");
      queryClient.invalidateQueries({ queryKey: ["student-platform-posts"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "حدث خطأ أثناء إرسال التقييم");
    },
  });

  const handleVote = (postId: string, option: string) => {
    voteMutation.mutate({ postId, option });
  };

  const handleRateSubmit = (postId: string) => {
    const stars = ratingStars[postId] || 5;
    const comment = ratingComments[postId] || "";
    ratingMutation.mutate({ postId, stars, comment });
  };

  return (
    <>
      <PageHeader
        title="منشورات المنصة والاستطلاعات"
        desc="تابع أحدث الإعلانات والتنبيهات، شارك في استطلاعات الرأي، وقيم المنصة."
      />

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center shadow-card">
          <Megaphone className="mx-auto size-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-bold text-primary">لا توجد منشورات حالياً</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            ستظهر هنا الإعلانات واستطلاعات الرأي فور نشرها من قبل الإدارة.
          </p>
        </div>
      ) : (
        <div className="space-y-6 max-w-3xl mx-auto">
          {posts.map((p: any) => {
            if (p.type === "announcement") {
              return (
                <div key={p.id} className="rounded-2xl border bg-card p-6 md:p-8 shadow-card space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary">
                      إعلان المنصة
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("ar-EG")}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-foreground">{p.title}</h2>
                  {p.content && (
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap pt-2">
                      {p.content}
                    </p>
                  )}
                </div>
              );
            }

            if (p.type === "poll") {
              const totalVotes = p.votes
                ? Object.values(p.votes).reduce((acc: number, v: any) => acc + (Array.isArray(v) ? v.length : 0), 0)
                : 0;

              return (
                <div key={p.id} className="rounded-2xl border bg-card p-6 md:p-8 shadow-card space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-accent/10 text-accent-foreground">
                      استطلاع رأي تفاعلي
                    </span>
                    <span className="text-xs text-muted-foreground">
                      إجمالي المشاركين: {totalVotes} طالب
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-foreground">{p.title}</h2>
                  {p.content && <p className="text-sm text-muted-foreground">{p.content}</p>}

                  <div className="space-y-3 pt-2">
                    {p.options?.map((opt: string, idx: number) => {
                      const optVotes = Array.isArray(p.votes?.[opt]) ? p.votes[opt].length : 0;
                      const pct = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;

                      return (
                        <div key={idx} className="bg-secondary/40 border p-3.5 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm text-foreground">{opt}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleVote(p.id, opt)}
                              className="border-primary/40 text-primary hover:bg-primary/10 text-xs"
                            >
                              تصويت لهذا الخيار
                            </Button>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                              <div className="bg-primary h-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs font-bold text-primary min-w-[45px] text-left">{pct}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            if (p.type === "rating") {
              const ratingsList = p.ratings || [];
              const avgRating =
                ratingsList.length > 0
                  ? (ratingsList.reduce((acc: number, r: any) => acc + (r.stars || 0), 0) / ratingsList.length).toFixed(1)
                  : "0.0";

              return (
                <div key={p.id} className="rounded-2xl border bg-card p-6 md:p-8 shadow-card space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-800">
                      تقييم المنصة
                    </span>
                    <div className="flex items-center gap-1.5 text-amber-500 font-bold text-sm">
                      <Star className="size-4 fill-amber-400" /> {avgRating} ({ratingsList.length} تقييم)
                    </div>
                  </div>
                  <h2 className="text-xl font-bold text-foreground">{p.title}</h2>
                  {p.content && <p className="text-sm text-muted-foreground">{p.content}</p>}

                  <div className="bg-secondary/30 border p-5 rounded-xl space-y-4">
                    <p className="text-xs font-bold text-foreground">شاركنا تقييمك للمنصة بنجوم:</p>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const currentStars = ratingStars[p.id] || 5;
                        const isSelected = star <= currentStars;
                        return (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRatingStars({ ...ratingStars, [p.id]: star })}
                            className="transition hover:scale-110 focus:outline-none"
                          >
                            <Star
                              className={`size-8 ${
                                isSelected ? "fill-amber-400 text-amber-500" : "text-muted-foreground"
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>

                    <div className="space-y-2">
                      <Textarea
                        placeholder="اكتب تعليقك أو مقترحاتك لتطوير المنصة (اختياري)..."
                        value={ratingComments[p.id] || ""}
                        onChange={(e) => setRatingComments({ ...ratingComments, [p.id]: e.target.value })}
                        rows={3}
                      />
                    </div>

                    <Button
                      onClick={() => handleRateSubmit(p.id)}
                      disabled={ratingMutation.isPending}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
                    >
                      {ratingMutation.isPending && <Loader2 className="ml-2 size-4 animate-spin" />}
                      إرسال التقييم
                    </Button>
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>
      )}
    </>
  );
}
