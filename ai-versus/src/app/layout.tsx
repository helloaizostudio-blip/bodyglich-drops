import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { HealthBadge } from "./ui";

export const metadata: Metadata = {
  title: "AI Versus Studio",
  description: "Automated chibi AI comparison shorts",
};

const NAV = [
  { href: "/", label: "Idea Generator" },
  { href: "/characters", label: "Character Library" },
  { href: "/production", label: "Video Production" },
  { href: "/settings", label: "Settings" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <div className="flex min-h-screen">
          <aside className="hidden w-60 shrink-0 border-r border-white/10 p-5 md:block">
            <div className="mb-8">
              <div className="text-lg font-black tracking-tight">AI Versus Studio</div>
              <div className="text-xs text-white/50">What would 5 AIs do if…?</div>
            </div>
            <nav className="flex flex-col gap-1">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10">
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="mt-8">
              <HealthBadge />
            </div>
          </aside>
          <main className="flex-1 p-4 md:p-8">
            <nav className="mb-4 flex gap-2 overflow-x-auto md:hidden">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-lg border border-white/10 px-3 py-1.5 text-xs">
                  {n.label}
                </Link>
              ))}
            </nav>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
