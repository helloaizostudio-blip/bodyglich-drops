"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import type { GenerationJob, JobStatus } from "@/db/schema";
import { pollJob } from "@/server/actions/jobs";
import { Badge } from "@/components/ui/misc";

const isActive = (s: JobStatus) => s === "queued" || s === "running";

/**
 * Keeps a list of generation jobs live: polls the ones that are queued or running and refreshes
 * the page data once any of them finishes, so results appear without a manual reload.
 */
export function useJobs(initial: GenerationJob[], intervalMs = 3000) {
  const router = useRouter();
  const [jobs, setJobs] = useState<GenerationJob[]>(initial);
  const ref = useRef(jobs);
  ref.current = jobs;

  // Server data wins for jobs it knows about; jobs added locally (just started) are kept until it catches up.
  useEffect(() => {
    setJobs((local) => {
      const fresh = new Map(initial.map((j) => [j.id, j]));
      const extra = local.filter((j) => !fresh.has(j.id));
      return [...extra, ...initial];
    });
  }, [initial]);

  const anyActive = jobs.some((j) => isActive(j.status));
  useEffect(() => {
    if (!anyActive) return;
    let stopped = false;
    const tick = async () => {
      const active = ref.current.filter((j) => isActive(j.status));
      let finished = false;
      for (const job of active) {
        const res = await pollJob({ id: job.id }).catch(() => null);
        if (stopped || !res?.ok) continue;
        if (!isActive(res.data.status)) finished = true;
        setJobs((all) => all.map((j) => (j.id === res.data.id ? res.data : j)));
      }
      if (finished && !stopped) router.refresh();
    };
    const timer = setInterval(() => void tick(), intervalMs);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [anyActive, intervalMs, router]);

  const add = useCallback((job: GenerationJob) => setJobs((all) => [job, ...all.filter((j) => j.id !== job.id)]), []);
  return { jobs, add, anyActive };
}

export function JobBadge({ job }: { job: Pick<GenerationJob, "status" | "progress"> }) {
  if (job.status === "queued")
    return (
      <Badge tone="gray">
        <Clock className="size-3" /> Queued
      </Badge>
    );
  if (job.status === "running")
    return (
      <Badge tone="blue">
        <Loader2 className="size-3 animate-spin" /> Generating{typeof job.progress === "number" && job.progress > 0 ? ` ${Math.round(job.progress * 100)}%` : "…"}
      </Badge>
    );
  if (job.status === "succeeded")
    return (
      <Badge tone="ok">
        <CheckCircle2 className="size-3" /> Done
      </Badge>
    );
  if (job.status === "failed")
    return (
      <Badge tone="bad">
        <AlertTriangle className="size-3" /> Failed
      </Badge>
    );
  return (
    <Badge tone="gray">
      <XCircle className="size-3" /> Canceled
    </Badge>
  );
}
