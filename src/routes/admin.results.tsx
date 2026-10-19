import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { AdminPage, adminHead } from "@/components/AdminPage";

export const Route = createFileRoute("/admin/results")({
  head: adminHead("نتائج الطلاب", "متابعة درجات الطلاب في الاختبارات."),
  component: () => (
    <AdminPage
      title="نتائج الطلاب"
      desc="تابع درجات الطلاب ومستوى تقدّمهم."
      icon={BarChart3}
      emptyTitle="لا توجد نتائج بعد"
      emptyText="ستظهر نتائج كل طالب هنا تلقائيًا بعد أداء الاختبارات."
    />
  ),
});
