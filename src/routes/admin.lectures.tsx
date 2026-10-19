import { createFileRoute } from "@tanstack/react-router";
import { PlayCircle } from "lucide-react";
import { AdminPage, adminHead } from "@/components/AdminPage";

export const Route = createFileRoute("/admin/lectures")({
  head: adminHead("إدارة المحاضرات", "رفع وتنظيم المحاضرات المصوّرة."),
  component: () => (
    <AdminPage
      title="إدارة المحاضرات"
      desc="أضف المحاضرات ورتّبها حسب الوحدات والفصول."
      action="+ إضافة محاضرة"
      icon={PlayCircle}
      emptyTitle="لم تُضف أي محاضرة بعد"
      emptyText="رفع الفيديوهات غير مفعّل حاليًا، وسيعمل بعد تجهيز مساحة التخزين."
    />
  ),
});
