import Link from "next/link";
import { Card, Notice, PageHeader, Stat, cx, fmtInr, fmtNum } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { DailyBarChart } from "@/components/BarChart";
import { importReportAction, runJobAction } from "@/app/actions";
import { getAnalyticsSummary } from "@/services/analytics";
import { pinterestConnection } from "@/services/pinterest/api";

const RANGES = [7, 30, 90];

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const sp = await searchParams;
  const days = RANGES.includes(Number(sp.days)) ? Number(sp.days) : 30;
  const [a, pin] = await Promise.all([getAnalyticsSummary(days), pinterestConnection()]);
  const ctr = a.pinterest.impressions ? ((a.pinterest.outboundClicks ?? 0) / a.pinterest.impressions) * 100 : null;

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Pinterest numbers come from the Pinterest API. Amazon numbers come only from reports you import from Associates Central. Impressions and clicks are never counted as sales."
        actions={
          <div className="flex gap-1 rounded-lg bg-white p-1 ring-1 ring-zinc-200">
            {RANGES.map((r) => (
              <Link key={r} href={`?days=${r}`} className={cx("rounded-md px-3 py-1 text-sm font-medium", r === days ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100")}>
                {r}d
              </Link>
            ))}
          </div>
        }
      />

      <h2 className="mb-2 text-sm font-semibold text-zinc-700">Pipeline (all time)</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Products discovered" value={fmtNum(a.funnel.discovered)} />
        <Stat label="Shortlisted" value={fmtNum(a.funnel.shortlisted)} hint={`${fmtNum(a.funnel.rejected)} rejected`} />
        <Stat label="Pins generated" value={fmtNum(a.funnel.pinsGenerated)} />
        <Stat label="Pins approved" value={fmtNum(a.funnel.approved)} />
        <Stat label="Published (confirmed)" value={fmtNum(a.funnel.published)} />
        <Stat label="Sent, unconfirmed" value={fmtNum(a.funnel.sent)} />
      </div>

      <h2 className="mb-2 mt-8 text-sm font-semibold text-zinc-700">Pinterest: last {days} days</h2>
      {!pin.connected && (
        <div className="mb-3">
          <Notice>Pinterest API not connected, so impressions and clicks are unavailable. Connect it in <Link href="/settings" className="font-semibold underline">Settings</Link>.</Notice>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Impressions" value={fmtNum(a.pinterest.impressions)} hint={`${a.pinterest.pinsWithData} pins with data`} />
        <Stat label="Outbound clicks" value={fmtNum(a.pinterest.outboundClicks)} hint="Clicks to Amazon. These are not sales." />
        <Stat label="Outbound CTR" value={ctr === null ? "—" : `${ctr.toFixed(2)}%`} />
        <Stat label="Saves" value={fmtNum(a.pinterest.saves)} />
      </div>
      {a.daily.length > 0 && (
        <div className="mt-3 grid gap-6 lg:grid-cols-2">
          <Card>
            <DailyBarChart label="Impressions" data={a.daily.map((d) => ({ date: d.date, value: d.impressions }))} />
          </Card>
          <Card>
            <DailyBarChart label="Outbound clicks" data={a.daily.map((d) => ({ date: d.date, value: d.outboundClicks }))} color="#9f1239" />
          </Card>
        </div>
      )}
      {pin.connected && (
        <form action={runJobAction} className="mt-3">
          <input type="hidden" name="job" value="analytics" />
          <input type="hidden" name="returnTo" value="/analytics" />
          <SubmitButton variant="secondary" size="sm" pendingText="Syncing…">Sync Pinterest analytics now</SubmitButton>
        </form>
      )}

      <h2 className="mb-2 mt-8 text-sm font-semibold text-zinc-700">Amazon Associates: last {days} days (from imported reports)</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Amazon clicks" value={fmtNum(a.amazon.clicks)} />
        <Stat label="Ordered items" value={fmtNum(a.amazon.orderedItems)} />
        <Stat label="Shipped items" value={fmtNum(a.amazon.shippedItems)} hint="Qualifying purchases" />
        <Stat label="Revenue" value={fmtInr(a.amazon.revenue)} />
        <Stat label="Earnings (as reported)" value={fmtInr(a.amazon.earnings)} hint="Amazon's estimate until finalised" />
      </div>
      <Card title="Import an Associates Central report" className="mt-3" description={a.amazon.rows ? `${a.amazon.rows} rows in range (${a.amazon.from} → ${a.amazon.to})` : "No report data in this range"}>
        <form action={importReportAction} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="returnTo" value="/analytics" />
          <input type="file" name="file" accept=".csv,text/csv" required className="text-sm" />
          <SubmitButton variant="secondary" pendingText="Importing…">Import report CSV</SubmitButton>
        </form>
        <p className="mt-2 text-xs text-zinc-500">
          In Associates Central go to Reports, choose the Daily trends, Orders or Earnings report, and download it as CSV. Re-importing a file with the same name replaces it.
        </p>
      </Card>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card title="Best-performing categories">
          {a.byCategory.length === 0 ? (
            <p className="text-sm text-zinc-500">No published pins yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr><th>Category</th><th className="text-right">Pins</th><th className="text-right">Impr.</th><th className="text-right">Out. clicks</th><th className="text-right">Ordered</th><th className="text-right">Earnings</th></tr>
                </thead>
                <tbody>
                  {a.byCategory.map((c) => (
                    <tr key={c.category}>
                      <td>{c.label}</td>
                      <td className="text-right tabular-nums">{c.pins}</td>
                      <td className="text-right tabular-nums">{fmtNum(c.impressions)}</td>
                      <td className="text-right tabular-nums">{fmtNum(c.outboundClicks)}</td>
                      <td className="text-right tabular-nums">{fmtNum(c.orderedItems)}</td>
                      <td className="text-right tabular-nums">{fmtInr(c.earnings)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card title="Seasonal campaigns">
          {a.byCampaign.length === 0 ? (
            <p className="text-sm text-zinc-500">No published pins yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr><th>Campaign</th><th className="text-right">Pins</th><th className="text-right">Impr.</th><th className="text-right">Out. clicks</th><th className="text-right">Earnings</th></tr>
                </thead>
                <tbody>
                  {a.byCampaign.map((c) => (
                    <tr key={c.campaign}>
                      <td>{c.label}</td>
                      <td className="text-right tabular-nums">{c.pins}</td>
                      <td className="text-right tabular-nums">{fmtNum(c.impressions)}</td>
                      <td className="text-right tabular-nums">{fmtNum(c.outboundClicks)}</td>
                      <td className="text-right tabular-nums">{fmtInr(c.earnings)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Card title="Top pins" className="mt-6">
        {a.topPins.length === 0 ? (
          <p className="text-sm text-zinc-500">No Pinterest metrics yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr><th>Pin</th><th>Board</th><th className="text-right">Impr.</th><th className="text-right">Out. clicks</th><th className="text-right">Saves</th></tr>
              </thead>
              <tbody>
                {a.topPins.map((p) => (
                  <tr key={p.id}>
                    <td>{p.pinterestUrl ? <a href={p.pinterestUrl} target="_blank" rel="noreferrer" className="hover:text-brand-700">{p.title}</a> : p.title}</td>
                    <td className="text-xs">{p.board}</td>
                    <td className="text-right tabular-nums">{fmtNum(p.impressions)}</td>
                    <td className="text-right tabular-nums">{fmtNum(p.outboundClicks)}</td>
                    <td className="text-right tabular-nums">{fmtNum(p.saves)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="mt-4 text-xs text-zinc-500">
        Category earnings are matched by ASIN between imported reports and your products. Purchases of other items in the same Amazon session also earn commission and appear in reports without a matching product.
      </p>
    </>
  );
}
