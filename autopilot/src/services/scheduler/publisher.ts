import { getDb } from "@/database/client";
import { getSettings } from "@/database/settings";
import { getPin, getProduct, listPins, transitionPin, updatePinFields } from "@/database/repositories";
import type { Pin } from "@/database/types";
import { audit } from "@/utils/audit";
import { config } from "@/utils/config";
import { nowIso } from "@/utils/ids";
import { zonedDateKey } from "@/utils/time";
import { checkAffiliateLink } from "@/services/amazon/links";
import { applyCompliance, validateForPublishing } from "@/services/content-generation/compliance";
import { CATEGORIES } from "@/services/product-research/categories";
import { readMedia } from "@/services/image-generation/renderer";
import { buildPayload, sendToZapier, verifyCallbackToken } from "@/services/zapier/webhook";
import { assignSlots, inBlackout, type OccupiedSlot } from "./slots";

const MAX_ATTEMPTS = 3;
const MAX_SENDS_PER_RUN = 2;
const ACTIVE: Pin["status"][] = ["scheduled", "sending", "sent", "published"];

/** Checks that must pass before a pin may be approved or sent. */
export async function prePublishChecks(pin: Pin): Promise<string[]> {
  const errors = validateForPublishing(pin);
  const product = await getProduct(pin.product_id);
  if (!product) return [...errors, "Product no longer exists"];
  if (product.status === "rejected") errors.push(`Product is rejected: ${product.rejection_reasons.join("; ")}`);
  if (product.availability === "out_of_stock") errors.push("Product is out of stock");
  const link = checkAffiliateLink(pin.link, config.amazon.partnerTag, product.asin);
  if (!link.valid) errors.push(`Affiliate link invalid: ${link.reason}`);
  if (!pin.image_file || !readMedia(pin.image_file)) errors.push("Pin image is missing");
  return errors;
}

// ─── Editing & approval ──────────────────────────────────────────────
export async function updatePinContent(
  pinId: string,
  input: { title: string; description: string; headline: string; subheadline: string | null; board: string; link: string; altText: string; keywords: string[] },
) {
  const pin = await getPin(pinId);
  if (!pin) throw new Error("Pin not found");
  if (!["draft", "approved", "scheduled", "failed"].includes(pin.status)) throw new Error(`A ${pin.status} pin can no longer be edited`);
  const product = await getProduct(pin.product_id);
  const compliant = applyCompliance({
    title: input.title,
    description: input.description,
    headline: input.headline,
    subheadline: input.subheadline,
    altText: input.altText,
    sensitiveCategory: product ? CATEGORIES[product.category].sensitiveClaims : false,
  });
  const headlineChanged = compliant.headline !== pin.headline || compliant.subheadline !== pin.subheadline;
  await updatePinFields(pinId, {
    title: compliant.title,
    description: compliant.description,
    headline: compliant.headline,
    subheadline: compliant.subheadline,
    alt_text: compliant.altText,
    board: input.board,
    link: input.link.trim(),
    keywords: input.keywords,
    compliance_flags: compliant.flags,
  });
  await audit("info", "user", "pin.edit", `Edited pin ${pinId}`, { entityType: "pin", entityId: pinId });
  return { headlineChanged };
}

export async function approvePin(pinId: string, actor: "user" | "worker" = "user") {
  const pin = await getPin(pinId);
  if (!pin) throw new Error("Pin not found");
  const errors = await prePublishChecks(pin);
  if (errors.length) throw new Error(`Cannot approve: ${errors.join("; ")}`);
  const ok = await transitionPin(pinId, ["draft", "failed", "rejected"], "approved", { approved_at: nowIso(), last_error: null, attempts: 0 });
  if (!ok) throw new Error(`Pin is ${pin.status} and cannot be approved`);
  await audit("info", actor, "pin.approve", `Approved pin ${pinId}`, { entityType: "pin", entityId: pinId });
  await scheduleApprovedPins(actor);
}

export async function rejectPin(pinId: string, actor: "user" | "worker" = "user") {
  const ok = await transitionPin(pinId, ["draft", "approved", "scheduled", "failed"], "rejected", { scheduled_for: null });
  if (!ok) throw new Error("Pin cannot be rejected in its current state");
  await audit("info", actor, "pin.reject", `Rejected pin ${pinId}`, { entityType: "pin", entityId: pinId });
}

export async function unschedulePin(pinId: string) {
  const ok = await transitionPin(pinId, ["scheduled", "approved"], "draft", { scheduled_for: null, approved_at: null });
  if (!ok) throw new Error("Only approved or scheduled pins can be moved back to drafts");
  await audit("info", "user", "pin.unschedule", `Moved pin ${pinId} back to drafts`, { entityType: "pin", entityId: pinId });
}

// ─── Scheduling ──────────────────────────────────────────────────────
async function occupiedSlots(): Promise<OccupiedSlot[]> {
  const pins = await listPins({ status: ACTIVE, limit: 5000 });
  return pins
    .map((p) => ({ at: new Date(p.scheduled_for ?? p.sent_at ?? p.published_at ?? p.updated_at), productId: p.product_id, style: p.style }))
    .filter((s) => !Number.isNaN(s.at.getTime()));
}

export async function scheduleApprovedPins(actor: "user" | "worker" = "worker") {
  const settings = await getSettings();
  const approved = (await listPins({ status: "approved", limit: 500 })).sort((a, b) =>
    (a.approved_at ?? a.created_at).localeCompare(b.approved_at ?? b.created_at),
  );
  if (!approved.length) return { summary: "no approved pins waiting for a slot" };
  const assignments = assignSlots(
    approved.map((p) => ({ id: p.id, productId: p.product_id, style: p.style })),
    await occupiedSlots(),
    settings.schedule,
    new Date(),
    config.timezone,
    90,
    config.publishBlackouts,
  );
  for (const a of assignments) {
    await transitionPin(a.pinId, ["approved"], "scheduled", { scheduled_for: a.at.toISOString() });
    await audit("info", actor, "pin.schedule", `Scheduled pin ${a.pinId} for ${a.at.toISOString()}`, { entityType: "pin", entityId: a.pinId });
  }
  const left = approved.length - assignments.length;
  return { summary: `scheduled ${assignments.length} pins${left ? `, ${left} waiting (cooldown/daily limit)` : ""}` };
}

/** Re-plans all future scheduled pins (after changing the schedule settings). */
export async function replanSchedule() {
  const db = await getDb();
  await db.run(`UPDATE pins SET status = 'approved', scheduled_for = NULL, updated_at = ? WHERE status = 'scheduled'`, [nowIso()]);
  await audit("info", "user", "schedule.replan", "Cleared future slots to re-plan with new settings");
  return scheduleApprovedPins("user");
}

// ─── Publishing ──────────────────────────────────────────────────────
async function sentToday(): Promise<number> {
  const today = zonedDateKey(new Date(), config.timezone);
  const pins = await listPins({ status: ["sending", "sent", "published"], limit: 200 });
  return pins.filter((p) => p.sent_at && zonedDateKey(new Date(p.sent_at), config.timezone) === today).length;
}

async function sendOne(pin: Pin, actor: "user" | "worker"): Promise<"sent" | "failed" | "retry" | "skipped"> {
  const errors = await prePublishChecks(pin);
  if (errors.length) {
    await transitionPin(pin.id, ["scheduled"], "failed", { last_error: errors.join("; "), scheduled_for: null });
    await audit("error", actor, "pin.publish", `Blocked pin ${pin.id}: ${errors.join("; ")}`, { entityType: "pin", entityId: pin.id });
    return "failed";
  }
  if (!(await transitionPin(pin.id, ["scheduled"], "sending", { attempts: pin.attempts + 1 }))) return "skipped";

  const settings = await getSettings();
  const board = settings.boards.find((b) => b.name === pin.board);
  const payload = buildPayload(pin, board);
  const res = await sendToZapier(payload);
  if (res.ok && res.pinterestPinId) {
    // The automation answered with the created pin: it is confirmed live.
    await transitionPin(pin.id, ["sending"], "published", {
      sent_at: nowIso(),
      published_at: nowIso(),
      pinterest_pin_id: res.pinterestPinId,
      pinterest_url: res.pinterestUrl ?? null,
      last_error: null,
    });
    await audit("info", actor, "pin.published", `Pin ${pin.id} is live on Pinterest (${res.pinterestPinId})`, {
      entityType: "pin",
      entityId: pin.id,
      details: { image_url: payload.image_url },
    });
    return "sent";
  }
  if (res.ok) {
    await transitionPin(pin.id, ["sending"], "sent", { sent_at: nowIso(), last_error: null });
    await audit("info", actor, "pin.publish", `Sent pin ${pin.id} to Zapier (board "${pin.board}")`, {
      entityType: "pin",
      entityId: pin.id,
      details: { zapier_request_id: res.requestId, image_url: payload.image_url },
    });
    return "sent";
  }
  const attempts = pin.attempts + 1;
  if (attempts >= MAX_ATTEMPTS) {
    await transitionPin(pin.id, ["sending"], "failed", { last_error: res.error });
    await audit("error", actor, "pin.publish", `Pin ${pin.id} failed after ${attempts} attempts: ${res.error}`, { entityType: "pin", entityId: pin.id });
    return "failed";
  }
  const retryAt = new Date(Date.now() + 30 * 60_000 * attempts).toISOString();
  await transitionPin(pin.id, ["sending"], "scheduled", { last_error: res.error, scheduled_for: retryAt });
  await audit("warn", actor, "pin.publish", `Pin ${pin.id} send failed (attempt ${attempts}), retrying at ${retryAt}: ${res.error}`, {
    entityType: "pin",
    entityId: pin.id,
  });
  return "retry";
}

/** Sends due scheduled pins to Zapier, respecting pause, daily limit and per-run throttle. */
export async function publishDuePins(actor: "user" | "worker" = "worker") {
  const settings = await getSettings();
  if (settings.schedule.paused) return { summary: "skipped: publishing is paused" };
  if (!config.zapier.configured) return { summary: "skipped: pin webhook not configured" };
  if (inBlackout(new Date(), config.publishBlackouts, config.timezone)) {
    return { summary: "skipped: inside a publishing blackout window" };
  }

  // Recover pins stuck in "sending" (e.g. process crashed mid-request) after 15 minutes.
  for (const p of await listPins({ status: "sending", limit: 50 })) {
    if (Date.now() - new Date(p.updated_at).getTime() > 15 * 60_000) {
      await transitionPin(p.id, ["sending"], "failed", { last_error: "Interrupted while sending — check Zapier history before retrying" });
    }
  }

  const due = (await listPins({ status: "scheduled", limit: 100 }))
    .filter((p) => p.scheduled_for && new Date(p.scheduled_for).getTime() <= Date.now())
    .sort((a, b) => a.scheduled_for!.localeCompare(b.scheduled_for!));
  if (!due.length) return { summary: "no pins due" };

  let budget = Math.min(MAX_SENDS_PER_RUN, settings.schedule.pinsPerDay - (await sentToday()));
  const outcome = { sent: 0, failed: 0, retry: 0, deferred: 0 };
  for (const pin of due) {
    if (budget <= 0) {
      outcome.deferred++;
      continue;
    }
    const r = await sendOne(pin, actor);
    if (r === "sent") budget--;
    if (r !== "skipped") outcome[r]++;
  }
  if (outcome.deferred) await scheduleOverflow();
  return { summary: `sent ${outcome.sent}, failed ${outcome.failed}, retrying ${outcome.retry}, deferred ${outcome.deferred}` };
}

/** Pins that missed their slot because of the daily limit go back to the slot planner. */
async function scheduleOverflow() {
  const due = (await listPins({ status: "scheduled", limit: 100 })).filter(
    (p) => p.scheduled_for && new Date(p.scheduled_for).getTime() <= Date.now(),
  );
  for (const p of due) await transitionPin(p.id, ["scheduled"], "approved", { scheduled_for: null });
  await scheduleApprovedPins("worker");
}

/** Manual override from the dashboard: send one approved/scheduled pin immediately. */
export async function sendPinNow(pinId: string) {
  const pin = await getPin(pinId);
  if (!pin) throw new Error("Pin not found");
  if (!config.zapier.configured) throw new Error("Zapier webhook is not configured (Settings → Zapier)");
  if (pin.status === "approved") await transitionPin(pinId, ["approved"], "scheduled", { scheduled_for: nowIso() });
  else if (pin.status !== "scheduled") throw new Error(`Only approved or scheduled pins can be sent (this one is ${pin.status})`);
  await audit("info", "user", "pin.send_now", `Manual send requested for pin ${pinId}`, { entityType: "pin", entityId: pinId });
  const fresh = (await getPin(pinId))!;
  const r = await sendOne(fresh, "user");
  if (r !== "sent") throw new Error((await getPin(pinId))?.last_error ?? `Send ${r}`);
}

/** Moves a failed pin back to approved so it is planned again. */
export async function retryFailedPin(pinId: string) {
  const pin = await getPin(pinId);
  if (!pin || pin.status !== "failed") throw new Error("Only failed pins can be retried");
  await approvePin(pinId);
}

// ─── Optional auto-approval (off by default) ─────────────────────────
export async function autoApproveDrafts() {
  const settings = await getSettings();
  if (settings.requireApproval) return { summary: "approval required: auto-approve disabled" };
  let n = 0;
  for (const pin of await listPins({ status: "draft", limit: 100 })) {
    if (pin.compliance_flags.length) continue; // anything flagged always needs a human
    if ((await prePublishChecks(pin)).length) continue;
    try {
      await approvePin(pin.id, "worker");
      n++;
    } catch {
      /* logged by approvePin path */
    }
  }
  return { summary: `auto-approved ${n} unflagged drafts` };
}

// ─── Zapier callback ─────────────────────────────────────────────────
export interface ZapierCallback {
  pin_id?: string;
  callback_token?: string;
  status?: string;
  pinterest_pin_id?: string;
  pinterest_url?: string;
  error?: string;
}

export async function handleZapierCallback(body: ZapierCallback): Promise<{ ok: boolean; message: string; httpStatus: number }> {
  if (!body.pin_id || !body.callback_token) return { ok: false, message: "pin_id and callback_token are required", httpStatus: 400 };
  if (!verifyCallbackToken(body.pin_id, body.callback_token)) {
    await audit("warn", "zapier", "zapier.callback", `Rejected callback with invalid token for ${body.pin_id}`);
    return { ok: false, message: "invalid token", httpStatus: 401 };
  }
  const pin = await getPin(body.pin_id);
  if (!pin) return { ok: false, message: "unknown pin", httpStatus: 404 };

  const failed = body.status && /fail|error/i.test(body.status);
  if (failed) {
    await transitionPin(pin.id, ["sent", "sending"], "failed", { last_error: `Zapier reported: ${body.error ?? body.status}` });
    await audit("error", "zapier", "zapier.callback", `Zapier reported failure for ${pin.id}: ${body.error ?? body.status}`, { entityType: "pin", entityId: pin.id });
    return { ok: true, message: "recorded failure", httpStatus: 200 };
  }

  const pinterestId = body.pinterest_pin_id?.toString().replace(/[^0-9]/g, "") || null;
  const url = body.pinterest_url ?? (pinterestId ? `https://www.pinterest.com/pin/${pinterestId}/` : null);
  const ok = await transitionPin(pin.id, ["sent", "sending"], "published", {
    published_at: nowIso(),
    pinterest_pin_id: pinterestId,
    pinterest_url: url,
    last_error: null,
  });
  if (!ok && pin.status !== "published") return { ok: false, message: `pin is ${pin.status}`, httpStatus: 409 };
  await audit("info", "zapier", "pin.published", `Zapier confirmed pin ${pin.id} is live${pinterestId ? ` (Pinterest ${pinterestId})` : ""}`, {
    entityType: "pin",
    entityId: pin.id,
  });
  return { ok: true, message: "recorded", httpStatus: 200 };
}

/**
 * Puts pins that were delivered to Zapier but never confirmed back in the queue so they are
 * sent again. Used to recover pins after a Zap problem; only pins sent before `sentBefore`
 * are affected, so later (working) sends are never duplicated.
 */
export async function requeueUnconfirmed(sentBefore: string, actor: "user" | "worker" = "worker", pinIds?: string[]) {
  const cutoff = new Date(sentBefore);
  if (Number.isNaN(cutoff.getTime())) throw new Error("sentBefore must be an ISO date");
  const pins = (await listPins({ status: "sent", limit: 500 })).filter(
    (p) => p.sent_at && new Date(p.sent_at) < cutoff && (!pinIds || pinIds.includes(p.id)),
  );
  for (const p of pins) {
    await transitionPin(p.id, ["sent"], "scheduled", { scheduled_for: nowIso(), sent_at: null, attempts: 0, last_error: null });
    await audit("warn", actor, "pin.requeue", `Re-queued pin ${p.id} (sent ${p.sent_at}, never confirmed by Zapier)`, { entityType: "pin", entityId: p.id });
  }
  return { requeued: pins.map((p) => p.id) };
}
