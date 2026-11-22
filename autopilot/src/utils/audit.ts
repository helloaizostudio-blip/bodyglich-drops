import { getDb } from "@/database/client";
import type { AuditEntry, JobRun } from "@/database/types";
import { newId, nowIso } from "./ids";

type Actor = AuditEntry["actor"];
type Level = AuditEntry["level"];

const SECRET_KEYS = /secret|token|password|authorization|api[_-]?key/i;

/** Removes anything that looks like a credential before details are written to the log. */
function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, SECRET_KEYS.test(k) ? "[redacted]" : redact(v)]),
    );
  }
  return value;
}

/** Writes an entry to the audit log. Every automated action should call this. Never throws. */
export async function audit(
  level: Level,
  actor: Actor,
  action: string,
  message: string,
  opts: { entityType?: string; entityId?: string; details?: unknown } = {},
): Promise<void> {
  try {
    const db = await getDb();
    await db.run(
      `INSERT INTO audit_log (id, ts, level, actor, action, entity_type, entity_id, message, details)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newId("log"),
        nowIso(),
        level,
        actor,
        action,
        opts.entityType ?? null,
        opts.entityId ?? null,
        message.slice(0, 2000),
        opts.details === undefined ? null : JSON.stringify(redact(opts.details)).slice(0, 8000),
      ],
    );
  } catch (err) {
    console.error("[audit] failed to write log entry", err);
  }
  const line = `[${level}] ${actor}:${action} ${message}`;
  if (level === "error") console.error(line);
  else if (process.env.NODE_ENV !== "test") console.log(line);
}

export async function listAudit(limit = 200, level?: Level): Promise<AuditEntry[]> {
  const db = await getDb();
  return level
    ? db.all<AuditEntry>(`SELECT * FROM audit_log WHERE level = ? ORDER BY ts DESC LIMIT ?`, [level, limit])
    : db.all<AuditEntry>(`SELECT * FROM audit_log ORDER BY ts DESC LIMIT ?`, [limit]);
}

/** Wraps a background job: records a job_runs row and audit entries for start/finish/failure. */
export async function runJob<T extends { summary: string }>(
  job: string,
  actor: Actor,
  fn: () => Promise<T>,
): Promise<T | { summary: string; error: string }> {
  const db = await getDb();
  const id = newId("job");
  await db.run(`INSERT INTO job_runs (id, job, started_at, status) VALUES (?, ?, ?, 'running')`, [id, job, nowIso()]);
  try {
    const result = await fn();
    await db.run(`UPDATE job_runs SET finished_at = ?, status = 'ok', summary = ? WHERE id = ?`, [
      nowIso(),
      result.summary,
      id,
    ]);
    await audit("info", actor, `job.${job}`, result.summary, { entityType: "job", entityId: id });
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db.run(`UPDATE job_runs SET finished_at = ?, status = 'error', error = ? WHERE id = ?`, [nowIso(), msg, id]);
    await audit("error", actor, `job.${job}`, `Job failed: ${msg}`, { entityType: "job", entityId: id });
    return { summary: "failed", error: msg };
  }
}

export async function listJobRuns(limit = 50): Promise<JobRun[]> {
  const db = await getDb();
  return db.all<JobRun>(`SELECT * FROM job_runs ORDER BY started_at DESC LIMIT ?`, [limit]);
}
