import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { AdminPage, adminHead } from "@/components/AdminPage";

export const Route = createFileRoute("/admin/students")({
  head: adminHead("حسابات الطلاب", "إنشاء وإدارة حسابات الطلاب."),
  component: () => (
    <AdminPage
      title="حسابات الطلاب"
      desc="أنشئ حسابات الطلاب وامنحهم رقم المستخدم وكلمة المرور."
      action="+ إضافة طالب"
      icon={Users}
      emptyTitle="لا يوجد طلاب مسجّلون"
      emptyText="الإدارة وحدها تنشئ الحسابات. ستتمكن من إضافة الطلاب وتعديل بياناتهم وإيقاف الحسابات بعد ربط الخادم."
    />
  ),
});
