/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { PlayCircle, ExternalLink, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { getStudentContentFn } from "@/lib/admin-server";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/student/lectures")({
  head: () => ({
    meta: [
      { title: "المحاضرات المصوّرة | منصة الإبحار" },
      { name: "description", content: "محاضرات التاريخ المصوّرة مع الأستاذ سعيد مطر." },
      { property: "og:title", content: "المحاضرات المصوّرة | منصة الإبحار" },
      { property: "og:description", content: "شروح مصوّرة لدروس التاريخ." },
    ],
  }),
  loader: async () => {
    try {
      return await getStudentContentFn();
    } catch {
      return { lessons: [], quizzes: [] };
    }
  },
  component: StudentLectures,
});

function StudentLectures() {
  const initialData = Route.useLoaderData();
  const { data, isLoading } = useQuery({
    queryKey: ["student-content"],
    queryFn: () => getStudentContentFn(),
    initialData,
  });

  const lessons = data?.lessons || [];

  return (
    <>
      <PageHeader title="المحاضرات المصوّرة" desc="شروح الدروس المصوّرة لجميع الوحدات." />

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : lessons.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center shadow-card">
          <PlayCircle className="mx-auto size-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-bold text-primary">لا توجد محاضرات منشورة بعد</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            ستظهر هنا المحاضرات التي يضيفها الأستاذ سعيد مطر تباعاً.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {lessons.map((les: any) => (
            <div
              key={les.id}
              className="rounded-2xl border bg-card p-6 shadow-card flex flex-col justify-between"
            >
              <div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  متاح لجميع الصفوف
                </span>
                <h3 className="mt-3 text-xl font-bold text-foreground">{les.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {les.description || "لا يوجد وصف مختصر."}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {new Date(les.created_at).toLocaleDateString("ar-EG")}
                </span>
                {les.video_url ? (
                  <Button
                    asChild
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <a href={les.video_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="ml-2 size-4" /> مشاهدة الدرس
                    </a>
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">قريباً رفع الفيديو</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
