"use server";

import crypto from "node:crypto";
import { z } from "zod";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users, projects } from "@/db/schema";
import {
  clearLoginFailures,
  createSession,
  destroySession,
  hasAnyUser,
  hashPassword,
  loginAllowed,
  recordLoginFailure,
  verifyPassword,
} from "@/server/auth";

export type AuthFormState = { error?: string; values?: Record<string, string> };

const zEmail = z.string().trim().toLowerCase().email("Enter a valid email address").max(200);
const zPassword = z.string().min(8, "Password must be at least 8 characters").max(200);

/** First-run setup: creates the studio owner and the channel workspace. Only works while no user exists. */
export async function setupStudio(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const values = {
    name: String(form.get("name") ?? ""),
    email: String(form.get("email") ?? ""),
    channel: String(form.get("channel") ?? ""),
  };
  const parsed = z
    .object({
      name: z.string().trim().min(1, "Enter your name").max(80),
      email: zEmail,
      password: zPassword,
      channel: z.string().trim().min(1, "Enter your channel name").max(80),
    })
    .safeParse({ ...values, password: form.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, values };
  if (await hasAnyUser()) return { error: "This studio is already set up. Please sign in instead.", values };
  // On a public URL, SETUP_CODE stops a stranger from claiming the studio before its owner does.
  const required = process.env.SETUP_CODE?.trim();
  if (required) {
    const given = Buffer.from(String(form.get("setupCode") ?? "").trim());
    const expected = Buffer.from(required);
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return { error: "That setup code is not correct.", values };
  }

  const db = await getDb();
  const [user] = await db
    .insert(users)
    .values({ name: parsed.data.name, email: parsed.data.email, passwordHash: hashPassword(parsed.data.password), role: "owner" })
    .returning();
  await db.insert(projects).values({ name: `${parsed.data.channel} Studio`, channelName: parsed.data.channel, ownerId: user.id });
  await createSession(user.id);
  redirect("/");
}

export async function signIn(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const values = { email: String(form.get("email") ?? "") };
  const parsed = z.object({ email: zEmail, password: z.string().min(1).max(200) }).safeParse({ ...values, password: form.get("password") });
  if (!parsed.success) return { error: "Enter your email and password.", values };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const key = `${ip}:${parsed.data.email}`;
  if (!loginAllowed(key)) return { error: "Too many attempts. Please wait a few minutes and try again.", values };

  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    recordLoginFailure(key);
    return { error: "Incorrect email or password.", values };
  }
  clearLoginFailures(key);
  await createSession(user.id);
  redirect("/");
}

export async function signOut(): Promise<void> {
  await destroySession();
  redirect("/login");
}
