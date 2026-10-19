import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";
import { AdminPage, adminHead } from "@/components/AdminPage";

export const Route = createFileRoute("/admin/exercises")({
  head: adminHead("إدارة التدريبات", "إنشاء التدريبات والاختبارات."),
  component: () => (
    <AdminPage
      title="إدارة التدريبات"
      desc="أنشئ اختبارات بأسئلة اختيار من متعدد وصواب وخطأ."
      action="+ إنشاء اختبار"
      icon={ClipboardList}
      emptyTitle="لا توجد تدريبات"
      emptyText="ستتمكن من إنشاء الأسئلة وتحديد مواعيد الاختبارات بعد ربط قاعدة البيانات."
    />
  ),
});
