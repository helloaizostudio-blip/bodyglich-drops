import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, Notice, PageHeader, ScoreBadge, ScoreBar, StatusBadge, fmtInr, fmtNum } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { generatePinsAction, rescoreAction, setProductStatusAction, updateProductAction } from "@/app/actions";
import { getProduct, listPins } from "@/database/repositories";
import { CATEGORIES, CATEGORY_KEYS } from "@/services/product-research/categories";
import { checkAffiliateLink } from "@/services/amazon/links";
import { getCampaign } from "@/services/trends/seasonal-calendar";
import { config } from "@/utils/config";
import { formatDateTime, hoursAgo } from "@/utils/time";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getProduct(id);
  if (!p) notFound();
  const pins = await listPins({ productId: p.id });
  const link = checkAffiliateLink(p.affiliate_url, config.amazon.partnerTag, p.asin);
  const b = p.score_breakdown;
  const stale = (hoursAgo(p.data_fetched_at) ?? 0) > 24;
  const back = `/products/${p.id}`;

  return (
    <>
      <PageHeader
        title={p.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{p.asin}</span>
            <StatusBadge status={p.status} />
            <Badge>{CATEGORIES[p.category].label}</Badge>
            {p.campaign && <Badge tone="violet">{getCampaign(p.campaign)?.label}</Badge>}
            <Badge>{p.source === "manual" ? "manual import" : "Creators API"}</Badge>
          </span>
        }
        actions={
          <>
            {p.status !== "rejected" && link.valid && (
              <form action={generatePinsAction}>
                <input type="hidden" name="productId" value={p.id} />
                <input type="hidden" name="returnTo" value={back} />
                <SubmitButton pendingText="Generating…">{pins.length ? "Create more pins" : "Create pins"}</SubmitButton>
              </form>
            )}
            <form action={rescoreAction}>
              <input type="hidden" name="productId" value={p.id} />
              <input type="hidden" name="returnTo" value={back} />
              <SubmitButton variant="secondary">Re-score</SubmitButton>
            </form>
            {p.status !== "archived" ? (
              <form action={setProductStatusAction}>
                <input type="hidden" name="productId" value={p.id} />
                <input type="hidden" name="status" value="archived" />
                <input type="hidden" name="returnTo" value={back} />
                <SubmitButton variant="ghost">Archive</SubmitButton>
              </form>
            ) : (
              <form action={setProductStatusAction}>
                <input type="hidden" name="productId" value={p.id} />
                <input type="hidden" name="status" value="candidate" />
                <input type="hidden" name="returnTo" value={back} />
                <SubmitButton variant="ghost">Unarchive</SubmitButton>
              </form>
            )}
            {p.status === "candidate" && p.rejection_reasons.length === 0 && (
              <form action={setProductStatusAction}>
                <input type="hidden" name="productId" value={p.id} />
                <input type="hidden" name="status" value="shortlisted" />
                <input type="hidden" name="returnTo" value={back} />
                <SubmitButton variant="ghost">Shortlist anyway</SubmitButton>
              </form>
            )}
          </>
        }
      />

      {p.rejection_reasons.length > 0 && (
        <div className="mb-6">
          <Notice tone="red" title="Rejected">
            <ul className="list-disc pl-5">
              {p.rejection_reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </Notice>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title={<span className="flex items-center gap-2">Score <ScoreBadge score={p.score} /></span>} description="Computed only from real data; unknown signals score low, never estimated">
          {b ? (
            <div className="space-y-3">
              <ScoreBar label="Demand signals" value={b.demand} max={25} />
              <ScoreBar label="Buying intent" value={b.intent} max={20} />
              <ScoreBar label="Quality signals" value={b.quality} max={20} />
              <ScoreBar label="Commission potential" value={b.commission} max={15} />
              <ScoreBar label="Seasonal relevance" value={b.seasonal} max={10} />
              <ScoreBar label="Competition opportunity" value={b.competition} max={10} />
              <ul className="mt-3 space-y-1 border-t border-zinc-100 pt-3 text-xs text-zinc-600">
                {b.notes.map((n) => (
                  <li key={n}>• {n}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Not scored yet.</p>
          )}
        </Card>

        <Card title="Product data" description={p.data_fetched_at ? `As of ${formatDateTime(p.data_fetched_at)}${stale ? " (stale: refresh before relying on price)" : ""}` : undefined}>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <dt className="text-zinc-500">Price</dt>
            <dd className="tabular-nums">{fmtInr(p.price_amount)}</dd>
            <dt className="text-zinc-500">Rating</dt>
            <dd>{p.rating !== null ? `${p.rating} ★` : "not available"}</dd>
            <dt className="text-zinc-500">Ratings count</dt>
            <dd>{p.review_count !== null ? fmtNum(p.review_count) : "not available"}</dd>
            <dt className="text-zinc-500">Sales rank</dt>
            <dd>{p.sales_rank !== null ? `#${fmtNum(p.sales_rank)}` : "not available"}</dd>
            <dt className="text-zinc-500">Availability</dt>
            <dd><StatusBadge status={p.availability} /> {p.availability_message && <span className="text-xs text-zinc-500">{p.availability_message}</span>}</dd>
            <dt className="text-zinc-500">Brand</dt>
            <dd>{p.brand ?? "—"}</dd>
            <dt className="text-zinc-500">Found via</dt>
            <dd>{p.source_keyword ?? "—"}</dd>
          </dl>
          {p.features.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 border-t border-zinc-100 pl-5 pt-3 text-xs text-zinc-600">
              {p.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
          {p.flags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {p.flags.map((f) => (
                <Badge key={f} tone="amber">{f}</Badge>
              ))}
            </div>
          )}
          {p.image_url && (
            <div className="mt-3 border-t border-zinc-100 pt-3">
              {/* Licensed Creators API image: dashboard reference only, never used on pins. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image_url} alt="" className="h-28 w-28 rounded object-contain ring-1 ring-zinc-200" />
              <p className="mt-1 text-[11px] text-zinc-500">Amazon image, shown here for reference only. Never used on pins.</p>
            </div>
          )}
        </Card>

        <Card title="Edit" description="Changes are saved, then the product is re-scored">
          <form action={updateProductAction} className="space-y-3">
            <input type="hidden" name="productId" value={p.id} />
            <input type="hidden" name="returnTo" value={back} />
            <div>
              <label className="label" htmlFor="affiliate_url">Affiliate link</label>
              <input className="input font-mono text-xs" id="affiliate_url" name="affiliate_url" defaultValue={p.affiliate_url ?? ""} />
              <p className={`mt-1 text-xs ${link.valid ? "text-emerald-700" : "text-red-700"}`}>{link.reason}</p>
            </div>
            <div>
              <label className="label" htmlFor="category">Category</label>
              <select className="select" id="category" name="category" defaultValue={p.category}>
                {CATEGORY_KEYS.map((k) => (
                  <option key={k} value={k}>{CATEGORIES[k].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="availability">Availability</label>
              <select className="select" id="availability" name="availability" defaultValue={p.availability}>
                <option value="in_stock">In stock</option>
                <option value="out_of_stock">Out of stock</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="notes">Notes</label>
              <textarea className="textarea" id="notes" name="notes" rows={2} defaultValue={p.notes ?? ""} />
            </div>
            <SubmitButton variant="secondary">Save</SubmitButton>
          </form>
        </Card>
      </div>

      <Card title={`Pins (${pins.length})`} className="mt-6">
        {pins.length === 0 ? (
          <p className="text-sm text-zinc-500">No pins yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {pins.map((pin) => (
              <Link key={pin.id} href={pin.status === "draft" ? `/queue#${pin.id}` : "/schedule"} className="group">
                {pin.image_file ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/media/${pin.image_file}`} alt={pin.alt_text} className="aspect-[2/3] w-full rounded-lg object-cover ring-1 ring-zinc-200 group-hover:ring-brand-500" />
                ) : (
                  <div className="grid aspect-[2/3] place-items-center rounded-lg bg-zinc-100 text-xs text-zinc-500">no image</div>
                )}
                <div className="mt-1.5 flex items-center justify-between gap-1">
                  <StatusBadge status={pin.status} />
                  <span className="text-[11px] text-zinc-500">{pin.style}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
