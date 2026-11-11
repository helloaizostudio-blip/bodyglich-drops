import "server-only";
import { and, eq } from "drizzle-orm";
import type { Ctx } from "@/server/auth";
import { providerConfigs, type ProviderCapability, type ProviderConfig } from "@/db/schema";
import { decryptSecret, encryptSecret } from "@/server/secret";
import { PROVIDERS, providerById, type ProviderDescriptor } from "@/lib/provider-catalog";
import { UserError } from "@/server/action";

export type ResolvedProvider = {
  descriptor: ProviderDescriptor;
  apiKey: string;
  config: Record<string, string>;
  keySource: "settings" | "environment";
};

export type ProviderStatusView = {
  id: string;
  capability: ProviderCapability;
  hasKey: boolean;
  keySource: "settings" | "environment" | null;
  keyHint: string | null;
  isActive: boolean;
  status: "not_configured" | "unverified" | "connected" | "error";
  lastVerifiedAt: Date | null;
  lastError: string | null;
  config: Record<string, string>;
};

function withDefaults(descriptor: ProviderDescriptor, config: Record<string, string> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of descriptor.fields) {
    const v = config?.[f.key];
    out[f.key] = v && (!f.options || f.options.some((o) => o.value === v)) ? v : f.default;
  }
  return out;
}

async function rows(ctx: Ctx): Promise<ProviderConfig[]> {
  return ctx.db.select().from(providerConfigs).where(eq(providerConfigs.projectId, ctx.project.id));
}

function keyFor(descriptor: ProviderDescriptor, row: ProviderConfig | undefined): { key: string; source: "settings" | "environment" } | null {
  if (row?.encryptedKey) {
    try {
      return { key: decryptSecret(row.encryptedKey), source: "settings" };
    } catch {
      // Stored with a different APP_SECRET — treat as missing so the user is asked to re-enter it.
    }
  }
  // On Netlify these variables are injected by its AI gateway and are not the studio's own keys.
  const env = process.env.NETLIFY ? undefined : process.env[descriptor.envVar];
  return env ? { key: env, source: "environment" } : null;
}

/** Status of every provider adapter for the Settings screen. Never includes key material. */
export async function providerStatuses(ctx: Ctx): Promise<ProviderStatusView[]> {
  const all = await rows(ctx);
  return PROVIDERS.map((d) => {
    const row = all.find((r) => r.capability === d.capability && r.providerId === d.id);
    const key = keyFor(d, row);
    const othersActive = all.some((r) => r.capability === d.capability && r.isActive && r.providerId !== d.id);
    return {
      id: d.id,
      capability: d.capability,
      hasKey: !!key,
      keySource: key?.source ?? null,
      keyHint: key?.source === "settings" ? (row?.keyHint ?? null) : key ? `from ${d.envVar}` : null,
      isActive: row ? row.isActive : !!key && !othersActive,
      status: !key ? "not_configured" : (row?.status ?? "unverified"),
      lastVerifiedAt: row?.lastVerifiedAt ?? null,
      lastError: row?.lastError ?? null,
      config: withDefaults(d, row?.config),
    };
  });
}

async function upsert(ctx: Ctx, d: ProviderDescriptor, patch: Partial<typeof providerConfigs.$inferInsert>): Promise<ProviderConfig> {
  const [existing] = await ctx.db
    .select()
    .from(providerConfigs)
    .where(and(eq(providerConfigs.projectId, ctx.project.id), eq(providerConfigs.capability, d.capability), eq(providerConfigs.providerId, d.id)))
    .limit(1);
  if (existing) {
    const [row] = await ctx.db.update(providerConfigs).set(patch).where(eq(providerConfigs.id, existing.id)).returning();
    return row;
  }
  const [row] = await ctx.db
    .insert(providerConfigs)
    .values({ projectId: ctx.project.id, capability: d.capability, providerId: d.id, ...patch })
    .returning();
  return row;
}

export function requireDescriptor(capability: ProviderCapability, id: string): ProviderDescriptor {
  const d = providerById(capability, id);
  if (!d) throw new UserError("Unknown provider.");
  return d;
}

export async function saveProviderSettings(
  ctx: Ctx,
  capability: ProviderCapability,
  id: string,
  input: { apiKey?: string; config?: Record<string, string>; removeKey?: boolean },
): Promise<void> {
  const d = requireDescriptor(capability, id);
  const patch: Partial<typeof providerConfigs.$inferInsert> = {};
  if (input.config) patch.config = withDefaults(d, input.config);
  if (input.removeKey) {
    Object.assign(patch, { encryptedKey: null, keyHint: null, status: "unverified", lastVerifiedAt: null, lastError: null });
  } else if (input.apiKey) {
    const key = input.apiKey.trim();
    Object.assign(patch, { encryptedKey: encryptSecret(key), keyHint: `…${key.slice(-4)}`, status: "unverified", lastVerifiedAt: null, lastError: null });
  }
  await upsert(ctx, d, patch);
}

/** Makes this provider the one used for its capability. */
export async function activateProvider(ctx: Ctx, capability: ProviderCapability, id: string): Promise<void> {
  const d = requireDescriptor(capability, id);
  await ctx.db
    .update(providerConfigs)
    .set({ isActive: false })
    .where(and(eq(providerConfigs.projectId, ctx.project.id), eq(providerConfigs.capability, capability)));
  await upsert(ctx, d, { isActive: true });
}

export async function recordVerification(ctx: Ctx, capability: ProviderCapability, id: string, error: string | null): Promise<void> {
  const d = requireDescriptor(capability, id);
  await upsert(ctx, d, { status: error ? "error" : "connected", lastVerifiedAt: new Date(), lastError: error });
}

/** Key + config for a provider regardless of verification state (used by the verification call itself). */
export async function loadProvider(ctx: Ctx, capability: ProviderCapability, id: string): Promise<ResolvedProvider> {
  const d = requireDescriptor(capability, id);
  const all = await rows(ctx);
  const row = all.find((r) => r.capability === capability && r.providerId === id);
  const key = keyFor(d, row);
  if (!key) throw new UserError(`${d.name} has no API key yet. Add one in Settings → AI providers.`);
  return { descriptor: d, apiKey: key.key, config: withDefaults(d, row?.config), keySource: key.source };
}

/**
 * The provider to use for a capability. Throws a clear, user-facing error unless a provider
 * has a key AND has passed verification — nothing is ever generated through an unverified connection.
 */
export async function activeProvider(ctx: Ctx, capability: ProviderCapability): Promise<ResolvedProvider> {
  const statuses = (await providerStatuses(ctx)).filter((s) => s.capability === capability);
  const chosen = statuses.find((s) => s.isActive && s.hasKey) ?? statuses.find((s) => s.hasKey);
  const label = { text: "text", image: "image", video: "video", voice: "voice", render: "render", youtube: "YouTube" }[capability];
  if (!chosen) throw new UserError(`No ${label} generation provider is connected. Add an API key in Settings → AI providers.`);
  if (chosen.status !== "connected") {
    throw new UserError(`The ${label} provider has a key but has not been verified yet. Open Settings → AI providers and tap Verify.`);
  }
  return loadProvider(ctx, capability, chosen.id);
}

/** Lightweight "is this capability usable right now?" for page banners. */
export async function capabilityReady(ctx: Ctx, capability: ProviderCapability): Promise<{ ready: boolean; providerName: string | null; model: string | null }> {
  const statuses = (await providerStatuses(ctx)).filter((s) => s.capability === capability);
  const chosen = statuses.find((s) => s.isActive && s.status === "connected") ?? statuses.find((s) => s.status === "connected");
  if (!chosen) return { ready: false, providerName: null, model: null };
  return { ready: true, providerName: providerById(capability, chosen.id)?.name ?? chosen.id, model: chosen.config.model ?? null };
}
