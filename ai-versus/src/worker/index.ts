/**
 * Production worker: consumes pipeline jobs from BullMQ and runs them.
 *   npm run worker
 */
import { Worker } from "bullmq";
import { runPipeline, type RunRequest } from "../lib/pipeline/run";
import { QUEUE_NAME, redis } from "../lib/queue";
import { getProject, saveProject } from "../lib/store";

const concurrency = Number(process.env.WORKER_CONCURRENCY || 1);

const worker = new Worker<RunRequest>(
  QUEUE_NAME,
  async (job) => {
    const log = (m: string) => {
      console.log(`[${job.data.projectId.slice(0, 8)}] ${m}`);
      void job.log(m);
    };
    log(`starting run ${JSON.stringify(job.data)}`);
    const p = await runPipeline(job.data, log);
    return { status: p.status, outputKey: p.outputKey, qcOk: p.qc?.ok };
  },
  { connection: redis(), concurrency, lockDuration: 10 * 60_000 },
);

worker.on("failed", async (job, err) => {
  console.error(`job ${job?.id} failed: ${err.message}`);
  if (job) {
    const p = await getProject(job.data.projectId);
    if (p && p.status !== "failed") {
      p.status = "failed";
      await saveProject(p);
    }
  }
});
worker.on("completed", (job, res) => console.log(`job ${job.id} completed`, res));
worker.on("ready", () => console.log(`worker ready (queue "${QUEUE_NAME}", concurrency ${concurrency})`));

const stop = async () => {
  await worker.close();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
