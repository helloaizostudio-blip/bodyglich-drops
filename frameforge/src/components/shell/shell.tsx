"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crown, LogOut, Menu, X } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { signOut } from "@/server/actions/auth";
import { NAV, isActive } from "./nav";
import { Logo } from "./logo";

type ShellProps = {
  userName: string;
  channelName: string;
  children: React.ReactNode;
  /** Rendered in the top bar (e.g. the AI assistant launcher). */
  topBarExtras?: React.ReactNode;
};

const MOBILE_PRIMARY = ["/", "/characters", "/story", "/storyboard"];

export function Shell({ userName, channelName, children, topBarExtras }: ShellProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMoreOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  const primary = NAV.filter((n) => MOBILE_PRIMARY.includes(n.href));
  const moreActive = !primary.some((n) => isActive(n, pathname));

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-navy-900 lg:flex">
        <Link href="/" className="px-5 pb-4 pt-6" aria-label="FRAMEFORGE home">
          <Logo />
          <span className="mt-1 block pl-[46px] text-[10.5px] font-semibold uppercase tracking-[0.14em] text-brand-300/70">Animation Studio</span>
        </Link>
        <nav className="no-scrollbar flex-1 overflow-y-auto px-3 pb-3" aria-label="Main">
          <ul className="flex flex-col gap-0.5">
            {NAV.map((item) => {
              const active = isActive(item, pathname);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-11 items-center gap-3 rounded-xl px-3.5 text-[14px] font-semibold transition-colors",
                      active ? "bg-brand-600 text-white shadow-[0_8px_20px_-8px_rgb(38_112_230/0.9)]" : "text-brand-200/80 hover:bg-white/8 hover:text-white",
                    )}
                  >
                    <item.icon className="size-[18px] shrink-0" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="m-3 flex items-center gap-3 rounded-2xl bg-white/8 p-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-400/20 text-brand-300">
            <Crown className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-extrabold uppercase tracking-wide text-white">{channelName}</p>
            <p className="text-[11px] text-brand-200/70">Studio</p>
          </div>
        </div>
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-line/70 bg-brand-50/85 px-4 backdrop-blur-md lg:h-16 lg:px-8">
        <Link href="/" className="lg:hidden" aria-label="FRAMEFORGE home">
          <Logo tone="light" />
        </Link>
        <div className="flex-1" />
        {topBarExtras}
        <div className="relative">
          <button
            type="button"
            aria-label="Account menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="font-display grid size-10 place-items-center rounded-full bg-navy-900 text-sm font-bold text-white ring-2 ring-white"
          >
            {initials(userName)}
          </button>
          {menuOpen ? (
            <>
              <button type="button" aria-label="Close menu" className="fixed inset-0 z-10 cursor-default" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-12 z-20 w-56 animate-rise rounded-2xl bg-white p-2 shadow-pop ring-1 ring-line">
                <p className="truncate px-3 pb-2 pt-1.5 text-sm font-bold text-navy-900">{userName}</p>
                <Link href="/settings" className="flex h-10 items-center rounded-xl px-3 text-sm font-medium text-navy-800 hover:bg-brand-100">
                  Settings
                </Link>
                <form action={signOut}>
                  <button type="submit" className="flex h-10 w-full items-center gap-2 rounded-xl px-3 text-sm font-medium text-bad-700 hover:bg-bad-100">
                    <LogOut className="size-4" /> Sign out
                  </button>
                </form>
              </div>
            </>
          ) : null}
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1280px] px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-7">{children}</main>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-safe backdrop-blur-md lg:hidden" aria-label="Main">
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {primary.map((item) => {
            const active = isActive(item, pathname);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold", active ? "text-brand-600" : "text-muted")}
                >
                  <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors", active && "bg-brand-100")}>
                    <item.icon className="size-5" aria-hidden />
                  </span>
                  {item.short}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-expanded={moreOpen}
              className={cn("flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-semibold", moreActive ? "text-brand-600" : "text-muted")}
            >
              <span className={cn("grid h-7 w-12 place-items-center rounded-full", moreActive && "bg-brand-100")}>
                <Menu className="size-5" aria-hidden />
              </span>
              More
            </button>
          </li>
        </ul>
      </nav>

      {/* Mobile "More" sheet with every studio section */}
      {moreOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="All studio sections">
          <button type="button" aria-label="Close" className="absolute inset-0 animate-fade bg-navy-950/50" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 animate-sheet rounded-t-3xl bg-navy-900 px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4">
            <div className="mb-3 flex items-center justify-between">
              <Logo />
              <button type="button" aria-label="Close" onClick={() => setMoreOpen(false)} className="grid size-10 place-items-center rounded-xl text-white/80 hover:bg-white/10">
                <X className="size-5" />
              </button>
            </div>
            <ul className="grid grid-cols-3 gap-2">
              {NAV.map((item) => {
                const active = isActive(item, pathname);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex h-[76px] flex-col items-center justify-center gap-1.5 rounded-2xl px-1 text-center text-[11.5px] font-semibold leading-tight",
                        active ? "bg-brand-600 text-white" : "bg-white/8 text-brand-100",
                      )}
                    >
                      <item.icon className="size-5" aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-brand-300/70">
              <Crown className="size-3.5" /> {channelName} Studio
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
