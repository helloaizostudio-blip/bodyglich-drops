import "server-only";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { dataDir } from "@/db";

let cached: Buffer | undefined;

/**
 * Master secret used to encrypt stored provider API keys and to sign upload URLs.
 * Set APP_SECRET in production. Without it, a random secret is generated once and kept in DATA_DIR
 * (or derived from the database credentials on hosts without a persistent disk).
 */
export function secretSource(): "env" | "database" | "file" {
  if (process.env.APP_SECRET && process.env.APP_SECRET.length >= 16) return "env";
  if (process.env.NETLIFY_DB_URL || ((process.env.NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT) && process.env.DATABASE_URL)) return "database";
  return "file";
}

export function appSecret(): Buffer {
  if (cached) return cached;
  const env = process.env.APP_SECRET;
  if (env && env.length >= 16) {
    cached = crypto.createHash("sha256").update(env).digest();
    return cached;
  }
  // Serverless hosts (Netlify) have no persistent disk to keep a generated secret on. There the
  // secret is derived from the database connection string, which is already this installation's
  // most sensitive credential and is stable across deploys. Setting APP_SECRET always takes priority.
  const dbUrl = process.env.NETLIFY_DB_URL || (process.env.NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT ? process.env.DATABASE_URL : undefined);
  if (dbUrl) {
    cached = crypto.createHash("sha256").update(`frameforge-app-secret:${dbUrl}`).digest();
    return cached;
  }
  const file = path.join(dataDir(), "app-secret");
  try {
    cached = Buffer.from(fs.readFileSync(file, "utf8").trim(), "hex");
    if (cached.length === 32) return cached;
  } catch {
    /* generated below */
  }
  cached = crypto.randomBytes(32);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, cached.toString("hex"), { mode: 0o600 });
  return cached;
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", appSecret(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
}

export function decryptSecret(payload: string): string {
  const [v, iv, tag, body] = payload.split(".");
  if (v !== "v1" || !iv || !tag || !body) throw new Error("Stored secret has an unknown format.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", appSecret(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
}

export function sign(value: string): string {
  return crypto.createHmac("sha256", appSecret()).update(value).digest("base64url");
}

export function verifySignature(value: string, signature: string): boolean {
  const expected = Buffer.from(sign(value));
  const given = Buffer.from(signature);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}
