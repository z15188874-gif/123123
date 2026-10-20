import { createFileRoute } from "@tanstack/react-router";
import { Settings, Shield, Globe } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { adminHead } from "@/components/AdminPage";

export const Route = createFileRoute("/admin/settings")({
  head: adminHead("إعدادات المنصة", "إعدادات منصة الإبحار العامة."),
  component: AdminSettings,
});

function AdminSettings() {
  return (
    <>
      <PageHeader
        title="إعدادات المنصة"
        desc="معلومات عامة حول منصة الأستاذ سعيد مطر التعليمية وإعدادات الأمان."
      />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border bg-card p-6 shadow-card">
          <div className="flex items-center gap-3 text-primary">
            <Globe className="size-6" />
            <h2 className="text-xl font-bold">هوية المنصة</h2>
          </div>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            اسم المنصة: <span className="font-bold text-foreground">منصة الأستاذ سعيد مطر</span>
          </p>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            المادة التعليمية: <span className="font-bold text-foreground">التاريخ والجغرافيا</span>
          </p>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            المسؤول والمحاضر: <span className="font-bold text-foreground">أ. سعيد سيد عبد الفتاح مطر</span>
          </p>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            قائد التطوير والبرمجة: <span className="font-bold text-foreground">م. زياد علي محمد خزيم (القائد)</span>
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-card">
          <div className="flex items-center gap-3 text-primary">
            <Shield className="size-6" />
            <h2 className="text-xl font-bold">الأمان والصلاحيات</h2>
          </div>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            النظام محمي بالكامل عبر مصادقة Supabase وسلسلة إجراءات الأمان على الخادم (Server Functions & RLS).
          </p>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            الإدارة وحدها مخولة بإنشاء وحذف حسابات الطلاب لضمان أمان المنصة ووصول المحتوى للطلاب المصرح لهم فقط.
          </p>
        </div>
      </div>
    </>
  );
}
