import { Badge, Card, PageHeader } from "@/components/ui";
import { getSettings } from "@/database/settings";
import { calendarOverview } from "@/services/trends/seasonal-calendar";
import { categoryLabel } from "@/services/product-research/categories";
import { getTrendKeywords } from "@/services/trends/pinterest-trends";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function CalendarPage() {
  const settings = await getSettings();
  const rows = calendarOverview(new Date(), settings.discovery.lookaheadDays);
  const trends = (await getTrendKeywords()).slice(0, 30);

  return (
    <>
      <PageHeader
        title="Seasonal calendar"
        description={`Campaigns drive discovery keywords, scoring and pin angles. They become relevant ${settings.discovery.lookaheadDays} days before they open, because Pinterest users plan ahead. Festival windows are approximate, so adjust them each year in src/services/trends/seasonal-calendar.ts.`}
      />
      <Card>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Window</th>
                <th>Status</th>
                <th>Categories</th>
                <th>Discovery keywords</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.campaign.key}>
                  <td className="font-medium">{r.campaign.label}</td>
                  <td className="whitespace-nowrap text-xs">
                    {r.campaign.start[1]} {MONTHS[r.campaign.start[0] - 1]} – {r.campaign.end[1]} {MONTHS[r.campaign.end[0] - 1]}
                  </td>
                  <td>
                    {r.state === "active" ? (
                      <Badge tone="green">active</Badge>
                    ) : r.state === "upcoming" ? (
                      <Badge tone="violet">in {r.daysUntilStart} days</Badge>
                    ) : (
                      <Badge>starts {r.start}</Badge>
                    )}
                  </td>
                  <td className="text-xs">{r.campaign.categories.map(categoryLabel).join(", ")}</td>
                  <td className="text-xs text-zinc-600">{r.campaign.keywords.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Pinterest trend keywords" className="mt-6" description="From the Pinterest Trends API (weekly refresh, needs a connected Pinterest account)">
        {trends.length === 0 ? (
          <p className="text-sm text-zinc-500">No trend data yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {trends.map((t) => (
              <Badge key={t.keyword} tone="blue">
                {t.keyword}
                {t.growth_wow !== null && <span className="opacity-70">+{Math.round(t.growth_wow)}% wk</span>}
              </Badge>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
