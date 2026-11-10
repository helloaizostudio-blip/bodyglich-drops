import "server-only";
import crypto from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, lt, count } from "drizzle-orm";
import { getDb, type Db } from "@/db";
import { users, sessions, projects, type User, type Project } from "@/db/schema";

export const SESSION_COOKIE = "ff_session";
const SESSION_DAYS = 30;

/* ---------------- password hashing (scrypt) ---------------- */

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = crypto.scryptSync(password, Buffer.from(salt, "base64url"), expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

/* ---------------- sessions ---------------- */

export async function createSession(userId: string): Promise<void> {
  const db = await getDb();
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db.insert(sessions).values({ tokenHash: hashToken(token), userId, expiresAt });
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
  jar.delete(SESSION_COOKIE);
}

export type Ctx = { db: Db; user: User; project: Project };

/** Resolves the signed-in user and their studio workspace, or null. Cached per request. */
export const getCtx = cache(async (): Promise<Ctx | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const [row] = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  if (!row) return null;
  const [project] = await db.select().from(projects).orderBy(projects.createdAt).limit(1);
  if (!project) return null;
  return { db, user: row.user, project };
});

/** For pages: redirects to /login (or /setup on a fresh install) when signed out. */
export async function requireCtx(): Promise<Ctx> {
  const ctx = await getCtx();
  if (ctx) return ctx;
  redirect((await hasAnyUser()) ? "/login" : "/setup");
}

export class AuthError extends Error {
  constructor() {
    super("You are signed out. Please sign in again.");
  }
}

/** For server actions and route handlers: throws instead of redirecting. */
export async function actionCtx(): Promise<Ctx> {
  const ctx = await getCtx();
  if (!ctx) throw new AuthError();
  return ctx;
}

export async function hasAnyUser(): Promise<boolean> {
  const db = await getDb();
  const [row] = await db.select({ n: count() }).from(users);
  return (row?.n ?? 0) > 0;
}

/* ---------------- brute-force guard (per process) ---------------- */

const attempts = new Map<string, { n: number; resetAt: number }>();

export function loginAllowed(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) return true;
  return entry.n < 8;
}

export function recordLoginFailure(key: string): void {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) attempts.set(key, { n: 1, resetAt: now + 10 * 60_000 });
  else entry.n += 1;
}

export function clearLoginFailures(key: string): void {
  attempts.delete(key);
}
