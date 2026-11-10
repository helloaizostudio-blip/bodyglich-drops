import "server-only";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { actionCtx, AuthError, type Ctx } from "@/server/auth";
import type { Result } from "@/lib/result";

/** Error whose message is safe to show to the user. */
export class UserError extends Error {}

/**
 * Wraps a server action with: authentication, zod input validation, error capture
 * (returned as a typed Result so the UI can show a real message) and a router refresh.
 */
export function action<S extends z.ZodType, T>(
  schema: S,
  fn: (input: z.output<S>, ctx: Ctx) => Promise<T>,
  opts: { revalidate?: boolean } = {},
) {
  return async (raw: z.input<S>): Promise<Result<T>> => {
    try {
      const ctx = await actionCtx();
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        const where = issue?.path.length ? `${issue.path.join(".")}: ` : "";
        return { ok: false, error: `${where}${issue?.message ?? "Invalid input"}` };
      }
      const data = await fn(parsed.data, ctx);
      if (opts.revalidate !== false) revalidatePath("/", "layout");
      return { ok: true, data };
    } catch (err) {
      if (err instanceof UserError || err instanceof AuthError) return { ok: false, error: err.message };
      console.error("[action failed]", err);
      return { ok: false, error: "Something went wrong on the server. Please try again." };
    }
  };
}

export const zId = z.string().min(1).max(64);
export const zText = (max = 20000) => z.string().trim().max(max);
export const zName = z.string().trim().min(1, "Name is required").max(120);
export const zPalette = z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).max(12);
