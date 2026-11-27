"use client";
import Link from "next/link";
import { STAGES } from "@/lib/types";
import { Badge, ErrorBox, usePoll } from "../ui";

interface Row {
  id: string;
  topic: string;
  status: string;
  stages: Record<string, string>;
  duration?: number;
  qcOk?: boolean;
  spend: number;
  createdAt: string;
}

export default function ProductionPage() {
  const { data, error } = usePoll<{ projects: Row[] }>("/api/projects", 3000);
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-black">Video Production</h1>
        <p className="text-sm text-white/60">Every approved topic moves through these stages automatically. Click a project to preview, regenerate sections or export.</p>
      </header>
      <ErrorBox error={error} />
      <div className="space-y-3">
        {data?.projects.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`} className="card block hover:bg-white/[0.06]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-bold">{p.topic}</div>
              <div className="flex items-center gap-3 text-xs text-white/60">
                {p.duration ? `${p.duration.toFixed(1)}s` : ""}
                {p.qcOk !== undefined && <span className={p.qcOk ? "text-emerald-300" : "text-rose-300"}>QC {p.qcOk ? "passed" : "failed"}</span>}
                <span>${p.spend.toFixed(3)}</span>
                <Badge status={p.status} />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-1 md:grid-cols-8">
              {STAGES.map((s) => (
                <div key={s} className="flex flex-col items-center gap-1">
                  <div
                    className={`h-1.5 w-full rounded-full ${
                      p.stages[s] === "done" ? "bg-emerald-400" : p.stages[s] === "running" ? "animate-pulse bg-amber-400" : p.stages[s] === "failed" ? "bg-rose-500" : "bg-white/10"
                    }`}
                  />
                  <span className="text-[10px] uppercase tracking-wide text-white/50">{s}</span>
                </div>
              ))}
            </div>
          </Link>
        ))}
        {data && !data.projects.length && <div className="text-sm text-white/50">No projects yet. Approve an idea to start one.</div>}
      </div>
    </div>
  );
}
