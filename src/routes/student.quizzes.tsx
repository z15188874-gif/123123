import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";
import { PageHeader, PendingBackend } from "@/components/AppShell";

export const Route = createFileRoute("/student/quizzes")({
  head: () => ({
    meta: [
      { title: "التدريبات والاختبارات | منصة الإبحار" },
      { name: "description", content: "تدريبات واختبارات في مادة التاريخ." },
      { property: "og:title", content: "التدريبات والاختبارات | منصة الإبحار" },
      { property: "og:description", content: "اختبر فهمك لدروس التاريخ." },
    ],
  }),
  component: () => (
    <>
      <PageHeader title="التدريبات والاختبارات" desc="أسئلة متنوعة لقياس مستوى فهمك." />
      <PendingBackend
        icon={ClipboardList}
        title="لا توجد اختبارات متاحة"
        text="ستظهر هنا التدريبات بعد نشرها، مع نتيجتك فور الانتهاء من كل اختبار."
      />
    </>
  ),
});
