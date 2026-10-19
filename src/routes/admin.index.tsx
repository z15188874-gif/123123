import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, ClipboardList, PlayCircle, Users } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { adminHead } from "@/components/AdminPage";

export const Route = createFileRoute("/admin/")({
  head: adminHead("نظرة عامة", "لوحة تحكم المسؤول في منصة الإبحار."),
  component: AdminHome,
});

function AdminHome() {
  const stats = [
    { to: "/admin/students", label: "الطلاب", icon: Users },
    { to: "/admin/lectures", label: "المحاضرات", icon: PlayCircle },
    { to: "/admin/exercises", label: "التدريبات", icon: ClipboardList },
    { to: "/admin/results", label: "النتائج المسجّلة", icon: BarChart3 },
  ] as const;
  return (
    <>
      <PageHeader title="مرحبًا أ. سعيد" desc="إدارة الطلاب والمحتوى التعليمي من مكان واحد." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className="rounded-2xl border bg-card p-5 shadow-card transition hover:border-gold"
          >
            <s.icon className="size-6 text-gold" />
            <p className="mt-3 text-3xl font-bold text-primary">—</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </Link>
        ))}
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        ستظهر الأرقام الفعلية بعد ربط قاعدة البيانات.
      </p>
    </>
  );
}
