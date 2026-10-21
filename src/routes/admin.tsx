import { createFileRoute, isRedirect, redirect } from "@tanstack/react-router";
import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  Megaphone,
  PlayCircle,
  Settings,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { validateAdminSession } from "@/lib/auth-server";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    try {
      const session = await validateAdminSession();
      return { session };
    } catch (err) {
      if (isRedirect(err)) throw err;
      const isUnauth =
        err instanceof Error &&
        (err.message.includes("Unauthorized") ||
          err.message.includes("No token provided") ||
          err.message.includes("Invalid token") ||
          err.message.includes("expired token"));
      throw redirect({
        to: "/",
        search: { error: isUnauth ? "unauthenticated" : "unauthorized_admin" },
      });
    }
  },
  component: () => (
    <AppShell
      title="لوحة الإدارة"
      nav={[
        { to: "/admin", label: "نظرة عامة", icon: LayoutDashboard, exact: true },
        { to: "/admin/students", label: "حسابات الطلاب", icon: Users },
        { to: "/admin/lectures", label: "المحاضرات", icon: PlayCircle },
        { to: "/admin/exercises", label: "التدريبات", icon: ClipboardList },
        { to: "/admin/results", label: "نتائج الطلاب", icon: BarChart3 },
        { to: "/admin/posts", label: "منشورات المنصة", icon: Megaphone },
        { to: "/admin/settings", label: "إعدادات المنصة", icon: Settings },
      ]}
    />
  ),
});
