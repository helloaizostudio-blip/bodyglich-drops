import { Suspense } from "react";
import { Sidebar } from "@/dashboard/Sidebar";
import { Flash } from "@/dashboard/Flash";
import { countBy } from "@/database/repositories";
import { getDb } from "@/database/client";

export const dynamic = "force-dynamic";

async function navCounts() {
  try {
    const pins = await countBy("pins", "status");
    const db = await getDb();
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const err = await db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM audit_log WHERE level = 'error' AND ts >= ?`, [since]);
    return { queue: pins.draft ?? 0, errors: Number(err?.n ?? 0) };
  } catch {
    return { queue: 0, errors: 0 };
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const counts = await navCounts();
  return (
        <div className="lg:flex">
          <Sidebar counts={counts} />
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
            <div className="mx-auto max-w-7xl">
              <Suspense>
                <Flash />
              </Suspense>
              {children}
            </div>
          </main>
        </div>
  );
}
