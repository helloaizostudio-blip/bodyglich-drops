import Link from "next/link";
import { Card, PageHeader, StatusBadge, cx } from "@/components/ui";
import { listAudit, listJobRuns } from "@/utils/audit";
import { formatDateTime } from "@/utils/time";

export default async function LogsPage({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  const sp = await searchParams;
  const level = sp.level === "error" || sp.level === "warn" ? sp.level : undefined;
  const [entries, runs] = await Promise.all([listAudit(300, level), listJobRuns(30)]);

  return (
    <>
      <PageHeader
        title="Activity & errors"
        description="Every automated and manual action is logged here. Secrets are redacted before anything is stored."
        actions={
          <div className="flex gap-1 rounded-lg bg-white p-1 ring-1 ring-zinc-200">
            {[
              { k: undefined, l: "All" },
              { k: "warn", l: "Warnings" },
              { k: "error", l: "Errors" },
            ].map((o) => (
              <Link key={o.l} href={o.k ? `?level=${o.k}` : "?"} className={cx("rounded-md px-3 py-1 text-sm font-medium", level === o.k ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100")}>
                {o.l}
              </Link>
            ))}
          </div>
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Audit log" className="xl:col-span-2">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Level</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-zinc-500">No entries.</td>
                  </tr>
                )}
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap text-xs text-zinc-500">{formatDateTime(e.ts)}</td>
                    <td><StatusBadge status={e.level} /></td>
                    <td className="text-xs">{e.actor}</td>
                    <td className="font-mono text-[11px] text-zinc-600">{e.action}</td>
                    <td className="text-sm">
                      {e.message}
                      {e.details && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-[11px] text-zinc-400">details</summary>
                          <pre className="mt-1 max-w-xl overflow-x-auto whitespace-pre-wrap rounded bg-zinc-50 p-2 text-[11px] text-zinc-600">{e.details}</pre>
                        </details>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Job runs">
          <ul className="divide-y divide-zinc-100 text-sm">
            {runs.length === 0 && <li className="py-2 text-zinc-500">No runs yet.</li>}
            {runs.map((r) => (
              <li key={r.id} className="py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs">{r.job}</span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="text-xs text-zinc-500">{formatDateTime(r.started_at)}</div>
                <div className={cx("text-xs", r.error ? "text-red-700" : "text-zinc-600")}>{r.error ?? r.summary}</div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
