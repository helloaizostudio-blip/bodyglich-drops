"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  CalendarClock,
  CalendarRange,
  CheckSquare,
  Compass,
  LayoutDashboard,
  ListChecks,
  Menu,
  Package,
  ScrollText,
  Send,
  Settings,
  X,
} from "lucide-react";
import { cx } from "@/components/ui";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/discover", label: "Discover & import", icon: Compass },
  { href: "/products", label: "Products", icon: Package },
  { href: "/queue", label: "Approval queue", icon: CheckSquare, countKey: "queue" as const },
  { href: "/schedule", label: "Schedule", icon: CalendarClock },
  { href: "/published", label: "Published", icon: Send },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/calendar", label: "Seasonal calendar", icon: CalendarRange },
  { href: "/settings", label: "Settings & setup", icon: Settings },
  { href: "/logs", label: "Activity & errors", icon: ScrollText, countKey: "errors" as const },
];

export function Sidebar({ counts }: { counts: { queue: number; errors: number } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const nav = (
    <nav className="flex flex-col gap-0.5">
      {NAV.map(({ href, label, icon: Icon, countKey }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setOpen(false)}
          className={cx(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium",
            isActive(href) ? "bg-brand-50 text-brand-700" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
          )}
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden />
          <span className="flex-1">{label}</span>
          {countKey && counts[countKey] > 0 && (
            <span className={cx("rounded-full px-1.5 text-xs font-semibold", countKey === "errors" ? "bg-red-100 text-red-700" : "bg-brand-100 text-brand-700")}>
              {counts[countKey]}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );

  const brand = (
    <Link href="/" className="flex items-center gap-2 px-3 py-1">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-600 text-white">
        <ListChecks className="h-4 w-4" aria-hidden />
      </span>
      <span className="text-sm font-bold leading-tight text-zinc-900">
        Pin Autopilot
        <span className="block text-[11px] font-medium text-zinc-500">Amazon.in × Pinterest</span>
      </span>
    </Link>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 border-r border-zinc-200 bg-white px-3 py-5 lg:flex">
        {brand}
        {nav}
        <form action="/api/auth/logout" method="post" className="mt-auto px-3">
          <button className="text-xs text-zinc-500 hover:text-zinc-800">Sign out</button>
        </form>
      </aside>
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 lg:hidden">
        {brand}
        <button className="btn btn-ghost btn-sm" onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && <div className="border-b border-zinc-200 bg-white px-3 py-3 lg:hidden">{nav}</div>}
    </>
  );
}
