import { Queue, QueueEvents } from "bullmq";
import IORedis from "ioredis";
import type { RunRequest } from "./pipeline/run";

export const QUEUE_NAME = "ai-versus-production";

let conn: IORedis | null = null;
export function redis(): IORedis {
  if (!conn) {
    conn = new IORedis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
      maxRetriesPerRequest: null, // required by BullMQ workers
      lazyConnect: false,
    });
  }
  return conn;
}

let q: Queue<RunRequest> | null = null;
export function productionQueue(): Queue<RunRequest> {
  if (!q) q = new Queue<RunRequest>(QUEUE_NAME, { connection: redis() });
  return q;
}

/** Enqueue a pipeline run. One job per project at a time (jobId is per request). */
export async function enqueueRun(req: RunRequest) {
  const job = await productionQueue().add("run", req, {
    jobId: `${req.projectId}-${Date.now()}`,
    attempts: 1,
    removeOnComplete: 200,
    removeOnFail: 200,
  });
  return job.id!;
}

export async function queueHealth() {
  try {
    const counts = await productionQueue().getJobCounts("active", "waiting", "completed", "failed", "delayed");
    const workers = await productionQueue().getWorkers();
    return { ok: true, counts, workers: workers.length };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e), counts: {}, workers: 0 };
  }
}

export { QueueEvents };
