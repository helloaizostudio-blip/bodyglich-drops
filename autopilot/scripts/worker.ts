/**
 * Background worker: runs discovery, data refresh, scheduling, publishing and analytics
 * on their cron schedules. Start alongside the dashboard:
 *
 *   npm run worker
 *
 * Env is loaded from .env.local / .env (same files Next.js uses).
 */
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());

const { Cron } = await import("croner");
const { JOBS, runJobByKey } = await import("@/services/scheduler/jobs");
const { config } = await import("@/utils/config");
const { getDb, closeDb } = await import("@/database/client");
const { audit } = await import("@/utils/audit");

await getDb(); // runs migrations
await audit("info", "worker", "worker.start", `Worker started (timezone ${config.timezone}, ${JOBS.length} jobs)`);

const crons = JOBS.map(
  (job) =>
    new Cron(job.cron, { timezone: config.timezone, protect: true, name: job.key }, async () => {
      const result = await runJobByKey(job.key, "worker");
      console.log(`[worker] ${job.key}: ${result.summary}`);
    }),
);

for (const c of crons) console.log(`[worker] ${c.name?.padEnd(18)} next run ${c.nextRun()?.toISOString()}`);

if (process.argv.includes("--once")) {
  const key = process.argv[process.argv.indexOf("--once") + 1];
  const r = await runJobByKey(key, "worker");
  console.log(`[worker] ${key}: ${r.summary}`);
  crons.forEach((c) => c.stop());
  await closeDb();
  process.exit(0);
}

const shutdown = async () => {
  crons.forEach((c) => c.stop());
  await audit("info", "worker", "worker.stop", "Worker stopped");
  await closeDb();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
