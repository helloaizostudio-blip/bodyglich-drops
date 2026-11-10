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

async function open(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const ssl = /sslmode=disable/.test(url) || /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false };
    const pool = new Pool({ connectionString: url, max: 5, ssl });
    const db = drizzle(pool, { schema });
    await migrate(db, { migrationsFolder: migrationsFolder() });
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
  return process.env.DATABASE_URL ? "postgres" : "embedded";
}

export { schema };
