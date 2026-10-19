import { Link, Outlet } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Anchor, LogOut, Menu, X, type LucideIcon } from "lucide-react";

import { logout } from "@/lib/auth-client";

export type NavItem = { to: string; label: string; icon: LucideIcon; exact?: boolean };

export function AppShell({ title, nav }: { title: string; nav: NavItem[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen lg:flex">
      <header className="flex items-center justify-between bg-gradient-navy px-4 py-3 text-navy-foreground lg:hidden">
        <Brand />
        <button
          aria-label="القائمة"
          onClick={() => setOpen(!open)}
          className="rounded-md p-2 hover:bg-navy-foreground/10"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </header>
      <aside
        className={`${open ? "block" : "hidden"} bg-gradient-navy text-navy-foreground lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col`}
      >
        <div className="hidden p-6 lg:block">
          <Brand />
        </div>
        <p className="px-6 pt-4 text-xs text-gold lg:pt-0">{title}</p>
        <nav className="flex flex-col gap-1 p-3">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.exact ?? false }}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-navy-foreground/80 transition hover:bg-navy-foreground/10 data-[status=active]:bg-gold data-[status=active]:font-bold data-[status=active]:text-navy"
            >
              <n.icon className="size-4" />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto p-3">
          <button
            type="button"
            onClick={() => {
              void logout();
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-navy-foreground/70 transition hover:bg-navy-foreground/10 text-right"
          >
            <LogOut className="size-4" /> تسجيل الخروج
          </button>
        </div>
      </aside>
      <main className="flex-1 p-4 sm:p-6 lg:p-10">
        <Outlet />
      </main>
    </div>
  );
}

export function Brand() {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/assets/aistudio/1792226093974_15388eac.jpg"
        alt="شعار منصة الأستاذ سعيد مطر"
        className="size-10 rounded-full object-cover border border-gold/40 shadow-sm"
      />
      <span className="font-display text-lg font-bold">منصة الأستاذ سعيد مطر</span>
    </div>
  );
}

export function PageHeader({
  title,
  desc,
  action,
}: {
  title: string;
  desc: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-primary sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      </div>
      {action}
    </div>
  );
}

export function PendingBackend({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed bg-card p-10 text-center shadow-card">
      <span className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-gold-soft text-primary">
        <Icon className="size-7" />
      </span>
      <h2 className="text-lg font-bold text-primary">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-muted-foreground">{text}</p>
      <p className="mt-4 inline-block rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
        سيتم تفعيل هذا القسم بعد ربط قاعدة البيانات
      </p>
    </div>
  );
}

export function DisabledButton({ children }: { children: ReactNode }) {
  return (
    <button
      disabled
      title="غير مفعّل بعد"
      className="cursor-not-allowed rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground opacity-60"
    >
      {children}
    </button>
  );
}
