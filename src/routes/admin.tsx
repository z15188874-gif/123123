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
import { getCurrentUserPermissionsFn } from "@/lib/admin-server";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    try {
      const session = await validateAdminSession();
      const perms = await getCurrentUserPermissionsFn().catch(() => null);
      return { session, perms };
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
  loader: async () => {
    try {
      const perms = await getCurrentUserPermissionsFn().catch(() => null);
      return { perms };
    } catch {
      return { perms: null };
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const initialData = Route.useRouteContext();
  const { data: userData } = useQuery({
    queryKey: ["current-user-perms"],
    queryFn: () => getCurrentUserPermissionsFn(),
    initialData: initialData?.perms,
  });

  const role = userData?.role || "admin";
  const perms = userData?.permissions;

  const allNav = [
    { to: "/admin", label: "نظرة عامة", icon: LayoutDashboard, exact: true },
    {
      to: "/admin/students",
      label: "حسابات الطلاب",
      icon: Users,
      permission: role === "admin" || (perms?.canAddStudents ?? true),
    },
    {
      to: "/admin/lectures",
      label: "المحاضرات",
      icon: PlayCircle,
      permission: role === "admin" || (perms?.canAddLessons ?? true),
    },
    {
      to: "/admin/exercises",
      label: "التدريبات",
      icon: ClipboardList,
      permission: role === "admin" || (perms?.canAddQuizzes ?? true),
    },
    {
      to: "/admin/results",
      label: "نتائج الطلاب",
      icon: BarChart3,
      permission: role === "admin" || (perms?.canViewResults ?? true),
    },
    {
      to: "/admin/posts",
      label: "منشورات المنصة",
      icon: Megaphone,
      permission: role === "admin" || perms?.canAddStudents,
    },
    {
      to: "/admin/settings",
      label: "إعدادات المنصة",
      icon: Settings,
      permission: role === "admin",
    },
  ];

  const filteredNav = allNav.filter((item) => item.permission !== false);

  return (
    <AppShell
      title={role === "assistant" ? `لوحة المساعد: ${userData?.fullName || ""}` : "لوحة الإدارة"}
      nav={filteredNav}
    />
  );
}
