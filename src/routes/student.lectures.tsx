import { createFileRoute } from "@tanstack/react-router";
import { PlayCircle } from "lucide-react";
import { PageHeader, PendingBackend } from "@/components/AppShell";

export const Route = createFileRoute("/student/lectures")({
  head: () => ({
    meta: [
      { title: "المحاضرات المصوّرة | منصة الإبحار" },
      { name: "description", content: "محاضرات التاريخ المصوّرة مع الأستاذ سعيد مطر." },
      { property: "og:title", content: "المحاضرات المصوّرة | منصة الإبحار" },
      { property: "og:description", content: "شروح مصوّرة لدروس التاريخ." },
    ],
  }),
  component: () => (
    <>
      <PageHeader title="المحاضرات المصوّرة" desc="شروح الدروس مرتبة حسب الوحدات." />
      <PendingBackend
        icon={PlayCircle}
        title="لا توجد محاضرات بعد"
        text="ستظهر هنا المحاضرات التي يضيفها الأستاذ، مثل: «الحضارة المصرية القديمة» و«الدولة العثمانية»."
      />
    </>
  ),
});
