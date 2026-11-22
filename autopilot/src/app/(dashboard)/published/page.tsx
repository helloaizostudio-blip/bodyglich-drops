import Link from "next/link";
import { EmptyState, PageHeader, StatusBadge, fmtNum } from "@/components/ui";
import { getDb } from "@/database/client";
import { listPins } from "@/database/repositories";
import { formatDateTime } from "@/utils/time";

export default async function PublishedPage() {
  const pins = await listPins({ status: ["published", "sent"], limit: 500 });
  const db = await getDb();
  const metrics = await db.all<{ pin_id: string; i: number; o: number; s: number }>(
    `SELECT pin_id, SUM(impressions) AS i, SUM(outbound_clicks) AS o, SUM(saves) AS s FROM pin_metrics GROUP BY pin_id`,
  );
  const m = new Map(metrics.map((r) => [r.pin_id, r]));

  return (
    <>
      <PageHeader
        title="Published pins"
        description="Pins Zapier confirmed as live on Pinterest, plus pins delivered to Zapier that haven't been confirmed yet. Metrics appear once the Pinterest API is connected."
      />
      {pins.length === 0 ? (
        <EmptyState title="Nothing published yet" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Pin</th>
                <th>Board</th>
                <th>Status</th>
                <th>Date</th>
                <th className="text-right">Impressions</th>
                <th className="text-right">Outbound clicks</th>
                <th className="text-right">Saves</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pins.map((p) => {
                const r = m.get(p.id);
                return (
                  <tr key={p.id}>
                    <td className="max-w-md">
                      <div className="flex items-center gap-3">
                        {p.image_file && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`/api/media/${p.image_file}`} alt="" className="h-14 w-10 shrink-0 rounded object-cover ring-1 ring-zinc-200" />
                        )}
                        <Link href={`/products/${p.product_id}`} className="font-medium hover:text-brand-700">{p.title}</Link>
                      </div>
                    </td>
                    <td className="text-xs">{p.board}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td className="whitespace-nowrap text-xs text-zinc-600">{formatDateTime(p.published_at ?? p.sent_at)}</td>
                    <td className="text-right tabular-nums">{r ? fmtNum(Number(r.i)) : "—"}</td>
                    <td className="text-right tabular-nums">{r ? fmtNum(Number(r.o)) : "—"}</td>
                    <td className="text-right tabular-nums">{r ? fmtNum(Number(r.s)) : "—"}</td>
                    <td className="text-right">
                      {p.pinterest_url && (
                        <a href={p.pinterest_url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">View on Pinterest</a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
