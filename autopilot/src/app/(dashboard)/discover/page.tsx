import { Badge, Card, Notice, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { importCsvAction, importProductAction, runJobAction } from "@/app/actions";
import { getSettings } from "@/database/settings";
import { config } from "@/utils/config";
import { buildSearchPlan } from "@/services/product-research/discovery";
import { getTrendKeywords } from "@/services/trends/pinterest-trends";
import { CATEGORIES, CATEGORY_KEYS } from "@/services/product-research/categories";

export default async function DiscoverPage() {
  const settings = await getSettings();
  const trends = await getTrendKeywords();
  const plan = buildSearchPlan(settings, trends.map((t) => t.keyword));
  const apiReady = config.amazon.apiConfigured;

  return (
    <>
      <PageHeader
        title="Discover & import products"
        description="Find products automatically with the Amazon Creators API, or add products yourself with links from Associates Central. Every product is scored and checked before any pin is made."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="Automatic discovery (Amazon Creators API)"
          description="Searches seasonal, trending and category keywords, then scores every result"
          actions={apiReady ? <Badge tone="green">API connected</Badge> : <Badge tone="amber">Not configured</Badge>}
        >
          {!apiReady ? (
            <Notice title="Creators API not configured">
              Automatic discovery needs Creators API credentials, which Amazon only issues to eligible Associates accounts. Add them in <code>.env</code> (see Settings). Until then, use manual import on the right. Discovery never scrapes Amazon.
            </Notice>
          ) : (
            <form action={runJobAction} className="mb-4">
              <input type="hidden" name="job" value="discovery" />
              <input type="hidden" name="returnTo" value="/discover" />
              <SubmitButton pendingText="Searching Amazon…">Run discovery now</SubmitButton>
            </form>
          )}
          <div className="mt-4">
            <div className="mb-2 text-xs font-semibold text-zinc-500">Next run&apos;s search plan ({plan.length} searches)</div>
            <ul className="divide-y divide-zinc-100 text-sm">
              {plan.map((p) => (
                <li key={p.keyword} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                  <span className="font-medium">{p.keyword}</span>
                  <span className="flex gap-1.5">
                    <Badge>{CATEGORIES[p.category].label}</Badge>
                    <Badge tone={p.campaign ? "violet" : "gray"}>{p.reason}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <div className="space-y-6">
          <Card title="Add a product manually" description="Paste a link you generated in Associates Central or SiteStripe. Leave rating and reviews blank if you don't have the real numbers.">
            <form action={importProductAction} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="returnTo" value="/discover" />
              <div className="sm:col-span-2">
                <label className="label" htmlFor="affiliate_url">Affiliate link *</label>
                <input className="input" id="affiliate_url" name="affiliate_url" required placeholder="https://www.amazon.in/dp/B0…?tag=yourtag-21" />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="title">Product title *</label>
                <input className="input" id="title" name="title" required minLength={5} />
              </div>
              <div>
                <label className="label" htmlFor="asin">ASIN (needed for amzn.to links)</label>
                <input className="input" id="asin" name="asin" placeholder="B0XXXXXXXX" maxLength={10} />
              </div>
              <div>
                <label className="label" htmlFor="category">Category *</label>
                <select className="select" id="category" name="category" required>
                  {CATEGORY_KEYS.map((k) => (
                    <option key={k} value={k}>{CATEGORIES[k].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="brand">Brand</label>
                <input className="input" id="brand" name="brand" />
              </div>
              <div>
                <label className="label" htmlFor="price">Price (₹)</label>
                <input className="input" id="price" name="price" inputMode="decimal" />
              </div>
              <div>
                <label className="label" htmlFor="rating">Rating (0–5, from the listing)</label>
                <input className="input" id="rating" name="rating" inputMode="decimal" />
              </div>
              <div>
                <label className="label" htmlFor="review_count">Number of ratings</label>
                <input className="input" id="review_count" name="review_count" inputMode="numeric" />
              </div>
              <div>
                <label className="label" htmlFor="availability">Availability</label>
                <select className="select" id="availability" name="availability" defaultValue="in_stock">
                  <option value="in_stock">In stock</option>
                  <option value="out_of_stock">Out of stock</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="features">Key features (one per line, from the listing)</label>
                <textarea className="textarea" id="features" name="features" rows={3} />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="notes">Notes (private, also given to the copywriter as context)</label>
                <input className="input" id="notes" name="notes" />
              </div>
              <div className="sm:col-span-2">
                <SubmitButton pendingText="Scoring…">Import & score</SubmitButton>
              </div>
            </form>
          </Card>

          <Card title="Bulk import (CSV)" description="Columns: asin, title, category, affiliate_url, brand, price, rating, review_count, availability, features, notes">
            <form action={importCsvAction} className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="returnTo" value="/discover" />
              <input type="file" name="file" accept=".csv,text/csv" required className="text-sm" />
              <SubmitButton variant="secondary" pendingText="Importing…">Import CSV</SubmitButton>
              <a href="/api/products/template" className="text-xs font-semibold text-brand-700">Download template</a>
            </form>
            <p className="mt-3 text-xs text-zinc-500">
              Category keys: {CATEGORY_KEYS.join(", ")}. Separate multiple features with semicolons.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
