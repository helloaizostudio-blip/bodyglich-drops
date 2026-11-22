/** Applies database migrations (SQLite or PostgreSQL, depending on DATABASE_URL). */
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());

const { getDb, closeDb } = await import("@/database/client");
const db = await getDb();
const rows = await db.all<{ id: string; applied_at: string }>(`SELECT id, applied_at FROM schema_migrations ORDER BY id`);
console.log(`Database ready (${db.dialect}). Applied migrations:`);
for (const r of rows) console.log(`  ${r.id}  ${r.applied_at}`);
await closeDb();
