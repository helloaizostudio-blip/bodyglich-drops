import Link from "next/link";
import { AlertTriangle, CheckCircle2, CircleDashed } from "lucide-react";
import { Badge, Card, PageHeader, Stat, StatusBadge, fmtNum } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { runJobAction } from "@/app/actions";
import { countBy, listPins } from "@/database/repositories";
import { getSettings } from "@/database/settings";
import { getIntegrationStatuses } from "@/dashboard/integrations";
import { activeCampaigns } from "@/services/trends/seasonal-calendar";
import { listAudit, listJobRuns } from "@/utils/audit";
import { formatDateTime } from "@/utils/time";
import { JOBS } from "@/services/scheduler/jobs";

export default async function OverviewPage() {
  const [products, pins, settings, integrations, upcoming, logs, runs] = await Promise.all([
    countBy("products", "status"),
    countBy("pins", "status"),
    getSettings(),
    getIntegrationStatuses(),
    listPins({ status: "scheduled", limit: 5 }),
    listAudit(8),
    listJobRuns(200),
  ]);
  const campaigns = activeCampaigns(new Date(), settings.discovery.lookaheadDays).slice(0, 4);
  const nextUp = [...upcoming].sort((a, b) => (a.scheduled_for ?? "").localeCompare(b.scheduled_for ?? ""));
  const lastRun = (key: string) => runs.find((r) => r.job === key);
  const missingRequired = integrations.filter((i) => i.required && i.state !== "ready");

  return (
    <>
      <PageHeader
        title="Overview"
        description="Discover products, prepare original pins, approve them, and publish through Zapier at a steady, sustainable pace."
        actions={
          <Link href="/queue" className="btn btn-primary">
            Review {pins.draft ?? 0} drafts
          </Link>
        }
      />

      {missingRequired.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" /> Setup incomplete: {missingRequired.length} required item{missingRequired.length > 1 ? "s" : ""}
          </div>
          <ul className="mt-1 list-disc pl-6">
            {missingRequired.map((i) => (
              <li key={i.key}>
                <strong>{i.name}:</strong> {i.summary}
              </li>
            ))}
          </ul>
          <Link href="/settings" className="mt-2 inline-block font-semibold underline">
            Open setup →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Products discovered" value={fmtNum(Object.values(products).reduce((a, b) => a + b, 0))} />
        <Stat label="Shortlisted" value={fmtNum(products.shortlisted ?? 0)} tone="good" />
        <Stat label="Drafts to review" value={fmtNum(pins.draft ?? 0)} tone={(pins.draft ?? 0) > 0 ? "warn" : "default"} />
        <Stat label="Scheduled" value={fmtNum((pins.scheduled ?? 0) + (pins.approved ?? 0))} />
        <Stat label="Published" value={fmtNum(pins.published ?? 0)} hint={pins.sent ? `${pins.sent} awaiting Zapier confirmation` : undefined} />
        <Stat label="Failed" value={fmtNum(pins.failed ?? 0)} tone={(pins.failed ?? 0) > 0 ? "warn" : "default"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card
          title="Next scheduled pins"
          description={settings.schedule.paused ? "Publishing is paused" : `${settings.schedule.pinsPerDay} per day at ${settings.schedule.postingTimes.join(", ")}`}
          className="lg:col-span-2"
          actions={<Link href="/schedule" className="text-xs font-semibold text-brand-700">Schedule →</Link>}
        >
          {nextUp.length === 0 ? (
            <p className="text-sm text-zinc-500">Nothing scheduled. Approve drafts in the queue to fill upcoming slots.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {nextUp.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2.5">
                  {p.image_file && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/media/${p.image_file}`} alt="" className="h-14 w-10 rounded object-cover ring-1 ring-zinc-200" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{p.title}</div>
                    <div className="text-xs text-zinc-500">
                      {p.board} · {formatDateTime(p.scheduled_for)}
                    </div>
                  </div>
                  <StatusBadge status={p.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Seasonal focus" description={`Active now or within ${settings.discovery.lookaheadDays} days`} actions={<Link href="/calendar" className="text-xs font-semibold text-brand-700">Calendar →</Link>}>
          {campaigns.length === 0 ? (
            <p className="text-sm text-zinc-500">No seasonal campaigns in range.</p>
          ) : (
            <ul className="space-y-2.5">
              {campaigns.map((c) => (
                <li key={c.campaign.key} className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{c.campaign.label}</span>
                  <Badge tone={c.state === "active" ? "green" : "violet"}>{c.state === "active" ? "active" : `in ${c.daysUntilStart}d`}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Integrations" className="lg:col-span-1" actions={<Link href="/settings" className="text-xs font-semibold text-brand-700">Setup →</Link>}>
          <ul className="space-y-2.5">
            {integrations.map((i) => (
              <li key={i.key} className="flex gap-2 text-sm">
                {i.state === "ready" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                ) : i.state === "partial" ? (
                  <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                ) : (
                  <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${i.required ? "text-red-500" : "text-zinc-400"}`} />
                )}
                <div>
                  <div className="font-medium">{i.name}</div>
                  <div className="text-xs text-zinc-500">{i.summary}</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Background jobs" description="Run automatically by the worker (npm run worker). You can also run them now." className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Last run</th>
                  <th>Result</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {JOBS.map((j) => {
                  const r = lastRun(j.key);
                  return (
                    <tr key={j.key}>
                      <td>
                        <div className="font-medium">{j.label}</div>
                        <div className="font-mono text-[11px] text-zinc-400">{j.cron}</div>
                      </td>
                      <td className="whitespace-nowrap text-xs text-zinc-600">{r ? formatDateTime(r.started_at) : "never"}</td>
                      <td className="text-xs">
                        {r ? (
                          <>
                            <StatusBadge status={r.status} /> <span className="text-zinc-600">{r.error ?? r.summary}</span>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="text-right">
                        <form action={runJobAction}>
                          <input type="hidden" name="job" value={j.key} />
                          <input type="hidden" name="returnTo" value="/" />
                          <SubmitButton variant="secondary" size="sm" pendingText="Running…">
                            Run now
                          </SubmitButton>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card title="Recent activity" className="mt-6" actions={<Link href="/logs" className="text-xs font-semibold text-brand-700">All activity →</Link>}>
        <ul className="divide-y divide-zinc-100 text-sm">
          {logs.length === 0 && <li className="py-2 text-zinc-500">No activity yet.</li>}
          {logs.map((l) => (
            <li key={l.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 py-2">
              <span className="w-36 shrink-0 text-xs text-zinc-500">{formatDateTime(l.ts)}</span>
              <StatusBadge status={l.level} />
              <span className="min-w-0 flex-1 text-zinc-700">{l.message}</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
