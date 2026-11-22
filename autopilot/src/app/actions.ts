"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { runJobByKey } from "@/services/scheduler/jobs";
import { importManualProduct, importProductsCsv } from "@/services/amazon/manual-import";
import { generatePinsForProduct, regeneratePinImage } from "@/services/content-generation/pipeline";
import { rescoreProduct } from "@/services/product-research/evaluate";
import { getProduct, listProducts, updateProductFields } from "@/database/repositories";
import { updateSettings } from "@/database/settings";
import { audit } from "@/utils/audit";
import {
  approvePin,
  rejectPin,
  replanSchedule,
  retryFailedPin,
  sendPinNow,
  unschedulePin,
  updatePinContent,
} from "@/services/scheduler/publisher";
import { importAssociatesReport } from "@/services/analytics";
import { disconnectPinterest, listPinterestBoards } from "@/services/pinterest/api";
import { CATEGORY_KEYS, isCategoryKey } from "@/services/product-research/categories";

/** Runs an action and redirects back with a flash message. */
async function act(form: FormData, fallbackPath: string, fn: () => Promise<string>): Promise<never> {
  const back = String(form.get("returnTo") ?? fallbackPath);
  const path = back.startsWith("/") && !back.startsWith("//") ? back.split("?")[0] : fallbackPath;
  let msg: string;
  let ok = true;
  try {
    msg = await fn();
  } catch (err) {
    ok = false;
    msg = err instanceof z.ZodError ? err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") : (err as Error).message;
  }
  revalidatePath("/", "layout");
  redirect(`${path}?${ok ? "msg" : "err"}=${encodeURIComponent(msg.slice(0, 500))}`);
}

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

// ─── Jobs ───────────────────────────────────────────────────────────
export async function runJobAction(form: FormData) {
  return act(form, "/", async () => {
    const key = str(form, "job");
    const r = await runJobByKey(key, "user");
    if ("error" in r) throw new Error(`${key}: ${r.error}`);
    return `${key}: ${r.summary}`;
  });
}

// ─── Products ───────────────────────────────────────────────────────
export async function importProductAction(form: FormData) {
  return act(form, "/discover", async () => {
    const p = await importManualProduct(Object.fromEntries(form.entries()));
    return p.status === "rejected"
      ? `Imported ${p.asin}, but it was rejected: ${p.rejection_reasons.join("; ")}`
      : `Imported ${p.asin}: score ${p.score}/100 (${p.status})`;
  });
}

export async function importCsvAction(form: FormData) {
  return act(form, "/discover", async () => {
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) throw new Error("Choose a CSV file");
    if (file.size > 2_000_000) throw new Error("CSV is larger than 2 MB");
    const r = await importProductsCsv(await file.text());
    return `Imported ${r.imported} products${r.failed.length ? `; ${r.failed.length} failed: ${r.failed.slice(0, 3).map((f) => `row ${f.row}: ${f.error}`).join(" | ")}` : ""}`;
  });
}

export async function generatePinsAction(form: FormData) {
  return act(form, "/products", async () => {
    const pins = await generatePinsForProduct(str(form, "productId"), { actor: "user" });
    return `Created ${pins.length} draft pins. Review them in the approval queue.`;
  });
}

export async function rescoreAction(form: FormData) {
  return act(form, "/products", async () => {
    const p = await rescoreProduct(str(form, "productId"));
    if (!p) throw new Error("Product not found");
    return `Re-scored ${p.asin}: ${p.score}/100 (${p.status})`;
  });
}

export async function rescoreAllAction(form: FormData) {
  return act(form, "/products", async () => {
    const all = await listProducts({ limit: 2000 });
    for (const p of all) await rescoreProduct(p.id);
    await audit("info", "user", "products.rescore_all", `Re-scored ${all.length} products`);
    return `Re-scored ${all.length} products`;
  });
}

export async function setProductStatusAction(form: FormData) {
  return act(form, "/products", async () => {
    const id = str(form, "productId");
    const status = str(form, "status");
    if (!["shortlisted", "archived", "candidate"].includes(status)) throw new Error("Invalid status");
    const p = await getProduct(id);
    if (!p) throw new Error("Product not found");
    if (status === "shortlisted" && p.rejection_reasons.length) throw new Error(`Cannot shortlist a rejected product: ${p.rejection_reasons.join("; ")}`);
    await updateProductFields(id, { status: status as "shortlisted" | "archived" | "candidate" });
    await audit("info", "user", "product.status", `Set ${p.asin} to ${status}`, { entityType: "product", entityId: id });
    return `${p.asin} is now ${status}`;
  });
}

export async function updateProductAction(form: FormData) {
  return act(form, "/products", async () => {
    const id = str(form, "productId");
    const p = await getProduct(id);
    if (!p) throw new Error("Product not found");
    const category = str(form, "category");
    await updateProductFields(id, {
      affiliate_url: str(form, "affiliate_url") || null,
      category: isCategoryKey(category) ? category : p.category,
      notes: str(form, "notes") || null,
      availability: (["in_stock", "out_of_stock", "unknown"].includes(str(form, "availability")) ? str(form, "availability") : p.availability) as typeof p.availability,
    });
    const r = await rescoreProduct(id);
    await audit("info", "user", "product.edit", `Edited ${p.asin}`, { entityType: "product", entityId: id });
    return `Saved and re-scored: ${r?.score}/100 (${r?.status})`;
  });
}

// ─── Pins ───────────────────────────────────────────────────────────
export async function savePinAction(form: FormData) {
  return act(form, "/queue", async () => {
    const id = str(form, "pinId");
    const { headlineChanged } = await updatePinContent(id, {
      title: str(form, "title"),
      description: str(form, "description"),
      headline: str(form, "headline"),
      subheadline: str(form, "subheadline") || null,
      board: str(form, "board"),
      link: str(form, "link"),
      altText: str(form, "alt_text"),
      keywords: str(form, "keywords").split(",").map((k) => k.trim()).filter(Boolean).slice(0, 15),
    });
    if (headlineChanged) await regeneratePinImage(id);
    if (str(form, "intent") === "approve") {
      await approvePin(id);
      return "Saved and approved. It has been given the next free posting slot.";
    }
    return headlineChanged ? "Saved; the image was re-rendered with the new text" : "Saved";
  });
}

export async function approvePinAction(form: FormData) {
  return act(form, "/queue", async () => {
    await approvePin(str(form, "pinId"));
    return "Approved. It has been given the next free posting slot.";
  });
}

export async function rejectPinAction(form: FormData) {
  return act(form, "/queue", async () => {
    await rejectPin(str(form, "pinId"));
    return "Pin rejected";
  });
}

export async function regenerateImageAction(form: FormData) {
  return act(form, "/queue", async () => {
    await regeneratePinImage(str(form, "pinId"));
    return "Image re-rendered";
  });
}

export async function sendNowAction(form: FormData) {
  return act(form, "/schedule", async () => {
    await sendPinNow(str(form, "pinId"));
    return "Sent to Zapier. It will show as published once Zapier confirms.";
  });
}

export async function unscheduleAction(form: FormData) {
  return act(form, "/schedule", async () => {
    await unschedulePin(str(form, "pinId"));
    return "Moved back to the approval queue";
  });
}

export async function retryPinAction(form: FormData) {
  return act(form, "/schedule", async () => {
    await retryFailedPin(str(form, "pinId"));
    return "Re-approved and rescheduled";
  });
}

// ─── Settings ───────────────────────────────────────────────────────
const ScheduleSchema = z.object({
  pinsPerDay: z.coerce.number().int().min(1).max(10),
  postingTimes: z.array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24h)")).min(1).max(10),
  minGapMinutes: z.coerce.number().int().min(30).max(1440),
  productCooldownDays: z.coerce.number().int().min(1).max(365),
});

export async function saveScheduleAction(form: FormData) {
  return act(form, "/schedule", async () => {
    const parsed = ScheduleSchema.parse({
      pinsPerDay: form.get("pinsPerDay"),
      postingTimes: str(form, "postingTimes").split(/[,\s]+/).filter(Boolean),
      minGapMinutes: form.get("minGapMinutes"),
      productCooldownDays: form.get("productCooldownDays"),
    });
    await updateSettings((s) => {
      s.schedule = { ...s.schedule, ...parsed };
    });
    await audit("info", "user", "settings.schedule", "Updated posting schedule", { details: parsed });
    const r = await replanSchedule();
    return `Schedule saved; ${r.summary}`;
  });
}

export async function togglePauseAction(form: FormData) {
  return act(form, "/schedule", async () => {
    const s = await updateSettings((s) => {
      s.schedule.paused = !s.schedule.paused;
    });
    await audit("warn", "user", "settings.pause", s.schedule.paused ? "Publishing paused" : "Publishing resumed");
    return s.schedule.paused ? "Publishing paused" : "Publishing resumed";
  });
}

export async function setApprovalAction(form: FormData) {
  return act(form, "/settings", async () => {
    const require = str(form, "requireApproval") === "true";
    if (!require && str(form, "confirm") !== "AUTO") throw new Error('Type AUTO to confirm turning off manual approval');
    await updateSettings((s) => {
      s.requireApproval = require;
    });
    await audit("warn", "user", "settings.approval", require ? "Manual approval required" : "Manual approval DISABLED (unflagged drafts auto-approve)");
    return require ? "Manual approval is required for every pin" : "Auto-approval on for drafts with no compliance flags";
  });
}

const DiscoverySchema = z.object({
  enabled: z.boolean(),
  categories: z.array(z.enum(CATEGORY_KEYS)).min(1, "Pick at least one category"),
  customKeywords: z.array(z.string().max(80)).max(100),
  maxSearchesPerRun: z.coerce.number().int().min(1).max(40),
  minScoreToShortlist: z.coerce.number().min(0).max(100),
  autoGenerateTopN: z.coerce.number().int().min(0).max(20),
  lookaheadDays: z.coerce.number().int().min(0).max(120),
});

export async function saveDiscoveryAction(form: FormData) {
  return act(form, "/settings", async () => {
    const parsed = DiscoverySchema.parse({
      enabled: form.get("enabled") === "on",
      categories: form.getAll("categories").map(String),
      customKeywords: str(form, "customKeywords").split("\n").map((s) => s.trim()).filter(Boolean),
      maxSearchesPerRun: form.get("maxSearchesPerRun"),
      minScoreToShortlist: form.get("minScoreToShortlist"),
      autoGenerateTopN: form.get("autoGenerateTopN"),
      lookaheadDays: form.get("lookaheadDays"),
    });
    await updateSettings((s) => {
      s.discovery = parsed;
    });
    await audit("info", "user", "settings.discovery", "Updated discovery settings", { details: parsed });
    return "Discovery settings saved";
  });
}

export async function saveCommissionAction(form: FormData) {
  return act(form, "/settings", async () => {
    const rates: Partial<Record<(typeof CATEGORY_KEYS)[number], number>> = {};
    for (const k of CATEGORY_KEYS) {
      const v = str(form, `rate_${k}`);
      if (v === "") continue;
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > 20) throw new Error(`Commission for ${k} must be between 0 and 20%`);
      rates[k] = n;
    }
    await updateSettings((s) => {
      s.commissionRates = rates;
    });
    await audit("info", "user", "settings.commission", "Updated commission rates", { details: rates });
    return "Commission rates saved. Use Products → Re-score all to apply them.";
  });
}

export async function saveBoardsAction(form: FormData) {
  return act(form, "/settings", async () => {
    const names = form.getAll("board_name").map(String);
    const ids = form.getAll("board_id").map(String);
    const cats = form.getAll("board_categories").map(String);
    const camps = form.getAll("board_campaigns").map(String);
    const boards = names
      .map((name, i) => ({
        name: name.trim(),
        pinterestBoardId: ids[i]?.trim() || null,
        categories: (cats[i] ?? "").split(",").map((s) => s.trim()).filter(isCategoryKey),
        campaigns: (camps[i] ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      }))
      .filter((b) => b.name);
    if (!boards.length) throw new Error("Keep at least one board");
    await updateSettings((s) => {
      s.boards = boards;
    });
    await audit("info", "user", "settings.boards", `Saved ${boards.length} boards`);
    return `Saved ${boards.length} boards`;
  });
}

export async function setImageProviderAction(form: FormData) {
  return act(form, "/settings", async () => {
    const v = str(form, "imageProvider") === "higgsfield" ? "higgsfield" : "template";
    await updateSettings((s) => {
      s.imageProvider = v;
    });
    await audit("info", "user", "settings.image_provider", `Image provider set to ${v}`);
    return `Image provider: ${v}`;
  });
}

export async function importPinterestBoardsAction(form: FormData) {
  return act(form, "/settings", async () => {
    const remote = await listPinterestBoards();
    let matched = 0;
    await updateSettings((s) => {
      for (const b of s.boards) {
        const r = remote.find((x) => x.name.trim().toLowerCase() === b.name.trim().toLowerCase());
        if (r) {
          b.pinterestBoardId = r.id;
          matched++;
        }
      }
    });
    return `Found ${remote.length} Pinterest boards; matched ${matched} by name. Unmatched boards: create them on Pinterest with the same name.`;
  });
}

export async function disconnectPinterestAction(form: FormData) {
  return act(form, "/settings", async () => {
    await disconnectPinterest();
    await audit("info", "user", "pinterest.disconnect", "Disconnected Pinterest account");
    return "Pinterest disconnected";
  });
}

// ─── Analytics ──────────────────────────────────────────────────────
export async function importReportAction(form: FormData) {
  return act(form, "/analytics", async () => {
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) throw new Error("Choose a report CSV");
    if (file.size > 10_000_000) throw new Error("File is larger than 10 MB");
    const r = await importAssociatesReport(await file.text(), file.name.slice(0, 120));
    return `Imported ${r.imported} rows${r.skipped ? ` (${r.skipped} skipped)` : ""}`;
  });
}
