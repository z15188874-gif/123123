import { createFileRoute, isRedirect, redirect } from "@tanstack/react-router";
import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  Megaphone,
  PlayCircle,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { validateAdminSession } from "@/lib/auth-server";
import { getCurrentUserPermissionsFn } from "@/lib/admin-server";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/assistant")({
  beforeLoad: async () => {
    try {
      const session = await validateAdminSession();
      const perms = await getCurrentUserPermissionsFn().catch(() => null);
      if (perms?.role !== "assistant" && perms?.role !== "admin") {
        throw redirect({ to: "/", search: { error: "unauthorized_assistant" } });
      }
      return { session, perms };
    } catch (err) {
      if (isRedirect(err)) throw err;
      throw redirect({
        to: "/",
        search: { error: "unauthenticated" },
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
  component: AssistantLayout,
});

function AssistantLayout() {
  const initialData = Route.useLoaderData();
  const { data: userData } = useQuery({
    queryKey: ["assistant-current-user-perms"],
    queryFn: () => getCurrentUserPermissionsFn(),
    initialData: initialData?.perms,
  });

  const perms = userData?.permissions;

  const allNav = [
    { to: "/assistant", label: "نظرة عامة (المساعد)", icon: LayoutDashboard, exact: true },
    {
      to: "/admin/students",
      label: "إدارة الطلاب",
      icon: Users,
      permission: perms?.canAddStudents ?? true,
    },
    {
      to: "/admin/lectures",
      label: "المحاضرات",
      icon: PlayCircle,
      permission: perms?.canAddLessons ?? true,
    },
    {
      to: "/admin/exercises",
      label: "التدريبات والاختبارات",
      icon: ClipboardList,
      permission: perms?.canAddQuizzes ?? true,
    },
    {
      to: "/admin/results",
      label: "نتائج الطلاب",
      icon: BarChart3,
      permission: perms?.canViewResults ?? true,
    },
    {
      to: "/admin/posts",
      label: "منشورات المنصة",
      icon: Megaphone,
      permission: true,
    },
  ];

  const filteredNav = allNav.filter((item) => item.permission !== false);

  return (
    <AppShell
      title={`لوحة المساعد المحدودة: ${userData?.fullName || "مساعد المنصة"}`}
      nav={filteredNav}
    />
  );
}
