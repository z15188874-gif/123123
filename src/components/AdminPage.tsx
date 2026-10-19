import type { LucideIcon } from "lucide-react";
import { DisabledButton, PageHeader, PendingBackend } from "./AppShell";

export function AdminPage(p: {
  title: string;
  desc: string;
  action?: string;
  icon: LucideIcon;
  emptyTitle: string;
  emptyText: string;
}) {
  return (
    <>
      <PageHeader
        title={p.title}
        desc={p.desc}
        action={p.action ? <DisabledButton>{p.action}</DisabledButton> : undefined}
      />
      <PendingBackend icon={p.icon} title={p.emptyTitle} text={p.emptyText} />
    </>
  );
}

export const adminHead = (title: string, description: string) => () => ({
  meta: [
    { title: `${title} | إدارة منصة الإبحار` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} | منصة الإبحار` },
    { property: "og:description", content: description },
  ],
});
