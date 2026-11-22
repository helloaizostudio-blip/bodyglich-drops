import { runJob } from "@/utils/audit";
import { refreshProductData, runDiscovery } from "@/services/product-research/discovery";
import { refreshPinterestTrends } from "@/services/trends/pinterest-trends";
import { syncPinterestAnalytics } from "@/services/analytics";
import { autoApproveDrafts, publishDuePins, scheduleApprovedPins } from "./publisher";

type Actor = "user" | "worker";

export interface JobDef {
  key: string;
  label: string;
  /** Croner pattern, evaluated in APP_TIMEZONE. */
  cron: string;
  run: (actor: Actor) => Promise<{ summary: string }>;
}

export const JOBS: JobDef[] = [
  { key: "publish", label: "Publish due pins", cron: "*/10 * * * *", run: (a) => publishDuePins(a) },
  { key: "schedule", label: "Assign slots to approved pins", cron: "5 * * * *", run: (a) => scheduleApprovedPins(a) },
  { key: "auto_approve", label: "Auto-approve (only if approval is disabled)", cron: "15 * * * *", run: () => autoApproveDrafts() },
  { key: "refresh_products", label: "Refresh price & availability", cron: "30 5 * * *", run: (a) => refreshProductData({ actor: a }) },
  { key: "trends", label: "Refresh Pinterest trends", cron: "0 6 * * 1", run: () => refreshPinterestTrends() },
  { key: "discovery", label: "Discover & score products", cron: "15 6 * * *", run: (a) => runDiscovery({ actor: a }) },
  { key: "analytics", label: "Sync Pinterest analytics", cron: "45 7 * * *", run: (a) => syncPinterestAnalytics(a) },
];

const running = new Set<string>();

/** Runs a job by key, never concurrently with itself in the same process. */
export async function runJobByKey(key: string, actor: Actor) {
  const job = JOBS.find((j) => j.key === key);
  if (!job) throw new Error(`Unknown job: ${key}`);
  if (running.has(key)) return { summary: "already running" };
  running.add(key);
  try {
    return await runJob(key, actor, () => job.run(actor));
  } finally {
    running.delete(key);
  }
}
