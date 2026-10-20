import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, PlayCircle } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { ProfilesSection } from "@/components/DeveloperCard";

export const Route = createFileRoute("/student/")({
  head: () => ({
    meta: [
      { title: "لوحة الطالب | منصة الإبحار" },
      { name: "description", content: "الوصول إلى المحاضرات المصوّرة والتدريبات في مادة التاريخ." },
      { property: "og:title", content: "لوحة الطالب | منصة الإبحار" },
      { property: "og:description", content: "محاضرات وتدريبات التاريخ في مكان واحد." },
    ],
  }),
  component: StudentHome,
});

function StudentHome() {
  const cards = [
    {
      to: "/student/lectures",
      icon: PlayCircle,
      title: "المحاضرات المصوّرة",
      text: "شاهد شروح الدروس مرتبةً حسب الوحدات والفصول.",
    },
    {
      to: "/student/quizzes",
      icon: ClipboardList,
      title: "التدريبات والاختبارات",
      text: "اختبر فهمك بأسئلة متنوعة وتابع نتائجك.",
    },
  ] as const;
  return (
    <>
      <PageHeader title="أهلًا بك في رحلة الإبحار" desc="اختر القسم الذي تريد البدء به." />
      <div className="grid gap-5 md:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="group rounded-2xl border bg-card p-6 shadow-card transition hover:-translate-y-1 hover:border-gold"
          >
            <span className="grid size-12 place-items-center rounded-xl bg-primary text-gold">
              <c.icon className="size-6" />
            </span>
            <h2 className="mt-4 text-xl font-bold text-primary">{c.title}</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{c.text}</p>
            <span className="mt-4 inline-block text-sm font-bold text-primary group-hover:text-accent-foreground">
              الدخول إلى القسم ←
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <ProfilesSection />
      </div>
    </>
  );
}


