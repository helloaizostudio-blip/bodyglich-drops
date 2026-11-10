import "server-only";
import path from "node:path";
import fs from "node:fs";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

/**
 * Database access.
 *
 * - With DATABASE_URL set, FRAMEFORGE talks to a real Postgres server (Neon, Supabase, Railway…).
 * - Without it, an embedded Postgres (PGlite) is stored on disk under DATA_DIR. That keeps local
 *   development and single-server deployments zero-config while using the exact same SQL schema.
 *
 * Migrations in ./drizzle are applied automatically the first time the database is opened.
 */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

type Holder = { promise?: Promise<Db> };
const holder: Holder = ((globalThis as unknown as { __ffDb?: Holder }).__ffDb ??= {});

export function dataDir(): string {
  return path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR || ".data");
}

const migrationsFolder = () => path.join(process.cwd(), "drizzle");

/**
 * Connection string resolution:
 *  1. DATABASE_URL — any PostgreSQL server; migrations in ./drizzle are applied at startup.
 *  2. Netlify Database (NETLIFY_DB_URL, provisioned automatically on Netlify) — its migrations live in
 *     ./netlify/database/migrations and are applied by Netlify during each deploy, so the app does not
 *     run migrations itself there.
 */
async function resolveConnection(): Promise<{ url: string; managedMigrations: boolean } | null> {
  if (process.env.DATABASE_URL) return { url: process.env.DATABASE_URL, managedMigrations: false };
  if (process.env.NETLIFY_DB_URL) return { url: process.env.NETLIFY_DB_URL, managedMigrations: true };
  if (process.env.NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT) {
    try {
      const { getConnectionString } = await import("@netlify/database");
      return { url: getConnectionString(), managedMigrations: true };
    } catch (err) {
      throw new Error(`FRAMEFORGE is running on Netlify but no database is available: ${err instanceof Error ? err.message : err}`);
    }
  }
  return null;
}

async function open(): Promise<Db> {
  const conn = await resolveConnection();
  const url = conn?.url;
  if (conn && url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const ssl = /sslmode=disable/.test(url) || /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false };
    // Serverless functions run many small instances, so keep each one's pool tiny.
    const max = Math.max(1, Number(process.env.DATABASE_POOL_MAX) || (conn.managedMigrations ? 2 : 5));
    const pool = new Pool({ connectionString: url, max, ssl, idleTimeoutMillis: 20_000 });
    const db = drizzle(pool, { schema });
    if (!conn.managedMigrations) await migrate(db, { migrationsFolder: migrationsFolder() });
    return db as unknown as Db;
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dir = path.join(dataDir(), "pglite");
  fs.mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: migrationsFolder() });
  return db as unknown as Db;
}

export function getDb(): Promise<Db> {
  if (!holder.promise) {
    holder.promise = open().catch((err) => {
      holder.promise = undefined;
      throw err;
    });
  }
  return holder.promise;
}

export function databaseMode(): "postgres" | "embedded" {
  return process.env.DATABASE_URL || process.env.NETLIFY_DB_URL || process.env.NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT ? "postgres" : "embedded";
}

export { schema };
