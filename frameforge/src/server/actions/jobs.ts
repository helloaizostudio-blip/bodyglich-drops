"use server";

import { z } from "zod";
import { action, UserError, zId } from "@/server/action";
import { getJob, updateJob } from "@/server/services/jobs";

/** Polled by the UI while a job is queued or running. */
export const pollJob = action(
  z.object({ id: zId }),
  async (input, ctx) => {
    const job = await getJob(ctx, input.id);
    if (!job) throw new UserError("Job not found.");
    // Video jobs run at the provider: each poll asks it for the real status and collects the clip when ready.
    if (job.kind === "video") {
      const { advanceVideoJob } = await import("@/server/services/animation");
      return advanceVideoJob(ctx, job);
    }
    return job;
  },
  { revalidate: false },
);

export const cancelJob = action(z.object({ id: zId }), async (input, ctx) => {
  const job = await getJob(ctx, input.id);
  if (!job) throw new UserError("Job not found.");
  if (job.status === "queued" || job.status === "running") {
    await updateJob(ctx, job.id, { status: "canceled", finishedAt: new Date() });
  }
  return { id: job.id };
});
