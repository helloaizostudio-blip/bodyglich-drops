# Pin Autopilot: Amazon.in affiliate × Pinterest

An AI-assisted system that finds promising Amazon.in products, scores them, writes original Pinterest pins, renders 1000×1500 pin graphics, and, **after you approve them**, publishes through Zapier's official Pinterest integration. It then tracks performance and feeds it back into product selection.

It is built for a steady, sustainable affiliate operation, not a spam bot: 1–3 pins a day by default, no duplicate products inside a cooldown, approval required, disclosures on every pin, and nothing invented.

---

## What it does

| Stage | How |
|---|---|
| **Discover** | Amazon **Creators API** `searchItems` across seasonal, Pinterest-trend, custom and category keywords. No scraping, no Amazon login automation. Without API access, use **manual import** (form or CSV) with links from Associates Central / SiteStripe. |
| **Seasonal calendar** | 15 India-focused campaigns (Christmas, winter fashion, New Year organisation, Valentine's, Holi, summer, monsoon, Raksha Bandhan, Navratri, Diwali, wedding season…), active ahead of time with a configurable look-ahead. |
| **Score (0–100)** | Demand 25 · Buying intent 20 · Quality 20 · Commission 15 · Seasonal 10 · Competition 10. Unknown data scores low with a note; ratings, reviews, sales and commission rates are **never estimated**. |
| **Reject** | Out of stock, invalid/missing affiliate link (tag must match yours), rating < 3.8, suspicious review patterns, misleading claims, insufficient data. |
| **Write** | Claude (`claude-opus-5-5`, structured output) writes 2–3 distinct concepts: on-image headline, SEO title, description, keywords, board, alt text, image prompt. Without an API key, clearly-labelled template copy is used. |
| **Comply** | `#ad` at the start of every description, the Amazon Associates statement at the end (next to the link), no prices on pins, health/beauty claim detection, Pinterest length limits. Enforced on generation *and* on every edit. |
| **Design** | 6 original styles (editorial, minimal, magazine, product-photo, lifestyle, seasonal) with rotating palettes, rendered locally from SVG with bundled fonts. Optional **Higgsfield** AI *mood backgrounds* are labelled "Illustrative image" on the pin. Amazon product images are never used on pins. |
| **Board** | Best board per product: seasonal-campaign board first, then category board. |
| **Approve** | Dashboard approval queue: preview, edit, check link, approve/reject. Approval is on by default. |
| **Schedule** | Configurable pins/day, posting times (IST), minimum gap, product cooldown; alternates styles. |
| **Publish** | Sends approved pins to a **Zapier Catch Hook** → **Pinterest Create Pin**. An optional callback step confirms the real Pinterest pin ID; until then the pin shows "sent to Zapier", never "published". |
| **Learn** | Pinterest API analytics (impressions, outbound clicks, saves) plus imported Associates Central reports (clicks, ordered/shipped items, earnings). Categories with higher outbound CTR / conversion get a small scoring boost. |
| **Audit** | Every automated and manual action goes to the activity log (secrets redacted). |

---

## Quick start (local)

Requirements: Node.js 20.9+ (22 recommended).

```bash
cd autopilot
npm install
cp .env.example .env.local       # fill in what you have (see Setup below)
npm run db:migrate               # creates ./data/autopilot.db
npm run dev                      # dashboard on http://localhost:3000
npm run worker                   # in a second terminal: background jobs
```

With no `DASHBOARD_PASSWORD`, the dashboard only answers on `localhost`.

Minimum to see the full flow locally: set `AMAZON_PARTNER_TAG`, add a product on **Discover & import**, click **Create pins**, and review it in the **Approval queue**.

---

## Setup

The **Settings & setup** page shows the live status of every integration with step-by-step instructions. All credentials live in environment variables. Nothing secret is stored in the database except Pinterest OAuth tokens, which are AES-256-GCM encrypted with `APP_SECRET`.

### 1. Security (required for deployment)
- `DASHBOARD_PASSWORD`: dashboard login.
- `APP_SECRET`: 32+ random characters (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).

### 2. Amazon Associates (required)
- `AMAZON_PARTNER_TAG`: your amazon.in tracking ID, e.g. `yourname-21`. Every link is validated against it before approval and again before sending.

### 3. Amazon Creators API (optional; enables automatic discovery)
Amazon replaced PA-API 5 with the Creators API and only issues credentials to eligible Associates accounts.
1. Associates Central (amazon.in) → **Tools → Creators API** → create a credential.
2. Set `AMAZON_CREATORS_CREDENTIAL_ID`, `AMAZON_CREATORS_CREDENTIAL_SECRET`, `AMAZON_CREATORS_CREDENTIAL_VERSION`.
3. **Check the token endpoint and scope shown for your credential version** and set `AMAZON_CREATORS_TOKEN_URL` / `AMAZON_CREATORS_SCOPE` if they differ from the defaults (v3.x: Login with Amazon EU endpoint `https://api.amazon.co.uk/auth/o2/token`, scope `creatorsapi::default`; v2.x: Cognito endpoint, scope `creatorsapi/default`).
4. API calls go to `https://creatorsapi.amazon/catalog/v1/{searchItems|getItems}` with `x-marketplace: www.amazon.in`.

Product data from the API is refreshed daily (price/availability older than 24 h is flagged as stale). Amazon images appear only in the dashboard for reference.

> The client was written from Amazon's published Creators API description but **has not been run against a live account** (no credentials were available while building it). Response parsing is defensive and accepts both camelCase and PA-API-style PascalCase. Run discovery once and check **Activity & errors** after adding credentials.

### 4. Claude (optional; AI copywriting)
- `ANTHROPIC_API_KEY`, optional `CLAUDE_MODEL` (default `claude-opus-5-5`). Requests use structured outputs plus server-side refusal fallbacks (`fallbacks: "default"`), so a declined request is retried on a fallback model in the same call.

### 5. Higgsfield (optional; AI backgrounds)
- `HIGGSFIELD_API_KEY_ID`, `HIGGSFIELD_API_KEY_SECRET` (sent as `Authorization: Key id:secret`), optional `HIGGSFIELD_MODEL` (default `higgsfield-ai/soul/standard`) and `HIGGSFIELD_API_BASE`.
- Then select **Higgsfield** under Settings → Pin images. Any failure falls back to the local templates.
- Prompts ask for mood/setting scenes only (no products, logos, text or faces).

### 6. Public URL (required for publishing)
Zapier downloads each image from `PUBLIC_BASE_URL/api/media/<file>.png`, so the app must be reachable over HTTPS. Only `/api/media/*`, `/api/zapier/callback`, `/api/health` and `/login` are public. Everything else needs the dashboard login.

### 7. Zapier → Pinterest (required for publishing)
1. Create a Zap. **Trigger:** *Webhooks by Zapier → Catch Hook*. Put the URL in `ZAPIER_WEBHOOK_URL`.
2. Send one pin (approve one, then **Send now** on the Schedule page) so Zapier sees the payload:
   ```json
   {
     "event": "create_pin", "pin_id": "pin_…", "board_name": "Christmas Gift Ideas", "board_id": "1234…",
     "title": "…", "description": "#ad … As an Amazon Associate I earn from qualifying purchases.",
     "link": "https://www.amazon.in/dp/B0…?tag=yourtag-21", "image_url": "https://…/api/media/pin_….png",
     "alt_text": "…", "keywords": "…", "callback_url": "https://…/api/zapier/callback", "callback_token": "…"
   }
   ```
3. **Action:** *Pinterest → Create Pin*. Map Board → *Custom value* `board_id`, Title → `title`, Description → `description`, Link → `link`, Image → `image_url`. (Zapier's Create Pin has no alt-text field; `alt_text` is in the payload if you later post through the Pinterest API.)
4. **Recommended:** *Webhooks by Zapier → POST* to `callback_url` with data `pin_id`, `callback_token` and `pinterest_pin_id` (from the Create Pin step). The token is a per-pin HMAC, so forged callbacks are rejected.
5. Board IDs: create the boards on Pinterest, then either connect the Pinterest API and click **Match board IDs from Pinterest**, or copy IDs from Zapier's Board dropdown into Settings → Pinterest boards.

### 8. Pinterest API (optional; analytics, board IDs, trends)
1. Create an app at developers.pinterest.com and add the redirect URI `<PUBLIC_BASE_URL>/api/pinterest/oauth/callback`.
2. Set `PINTEREST_APP_ID`, `PINTEREST_APP_SECRET` (and `APP_SECRET`), restart, click **Connect Pinterest**.
3. Scopes are read-only (`boards:read, pins:read, user_accounts:read`). Publishing still goes through Zapier.

### 9. Amazon reports (for earnings analytics)
Associates Central → Reports → download the Daily trends, Orders or Earnings report as CSV → **Analytics → Import report CSV**. These are the only source of sales/earnings figures in the app.

### 10. Commission rates
Enter the current rates from the Amazon.in fee schedule in Settings → Commission rates. Categories left blank get a neutral commission score; the app never assumes a rate.

---

## Background jobs

`npm run worker` runs these on their own schedules (timezone `APP_TIMEZONE`, default `Asia/Kolkata`). Every job can also be run from the Overview page.

| Job | Schedule | What it does |
|---|---|---|
| `publish` | every 10 min | Sends due pins to Zapier (max 2 per run, respects daily limit and pause; re-checks link, stock and disclosures first; retries failures 3× with back-off) |
| `schedule` | hourly | Assigns slots to approved pins |
| `auto_approve` | hourly | Does nothing unless you turn approval off. Even then, flagged pins always wait for you |
| `refresh_products` | 05:30 daily | Refreshes price/availability via `getItems`, rejects items that disappear or go out of stock |
| `trends` | Mondays 06:00 | Pinterest Trends keywords (if connected) |
| `discovery` | 06:15 daily | Search → score → shortlist → auto-draft top N |
| `analytics` | 07:45 daily | Pinterest pin analytics (last 90 days) |

Run one job and exit: `npm run worker -- --once discovery`.

---

## Deployment

The app needs **a persistent disk** (SQLite + generated images) and **a long-running worker**, so use a VM or a container platform with a volume (e.g. a small VPS, Railway, Render or Fly.io with a volume). Serverless-only hosting such as Netlify or Vercel functions is a poor fit unless you move to PostgreSQL *and* object storage for images.

```bash
npm ci && npm run build
npm run start            # web (PORT env to change port)
npm run worker           # worker, as a separate process/service
```

Keep `.env` out of git (it is in `.gitignore`); use your host's secret manager.

### PostgreSQL
Set `DATABASE_URL=postgres://…`. The schema uses only portable types and runs unchanged; migrations apply automatically on start (`npm run db:migrate` to run them explicitly). Images still live in `DATA_DIR/media`.

---

## Project structure

```
autopilot/
├─ assets/fonts/                 bundled OFL/Apache fonts for pin rendering
├─ scripts/                      worker.ts, migrate.ts
├─ tests/                        unit + end-to-end workflow tests (vitest)
└─ src/
   ├─ app/                       Next.js App Router: dashboard pages, server actions, API routes
   ├─ components/ dashboard/     UI building blocks, sidebar, integration status
   ├─ database/                  SQLite/PostgreSQL client, migrations, repositories, settings
   ├─ services/
   │  ├─ amazon/                 Creators API client, link validation, manual/CSV import
   │  ├─ product-research/       categories, discovery, scoring & rejection rules
   │  ├─ trends/                 seasonal calendar, Pinterest Trends
   │  ├─ ai/                     Claude client (structured output)
   │  ├─ content-generation/     copy generation, compliance, generation pipeline
   │  ├─ image-generation/       SVG templates, renderer, Higgsfield adapter
   │  ├─ pinterest/              read-only API (OAuth, boards, analytics), board picker
   │  ├─ zapier/                 webhook payload, callback verification
   │  ├─ scheduler/              slot planner, publisher, job registry
   │  └─ analytics/              metrics sync, report import, summaries, learning loop
   ├─ utils/                     config, audit log, crypto, sessions, time, http
   └─ proxy.ts                   dashboard authentication
```

## Testing

```bash
npm run typecheck
npm test
```

To run the workflow test against PostgreSQL: `TEST_DATABASE_URL=postgres://… npx vitest run tests/workflow.test.ts`.

`tests/workflow.test.ts` runs the whole pipeline on a temporary database: import, score, generate pins, render images, approve, schedule, send to Zapier (HTTP mocked, payload checked), reject a forged callback, accept a real one, retry after a Zapier error, block an out-of-stock product, import an earnings report, and check the audit log.

## Compliance notes

- **Amazon:** no scraping or login automation; links come only from the API or Associates Central; Amazon images are never placed on pins; pins carry no prices; product data older than 24 h is flagged and refreshed.
- **Pinterest:** original graphics; publishing only through Zapier's official integration; low default volume; no duplicate products inside the cooldown; affiliate disclosure on every pin.
- **Claims:** listings with "cure/miracle/guaranteed/fairness"-style claims are rejected; generated copy with effectiveness claims is flagged for manual review and cannot be auto-approved.
- Review Amazon's Associates Operating Agreement and Pinterest's Merchant/Paid Partnership and spam policies yourself. They change, and you are responsible for your account.
