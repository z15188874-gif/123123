import { createFileRoute, isRedirect, redirect } from "@tanstack/react-router";
import { Award, ClipboardList, Home, Megaphone, PlayCircle, Trophy } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { validateStudentSession } from "@/lib/auth-server";

export const Route = createFileRoute("/student")({
  beforeLoad: async () => {
    try {
      const session = await validateStudentSession();
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
        search: { error: isUnauth ? "unauthenticated" : "unauthorized_student" },
      });
    }
  },
  component: () => (
    <AppShell
      title="لوحة الطالب"
      nav={[
        { to: "/student", label: "الرئيسية", icon: Home, exact: true },
        { to: "/student/lectures", label: "المحاضرات المصوّرة", icon: PlayCircle },
        { to: "/student/quizzes", label: "التدريبات والاختبارات", icon: ClipboardList },
        { to: "/student/results", label: "سجل نتائج اختباراتي", icon: Award },
        { to: "/student/posts", label: "منشورات المنصة", icon: Megaphone },
        { to: "/student/leaderboard", label: "لوحة الشرف الأسبوعية", icon: Trophy },
      ]}
    />
  ),
});
