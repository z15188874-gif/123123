import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, ClipboardList, PlayCircle, Users } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { adminHead } from "@/components/AdminPage";
import { getAdminStatsFn } from "@/lib/admin-server";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/admin/")({
  head: adminHead("نظرة عامة", "لوحة تحكم المسؤول في منصة الإبحار."),
  loader: async () => {
    try {
      return await getAdminStatsFn();
    } catch {
      return { studentsCount: 0, lessonsCount: 0, quizzesCount: 0, attemptsCount: 0 };
    }
  },
  component: AdminHome,
});

function AdminHome() {
  const initialData = Route.useLoaderData();
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => getAdminStatsFn(),
    initialData,
    refetchInterval: 10000,
  });

  const statCards = [
    { to: "/admin/students", label: "الطلاب المسجّلون", icon: Users, count: stats.studentsCount },
    { to: "/admin/lectures", label: "المحاضرات المصوّرة", icon: PlayCircle, count: stats.lessonsCount },
    { to: "/admin/exercises", label: "التدريبات والاختبارات", icon: ClipboardList, count: stats.quizzesCount },
    { to: "/admin/results", label: "النتائج المسجّلة", icon: BarChart3, count: stats.attemptsCount },
  ] as const;

  return (
    <>
      <PageHeader title="مرحبًا أ. سعيد" desc="إدارة الطلاب والمحتوى التعليمي من مكان واحد بكفاءة." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className="rounded-2xl border bg-card p-5 shadow-card transition hover:border-gold"
          >
            <s.icon className="size-6 text-gold" />
            <p className="mt-3 text-3xl font-bold text-primary">{s.count}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </Link>
        ))}
      </div>
      <div className="mt-8 rounded-2xl border bg-card p-6 shadow-card">
        <h2 className="text-lg font-bold text-primary">إحصاءات سريعة ونظام المنصة</h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          جميع وظائف الإدارة متصلة بقاعدة بيانات Supabase مباشرة. يمكنك إضافة الطلاب، رفع المحاضرات، إنشاء الاختبارات، ومتابعة درجات الطلاب بوضوح.
        </p>
      </div>
    </>
  );
}
