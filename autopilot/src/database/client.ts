import fs from "node:fs";
import path from "node:path";
import { config } from "@/utils/config";
import { migrations } from "./migrations";

export type Row = Record<string, unknown>;
export type Param = string | number | null;

/** Minimal async DB interface implemented for SQLite and PostgreSQL. SQL uses `?` placeholders. */
export interface Db {
  dialect: "sqlite" | "postgres";
  all<T = Row>(sql: string, params?: Param[]): Promise<T[]>;
  get<T = Row>(sql: string, params?: Param[]): Promise<T | undefined>;
  run(sql: string, params?: Param[]): Promise<{ changes: number }>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}

async function createSqlite(file: string): Promise<Db> {
  const { default: Database } = await import("better-sqlite3");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  return {
    dialect: "sqlite",
    async all<T>(sql: string, params: Param[] = []) {
      return db.prepare(sql).all(...params) as T[];
    },
    async get<T>(sql: string, params: Param[] = []) {
      return db.prepare(sql).get(...params) as T | undefined;
    },
    async run(sql: string, params: Param[] = []) {
      return { changes: db.prepare(sql).run(...params).changes };
    },
    async exec(sql: string) {
      db.exec(sql);
    },
    async close() {
      db.close();
    },
  };
}

/** Converts `?` placeholders to `$1, $2, …` for PostgreSQL. */
export function toPgPlaceholders(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

async function createPostgres(url: string): Promise<Db> {
  const { default: pg } = await import("pg");
  // Return COUNT(*) etc. as JS numbers instead of strings.
  pg.types.setTypeParser(20, (v: string) => Number(v));
  pg.types.setTypeParser(1700, (v: string) => Number(v));
  const pool = new pg.Pool({ connectionString: url, max: 5 });
  return {
    dialect: "postgres",
    async all<T>(sql: string, params: Param[] = []) {
      return (await pool.query(toPgPlaceholders(sql), params)).rows as T[];
    },
    async get<T>(sql: string, params: Param[] = []) {
      return (await pool.query(toPgPlaceholders(sql), params)).rows[0] as T | undefined;
    },
    async run(sql: string, params: Param[] = []) {
      const r = await pool.query(toPgPlaceholders(sql), params);
      return { changes: r.rowCount ?? 0 };
    },
    async exec(sql: string) {
      await pool.query(sql);
    },
    async close() {
      await pool.end();
    },
  };
}

async function migrate(db: Db) {
  await db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`);
  const applied = new Set((await db.all<{ id: string }>(`SELECT id FROM schema_migrations`)).map((r) => r.id));
  for (const m of migrations) {
    if (applied.has(m.id)) continue;
    await db.exec(m.sql);
    await db.run(`INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)`, [m.id, new Date().toISOString()]);
  }
}

// One shared connection per process (survives Next.js dev hot reloads).
const g = globalThis as unknown as { __autopilotDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (!g.__autopilotDb) {
    g.__autopilotDb = (async () => {
      const url = config.databaseUrl;
      const db =
        url && /^postgres(ql)?:\/\//.test(url) ? await createPostgres(url) : await createSqlite(config.sqlitePath);
      await migrate(db);
      return db;
    })().catch((err) => {
      g.__autopilotDb = undefined;
      throw err;
    });
  }
  return g.__autopilotDb;
}

/** For tests/scripts: close and forget the cached connection. */
export async function closeDb() {
  if (g.__autopilotDb) {
    const db = await g.__autopilotDb;
    g.__autopilotDb = undefined;
    await db.close();
  }
}
