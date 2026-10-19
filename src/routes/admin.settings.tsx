import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { AdminPage, adminHead } from "@/components/AdminPage";

export const Route = createFileRoute("/admin/settings")({
  head: adminHead("إعدادات المنصة", "إعدادات منصة الإبحار العامة."),
  component: () => (
    <AdminPage
      title="إعدادات المنصة"
      desc="اسم المنصة، رقم واتساب، وبيانات التواصل."
      icon={Settings}
      emptyTitle="الإعدادات غير متاحة بعد"
      emptyText="سيمكنك تعديل رقم واتساب الخاص بطلب الحسابات وبيانات المنصة بعد ربط الخادم."
    />
  ),
});
