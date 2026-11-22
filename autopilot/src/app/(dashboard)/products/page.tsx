import Link from "next/link";
import { Badge, EmptyState, PageHeader, ScoreBadge, StatusBadge, cx, fmtInr, fmtNum } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { generatePinsAction, rescoreAllAction } from "@/app/actions";
import { countBy, listPins, listProducts } from "@/database/repositories";
import type { ProductStatus } from "@/database/types";
import { CATEGORIES, CATEGORY_KEYS, categoryLabel, isCategoryKey } from "@/services/product-research/categories";
import { getCampaign } from "@/services/trends/seasonal-calendar";

const TABS: { key: ProductStatus | "all"; label: string }[] = [
  { key: "shortlisted", label: "Shortlisted" },
  { key: "candidate", label: "Below threshold" },
  { key: "rejected", label: "Rejected" },
  { key: "archived", label: "Archived" },
  { key: "all", label: "All" },
];

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const tab = (TABS.find((t) => t.key === sp.status)?.key ?? "shortlisted") as ProductStatus | "all";
  const category = sp.category && isCategoryKey(sp.category) ? sp.category : undefined;
  const [products, counts, pins] = await Promise.all([
    listProducts({ status: tab === "all" ? undefined : tab, category }),
    countBy("products", "status"),
    listPins({ limit: 5000 }),
  ]);
  const pinCount = new Map<string, number>();
  for (const p of pins) pinCount.set(p.product_id, (pinCount.get(p.product_id) ?? 0) + 1);
  const qs = (o: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ status: tab, category, ...o })) if (v) u.set(k, v);
    return `?${u}`;
  };

  return (
    <>
      <PageHeader
        title="Products"
        description="Every discovered or imported product with its score out of 100. Only shortlisted products with valid affiliate links can get pins."
        actions={
          <form action={rescoreAllAction}>
            <input type="hidden" name="returnTo" value="/products" />
            <SubmitButton variant="secondary" pendingText="Re-scoring…">Re-score all</SubmitButton>
          </form>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={qs({ status: t.key })}
            className={cx("rounded-full px-3 py-1 text-sm font-medium", tab === t.key ? "bg-zinc-900 text-white" : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50")}
          >
            {t.label}
            {t.key !== "all" && <span className="ml-1.5 text-xs opacity-70">{counts[t.key] ?? 0}</span>}
          </Link>
        ))}
        <form className="ml-auto" method="get">
          <input type="hidden" name="status" value={tab} />
          <select name="category" defaultValue={category ?? ""} className="select !w-auto" aria-label="Filter by category">
            <option value="">All categories</option>
            {CATEGORY_KEYS.map((k) => (
              <option key={k} value={k}>{CATEGORIES[k].label}</option>
            ))}
          </select>
          <button className="btn btn-secondary btn-sm ml-2">Filter</button>
        </form>
      </div>

      {products.length === 0 ? (
        <EmptyState title="No products here yet">
          Import products on the <Link href="/discover" className="font-semibold text-brand-700">Discover</Link> page, or run discovery once the Creators API is configured.
        </EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Score</th>
                <th>Category / campaign</th>
                <th>Price</th>
                <th>Rating</th>
                <th>Stock</th>
                <th>Link</th>
                <th>Pins</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="max-w-sm">
                    <Link href={`/products/${p.id}`} className="font-medium text-zinc-900 hover:text-brand-700">
                      {p.title}
                    </Link>
                    <div className="mt-0.5 flex flex-wrap gap-1 text-xs text-zinc-500">
                      <span className="font-mono">{p.asin}</span>·<span>{p.source === "manual" ? "manual import" : "Creators API"}</span>
                    </div>
                    {p.rejection_reasons.length > 0 && <div className="mt-1 text-xs text-red-700">{p.rejection_reasons[0]}</div>}
                  </td>
                  <td><ScoreBadge score={p.score} /></td>
                  <td className="text-xs">
                    <div>{categoryLabel(p.category)}</div>
                    {p.campaign && <div className="text-violet-700">{getCampaign(p.campaign)?.label}</div>}
                  </td>
                  <td className="whitespace-nowrap tabular-nums">{fmtInr(p.price_amount)}</td>
                  <td className="whitespace-nowrap tabular-nums text-xs">
                    {p.rating !== null ? `${p.rating}★` : "—"}
                    <div className="text-zinc-500">{p.review_count !== null ? `${fmtNum(p.review_count)} ratings` : "no data"}</div>
                  </td>
                  <td><StatusBadge status={p.availability} /></td>
                  <td><StatusBadge status={p.link_status} /></td>
                  <td className="tabular-nums">{pinCount.get(p.id) ?? 0}</td>
                  <td className="text-right">
                    {p.status === "shortlisted" && p.link_status === "valid" && !pinCount.get(p.id) ? (
                      <form action={generatePinsAction}>
                        <input type="hidden" name="productId" value={p.id} />
                        <input type="hidden" name="returnTo" value="/products" />
                        <SubmitButton size="sm" pendingText="Generating…">Create pins</SubmitButton>
                      </form>
                    ) : (
                      <Link href={`/products/${p.id}`} className="btn btn-secondary btn-sm">Details</Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab === "rejected" && products.length > 0 && (
        <p className="mt-3 text-xs text-zinc-500">
          <Badge tone="red">rejected</Badge> products failed a hard rule (no valid link, unavailable, poor or suspicious ratings, misleading claims, or insufficient data). Fix the data on the product page and it will be re-scored.
        </p>
      )}
    </>
  );
}
