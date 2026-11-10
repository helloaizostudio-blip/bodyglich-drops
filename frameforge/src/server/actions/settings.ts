"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { action, UserError, zText } from "@/server/action";
import { PROVIDER_CAPABILITIES, projects, users } from "@/db/schema";
import { activateProvider, saveProviderSettings } from "@/server/providers/config";
import { verifyProvider } from "@/server/providers";
import { SETTING_KEYS, setSetting } from "@/server/services/settings";
import { hashPassword, verifyPassword } from "@/server/auth";
import { logActivity } from "@/server/services/activity";

const zProviderRef = { capability: z.enum(PROVIDER_CAPABILITIES), providerId: z.string().min(1).max(60) };

export const saveProvider = action(
  z.object({
    ...zProviderRef,
    apiKey: z.string().trim().min(8, "That key looks too short").max(500).optional(),
    config: z.record(z.string().max(60), z.string().max(200)).optional(),
  }),
  async (input, ctx) => {
    await saveProviderSettings(ctx, input.capability, input.providerId, { apiKey: input.apiKey, config: input.config });
    return { ok: true };
  },
);

export const removeProviderKey = action(z.object(zProviderRef), async (input, ctx) => {
  await saveProviderSettings(ctx, input.capability, input.providerId, { removeKey: true });
  return { ok: true };
});

/** Runs the provider's free verification request. Costs nothing; never generates content. */
export const verifyProviderConnection = action(z.object(zProviderRef), async (input, ctx) => {
  const error = await verifyProvider(ctx, input.capability, input.providerId);
  if (!error) {
    await activateProvider(ctx, input.capability, input.providerId);
    await logActivity(ctx, "settings", `Connected ${input.providerId} for ${input.capability} generation`, "/settings");
  }
  return { connected: !error, error };
});

export const updateStudio = action(
  z.object({
    channelName: z.string().trim().min(1, "Channel name is required").max(80),
    styleGuide: zText(6000),
    storyGuide: zText(6000),
  }),
  async (input, ctx) => {
    await ctx.db.update(projects).set({ channelName: input.channelName, name: `${input.channelName} Studio` }).where(eq(projects.id, ctx.project.id));
    await setSetting(ctx, SETTING_KEYS.styleGuide, input.styleGuide);
    await setSetting(ctx, SETTING_KEYS.storyGuide, input.storyGuide);
    return { ok: true };
  },
);

export const updateAccount = action(
  z.object({
    name: z.string().trim().min(1, "Name is required").max(80),
    currentPassword: z.string().max(200).optional(),
    newPassword: z.string().min(8, "New password must be at least 8 characters").max(200).optional(),
  }),
  async (input, ctx) => {
    const patch: { name: string; passwordHash?: string } = { name: input.name };
    if (input.newPassword) {
      if (!input.currentPassword || !verifyPassword(input.currentPassword, ctx.user.passwordHash)) {
        throw new UserError("Your current password is incorrect.");
      }
      patch.passwordHash = hashPassword(input.newPassword);
    }
    await ctx.db.update(users).set(patch).where(eq(users.id, ctx.user.id));
    return { ok: true };
  },
);
