/**
 * End-to-end workflow against a temporary SQLite database:
 * import → score → generate pins (template copy) → render images → approve → schedule →
 * send to Zapier (HTTP mocked) → Zapier callback → published → report import → analytics.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "autopilot-test-"));
process.env.DATA_DIR = tmp;
process.env.SQLITE_PATH = path.join(tmp, "test.db");
process.env.AMAZON_PARTNER_TAG = "mytag-21";
process.env.APP_SECRET = "test-secret-test-secret-test-secret";
process.env.ZAPIER_WEBHOOK_URL = "https://hooks.zapier.com/hooks/catch/123/abc/";
process.env.PUBLIC_BASE_URL = "https://pins.example.com";
delete process.env.ANTHROPIC_API_KEY;
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
else delete process.env.DATABASE_URL;

const { importManualProduct, importProductsCsv } = await import("@/services/amazon/manual-import");
const { generatePinsForProduct } = await import("@/services/content-generation/pipeline");
const { approvePin, publishDuePins, handleZapierCallback, rejectPin, updatePinContent } = await import("@/services/scheduler/publisher");
const { getPin, listPins, updatePinFields, getProduct } = await import("@/database/repositories");
const { callbackTokenFor } = await import("@/services/zapier/webhook");
const { importAssociatesReport, getAnalyticsSummary } = await import("@/services/analytics");
const { listAudit } = await import("@/utils/audit");
const { closeDb, getDb } = await import("@/database/client");
const { updateSettings } = await import("@/database/settings");

beforeAll(async () => {
  await updateSettings((s) => {
    s.commissionRates = { home_decor: 6 };
  });
});

afterAll(async () => {
  await closeDb();
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("full workflow", () => {
  let productId = "";
  let pinIds: string[] = [];

  it("imports and scores a manual product (test fixture data)", async () => {
    const p = await importManualProduct({
      asin: "B0TESTAAAA",
      title: "Handmade Ceramic Vase Set of 3 for Living Room Decor",
      category: "home_decor",
      affiliate_url: "https://www.amazon.in/dp/B0TESTAAAA?tag=mytag-21",
      price: "1,299",
      rating: "4.4",
      review_count: "2300",
      availability: "in_stock",
      features: "Matte finish; Set of three sizes",
    });
    productId = p.id;
    expect(p.status).toBe("shortlisted");
    expect(p.score).toBeGreaterThan(55);
    expect(p.link_status).toBe("valid");
  });

  it("rejects a product with a wrong tracking tag", async () => {
    const p = await importManualProduct({
      asin: "B0TESTBBBB",
      title: "Some other product with a long enough title",
      category: "kitchen",
      affiliate_url: "https://www.amazon.in/dp/B0TESTBBBB?tag=someoneelse-21",
      rating: "4.5",
      review_count: "900",
    });
    expect(p.status).toBe("rejected");
    await expect(generatePinsForProduct(p.id)).rejects.toThrow(/rejected/);
  });

  it("imports CSV rows and reports bad rows", async () => {
    const r = await importProductsCsv(
      "asin,title,category,affiliate_url,price,rating,review_count,availability\n" +
        "B0TESTCCCC,Glass Spice Jars with Bamboo Lids Set of 6,kitchen,https://www.amazon.in/dp/B0TESTCCCC?tag=mytag-21,649,4.2,1800,in_stock\n" +
        ",Missing asin row title,kitchen,https://amzn.to/abc,,,,\n",
    );
    expect(r.imported).toBe(1);
    expect(r.failed).toHaveLength(1);
  });

  it("generates 3 distinct draft pins with images and disclosures", async () => {
    const pins = await generatePinsForProduct(productId);
    pinIds = pins.map((p) => p.id);
    expect(pins).toHaveLength(3);
    expect(new Set(pins.map((p) => p.style)).size).toBe(3);
    for (const p of pins) {
      expect(p.status).toBe("draft");
      expect(p.copy_source).toBe("template");
      expect(p.description).toMatch(/^#ad /);
      expect(p.description).toContain("As an Amazon Associate I earn from qualifying purchases.");
      expect(p.image_file).toBeTruthy();
      const png = fs.readFileSync(path.join(tmp, "media", p.image_file!));
      expect(png.readUInt32BE(16)).toBe(1000); // PNG width
      expect(png.readUInt32BE(20)).toBe(1500); // PNG height
      expect(p.board).toBe("Home Essentials");
    }
  });

  it("re-applies compliance when a pin is edited", async () => {
    await updatePinContent(pinIds[0], {
      title: "Vase set for ₹1299",
      description: "Lovely vases",
      headline: "Shelf styling made easy",
      subheadline: null,
      board: "Home Essentials",
      link: "https://www.amazon.in/dp/B0TESTAAAA?tag=mytag-21",
      altText: "Vases",
      keywords: ["vase", "decor"],
    });
    const p = (await getPin(pinIds[0]))!;
    expect(p.title).not.toMatch(/1299/);
    expect(p.description).toMatch(/^#ad Lovely vases/);
  });

  it("approves and schedules pins with cooldown between the same product", async () => {
    await approvePin(pinIds[0]);
    await approvePin(pinIds[1]);
    await rejectPin(pinIds[2]);
    const scheduled = await listPins({ status: "scheduled" });
    expect(scheduled).toHaveLength(2);
    const [a, b] = scheduled.map((p) => new Date(p.scheduled_for!).getTime()).sort();
    expect(b - a).toBeGreaterThanOrEqual(21 * 86_400_000);
  });

  it("refuses to approve a pin whose link was tampered with", async () => {
    const extra = await generatePinsForProduct(productId, { count: 2 });
    await updatePinFields(extra[0].id, { link: "https://www.amazon.in/dp/B0TESTAAAA?tag=hijack-21" });
    await expect(approvePin(extra[0].id)).rejects.toThrow(/Affiliate link invalid/);
  });

  it("sends a due pin to Zapier with the expected payload, then records the callback", async () => {
    const pin = (await listPins({ status: "scheduled" })).sort((x, y) => x.scheduled_for!.localeCompare(y.scheduled_for!))[0];
    await updatePinFields(pin.id, { scheduled_for: new Date(Date.now() - 60_000).toISOString() });

    const calls: { url: string; body: Record<string, unknown> }[] = [];
    const realFetch = globalThis.fetch;
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, body: Object.fromEntries(new URL(url).searchParams) });
      return new Response(JSON.stringify({ status: "success", request_id: "req_1" }), { status: 200 });
    });
    const r = await publishDuePins("worker");
    vi.stubGlobal("fetch", realFetch);

    expect(r.summary).toMatch(/sent 1/);
    expect(calls).toHaveLength(1);
    expect(calls[0].url.startsWith(process.env.ZAPIER_WEBHOOK_URL!)).toBe(true);
    const qs = new URL(calls[0].url).searchParams;
    expect(qs.get("title")).toBe(pin.title);
    expect(qs.get("link")).toBe("https://www.amazon.in/dp/B0TESTAAAA?tag=mytag-21");
    const body = calls[0].body;
    expect(body.pin_id).toBe(pin.id);
    expect(body.image_url).toMatch(/^https:\/\/pins\.example\.com\/api\/media\/.+\.png$/);
    expect(body.link).toBe("https://www.amazon.in/dp/B0TESTAAAA?tag=mytag-21");
    expect(String(body.description)).toContain("#ad");
    expect(body.callback_url).toBe("https://pins.example.com/api/zapier/callback");
    expect((await getPin(pin.id))!.status).toBe("sent");

    // A forged callback is rejected
    expect((await handleZapierCallback({ pin_id: pin.id, callback_token: "forged", pinterest_pin_id: "1" })).httpStatus).toBe(401);
    // The real one marks it published
    const ok = await handleZapierCallback({ pin_id: pin.id, callback_token: callbackTokenFor(pin.id), pinterest_pin_id: "987654321" });
    expect(ok.ok).toBe(true);
    const published = (await getPin(pin.id))!;
    expect(published.status).toBe("published");
    expect(published.pinterest_url).toBe("https://www.pinterest.com/pin/987654321/");
  });

  it("does not send when Zapier errors, and retries later", async () => {
    const pin = (await listPins({ status: "scheduled" }))[0];
    await updatePinFields(pin.id, { scheduled_for: new Date(Date.now() - 60_000).toISOString() });
    const realFetch = globalThis.fetch;
    vi.stubGlobal("fetch", async () => new Response("boom", { status: 400 }));
    const r = await publishDuePins("worker");
    vi.stubGlobal("fetch", realFetch);
    expect(r.summary).toMatch(/retrying 1/);
    const after = (await getPin(pin.id))!;
    expect(after.status).toBe("scheduled");
    expect(after.attempts).toBe(1);
    expect(new Date(after.scheduled_for!).getTime()).toBeGreaterThan(Date.now());
  });

  it("blocks publishing if the product goes out of stock", async () => {
    const db = await getDb();
    await db.run(`UPDATE products SET availability = 'out_of_stock' WHERE id = ?`, [productId]);
    const pin = (await listPins({ status: "scheduled" }))[0];
    await updatePinFields(pin.id, { scheduled_for: new Date(Date.now() - 60_000).toISOString() });
    await publishDuePins("worker");
    const after = (await getPin(pin.id))!;
    expect(after.status).toBe("failed");
    expect(after.last_error).toMatch(/out of stock/);
    await db.run(`UPDATE products SET availability = 'in_stock' WHERE id = ?`, [productId]);
  });

  it("imports an Associates report and reports earnings without inventing sales", async () => {
    const csv =
      "Fee-Earnings report from 2026-11-01 to 2026-11-30\n" +
      "Category,Name,ASIN,Tracking ID,Date Shipped,Price(Rs.),Items Shipped,Revenue(Rs.),Ad Fees(Rs.)\n" +
      `Home,Ceramic Vase Set,B0TESTAAAA,mytag-21,${new Date().toISOString().slice(0, 10)},1299,2,"2,598",155.88\n`;
    const r = await importAssociatesReport(csv, "earnings-nov.csv");
    expect(r.imported).toBe(1);
    const a = await getAnalyticsSummary(30);
    expect(a.amazon.shippedItems).toBe(2);
    expect(a.amazon.earnings).toBeCloseTo(155.88);
    expect(a.amazon.revenue).toBe(2598);
    expect(a.pinterest.impressions).toBeNull(); // no Pinterest data → unknown, not zero
    expect(a.funnel.published).toBe(1);
    expect(a.byCategory.find((c) => c.category === "home_decor")?.earnings).toBeCloseTo(155.88);
  });

  it("logs every automated action", async () => {
    const actions = new Set((await listAudit(500)).map((l) => l.action));
    for (const a of ["product.import", "content.generate", "pin.approve", "pin.schedule", "pin.publish", "pin.published", "analytics.import_report"]) {
      expect(actions.has(a)).toBe(true);
    }
    expect((await getProduct(productId))!.status).toBe("shortlisted");
  });
});
