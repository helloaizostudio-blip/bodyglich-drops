"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clapperboard, Download, Send, ServerOff } from "lucide-react";
import type { GenerationJob, JobStatus, RenderSettings } from "@/db/schema";
import type { FfmpegStatus, RenderJobView } from "@/server/services/render";
import { saveRenderSettings, setFinalVideo, startEpisodeRender } from "@/server/actions/editor";
import { cancelJob, pollJob } from "@/server/actions/jobs";
import { RENDER_FPS, RENDER_SIZES } from "@/server/render/settings";
import { timecode } from "@/server/render/timeline";
import { cn, fileUrl, formatBytes, timeAgo } from "@/lib/utils";
import { Button, buttonClass } from "@/components/ui/button";
import { Badge, Card, Notice, ProgressBar, SectionTitle } from "@/components/ui/misc";
import { AssetPlayer } from "@/components/ui/media";
import { useRun } from "@/components/ui/use-run";
import { useToast } from "@/components/ui/toast";

const isActive = (status: JobStatus) => status === "queued" || status === "running";

const STATUS: Record<JobStatus, { label: string; tone: "blue" | "ok" | "bad" | "gray" | "warn" }> = {
  queued: { label: "Queued", tone: "blue" },
  running: { label: "Rendering", tone: "blue" },
  succeeded: { label: "Finished", tone: "ok" },
  failed: { label: "Failed", tone: "bad" },
  canceled: { label: "Canceled", tone: "gray" },
};

function jobSettings(job: GenerationJob): string {
  const p = job.params;
  return typeof p.width === "number" && typeof p.height === "number" && typeof p.fps === "number" ? `${p.width}×${p.height} · ${p.fps} fps` : "";
}

function jobWarnings(job: GenerationJob): string[] {
  const w = job.usage?.warnings;
  return Array.isArray(w) ? w.filter((x): x is string => typeof x === "string") : [];
}

export function RenderPanel({
  episodeId,
  settings,
  settingsSaved,
  ffmpeg,
  jobs,
  finalVideoAssetId,
  sceneCount,
  totalSec,
}: {
  episodeId: string;
  settings: RenderSettings;
  settingsSaved: boolean;
  ffmpeg: FfmpegStatus;
  jobs: RenderJobView[];
  finalVideoAssetId: string | null;
  sceneCount: number;
  totalSec: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const { run, pending } = useRun();

  // The job being followed: one the server already lists as active, or one started just now.
  const serverActive = jobs.find((j) => isActive(j.status)) ?? null;
  const [watchId, setWatchId] = useState<string | null>(serverActive?.id ?? null);
  const [live, setLive] = useState<GenerationJob | null>(null);
  /** Jobs this page has already seen finish, so stale server data cannot restart the polling. */
  const [doneIds, setDoneIds] = useState<string[]>([]);
  if (serverActive && watchId !== serverActive.id && !doneIds.includes(serverActive.id)) setWatchId(serverActive.id);

  const refresh = useRef(() => router.refresh());
  const notify = useRef(toast);
  useEffect(() => {
    refresh.current = () => router.refresh();
    notify.current = toast;
  }, [router, toast]);

  // Poll the job row every 2 seconds until it leaves the queue.
  useEffect(() => {
    if (!watchId) return;
    let stop = false;
    let failures = 0;
    const tick = async () => {
      const res = await pollJob({ id: watchId }).catch(() => null);
      if (stop) return;
      if (!res || !res.ok) {
        // Keep trying through a brief network drop; give up (and say so) if it persists.
        if (++failures >= 5) {
          stop = true;
          clearInterval(timer);
          notify.current.error("Lost contact with the render. Reload the page to see its status.");
          setWatchId(null);
        }
        return;
      }
      failures = 0;
      const job = res.data;
      setLive(job);
      if (isActive(job.status)) return;
      stop = true;
      clearInterval(timer);
      setDoneIds((ids) => [...ids, job.id]);
      setWatchId(null);
      if (job.status === "succeeded") notify.current.success("Render finished — your video is ready below.");
      else if (job.status === "failed") notify.current.error(job.error ? `Render failed: ${job.error.slice(0, 160)}` : "Render failed.");
      else notify.current.info("Render canceled.");
      refresh.current(); // loads the finished video and the updated history
    };
    const timer = setInterval(tick, 2000);
    void tick();
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [watchId]);

  const active: GenerationJob | null = watchId ? (live?.id === watchId ? live : (jobs.find((j) => j.id === watchId) ?? null)) : null;
  const rendering = !!watchId;
  const latest = jobs.find((j) => j.status === "succeeded" && j.result) ?? null;
  const lastFailed = !rendering && jobs[0]?.status === "failed" ? jobs[0] : null;

  const choose = (next: RenderSettings) => {
    if (settingsSaved && next.width === settings.width && next.height === settings.height && next.fps === settings.fps) return;
    void run(saveRenderSettings({ episodeId, ...next }), "Export settings saved");
  };

  const start = async () => {
    const job = await run(startEpisodeRender({ episodeId }));
    if (job) {
      setLive(job);
      setWatchId(job.id);
    }
  };

  const blocked = !ffmpeg.available ? "This server has no ffmpeg." : sceneCount === 0 || totalSec <= 0 ? "Add scenes with a duration first." : null;

  return (
    <Card className="p-4 sm:p-5">
      <SectionTitle>
        <span className="flex items-center gap-2">
          <Clapperboard className="size-[18px] text-brand-600" /> Export
        </span>
      </SectionTitle>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Settings + render */}
        <div className="flex flex-col gap-4">
          <fieldset disabled={rendering || pending} aria-label="Export settings" className="flex min-w-0 flex-col gap-4 disabled:opacity-60">
            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-navy-800">Resolution</p>
              <div className="grid grid-cols-2 gap-2">
                {RENDER_SIZES.map((size) => {
                  const on = size.width === settings.width && size.height === settings.height;
                  return (
                    <button
                      key={size.label}
                      type="button"
                      aria-pressed={on}
                      onClick={() => choose({ ...settings, width: size.width, height: size.height })}
                      className={cn(
                        "flex min-h-14 flex-col items-start justify-center rounded-2xl px-3 py-2 text-left transition-colors",
                        on ? "bg-brand-600 text-white shadow-[0_6px_16px_-6px_rgb(38_112_230/0.7)]" : "bg-white text-navy-900 ring-1 ring-inset ring-line hover:bg-brand-100",
                      )}
                    >
                      <span className="text-sm font-bold tabular-nums">{size.label}</span>
                      <span className={cn("text-[11px] font-medium", on ? "text-white/80" : "text-muted")}>{size.detail}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-navy-800">Frame rate</p>
              <div className="flex gap-2">
                {RENDER_FPS.map((fps) => {
                  const on = fps === settings.fps;
                  return (
                    <button
                      key={fps}
                      type="button"
                      aria-pressed={on}
                      onClick={() => choose({ ...settings, fps })}
                      className={cn("h-11 flex-1 rounded-xl text-sm font-bold transition-colors", on ? "bg-brand-600 text-white" : "bg-white text-navy-900 ring-1 ring-inset ring-line hover:bg-brand-100")}
                    >
                      {fps} fps
                    </button>
                  );
                })}
              </div>
              {!settingsSaved ? <p className="mt-1.5 text-xs text-muted">Using the defaults. Tap a setting to save your choice for this episode.</p> : null}
            </div>
          </fieldset>

          {!ffmpeg.available ? (
            <Notice tone="warn" icon={<ServerOff />} title="This server cannot render video">
              Rendering needs ffmpeg, which was not found on this server — serverless hosts such as Vercel do not include it. Deploy FRAMEFORGE on a host where ffmpeg is installed (a VPS or a container
              image with ffmpeg), or point the <code className="font-mono">FFMPEG_PATH</code> environment variable at an ffmpeg binary, then reload this page. Everything else in the editor keeps working.
            </Notice>
          ) : null}

          {active ? (
            <div className="rounded-2xl bg-brand-100 p-3.5" role="status">
              <div className="flex items-center justify-between gap-3 text-sm font-bold text-navy-900">
                <span>{active.status === "queued" ? "Starting the render…" : "Rendering…"}</span>
                <span className="tabular-nums">{Math.round((active.progress ?? 0) * 100)}%</span>
              </div>
              <ProgressBar value={(active.progress ?? 0) * 100} className="mt-2 bg-white" />
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-navy-700">{jobSettings(active)} · you can leave this page; the render continues on the server.</p>
                <Button size="sm" variant="secondary" className="!h-10" disabled={pending} onClick={() => run(cancelJob({ id: active.id }))}>
                  Cancel render
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <Button size="lg" className="w-full" loading={pending || rendering} disabled={!!blocked} icon={<Clapperboard className="size-4" />} onClick={start}>
                Render video
              </Button>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                {blocked ??
                  `Renders ${sceneCount} scene${sceneCount === 1 ? "" : "s"} (${timecode(totalSec)}) to an MP4 at ${settings.width}×${settings.height}, ${settings.fps} fps, on this server with ffmpeg${ffmpeg.version ? ` ${ffmpeg.version}` : ""}. Voiceovers, music and sound effects are mixed in. Sound inside animation clips is not included in this version.`}
              </p>
            </div>
          )}

          {lastFailed ? (
            <Notice tone="warn" icon={<AlertTriangle />} title="The last render failed">
              <span className="break-words">{lastFailed.error || "No error message was recorded."}</span>
            </Notice>
          ) : null}
        </div>

        {/* Result + history */}
        <div className="flex flex-col gap-4">
          {latest?.result ? (
            <div>
              <p className="mb-1.5 flex flex-wrap items-center gap-2 text-[13px] font-semibold text-navy-800">
                Latest render
                {latest.result.id === finalVideoAssetId ? (
                  <Badge tone="ok">
                    <CheckCircle2 className="size-3" /> Final video in Publishing
                  </Badge>
                ) : null}
              </p>
              <AssetPlayer asset={latest.result} className="!max-h-[50dvh]" />
              <p className="mt-1.5 truncate text-sm font-semibold text-navy-900">{latest.result.name}</p>
              <p className="text-xs text-muted">
                {latest.result.width && latest.result.height ? `${latest.result.width}×${latest.result.height} · ` : ""}
                {latest.result.durationSec != null ? `${timecode(latest.result.durationSec)} · ` : ""}
                {formatBytes(latest.result.sizeBytes)} · rendered {timeAgo(latest.finishedAt ?? latest.createdAt)}
              </p>
              {jobWarnings(latest).map((w) => (
                <p key={w} className="mt-1 text-xs font-semibold text-warn-700">
                  {w}
                </p>
              ))}
              <div className="mt-2.5 flex flex-wrap gap-2">
                <a href={`${fileUrl(latest.result.id)}?download=1`} className={buttonClass("secondary", "md")}>
                  <Download className="size-4" /> Download
                </a>
                {latest.result.id === finalVideoAssetId ? (
                  <Link href={`/publishing?episode=${episodeId}`} className={buttonClass("ghost", "md")}>
                    <Send className="size-4" /> Open Publishing
                  </Link>
                ) : (
                  <Button variant="navy" loading={pending} icon={<Send className="size-4" />} onClick={() => run(setFinalVideo({ episodeId, assetId: latest.result!.id }), "Set as the final video in Publishing")}>
                    Use as final video in Publishing
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="rounded-2xl border-2 border-dashed border-brand-200 px-4 py-6 text-center text-[13px] text-muted">No finished render yet. Your rendered video appears here, ready to watch and download.</p>
          )}

          {jobs.length ? (
            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-navy-800">Recent renders</p>
              <ul className="flex flex-col gap-1.5">
                {jobs.map((job) => {
                  const shown = live?.id === job.id ? live : job;
                  const s = STATUS[shown.status];
                  return (
                    <li key={job.id} className="rounded-xl bg-brand-50 px-3 py-2 ring-1 ring-line/70">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Badge tone={s.tone}>{s.label}</Badge>
                        <span className="text-xs text-navy-800">{jobSettings(shown)}</span>
                        <span className="ml-auto text-[11px] text-muted">{timeAgo(shown.createdAt)}</span>
                      </div>
                      {shown.status === "failed" && shown.error ? <p className="mt-1 break-words text-xs text-bad-700">{shown.error}</p> : null}
                      {shown.status === "succeeded" ? (
                        job.result ? (
                          <p className="mt-1 flex flex-wrap gap-x-3 text-xs font-semibold">
                            <Link href={`/assets?asset=${job.result.id}`} className="text-brand-700 hover:underline">
                              {job.result.name}
                            </Link>
                            <a href={`${fileUrl(job.result.id)}?download=1`} className="text-brand-700 hover:underline">
                              Download
                            </a>
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-muted">The rendered file has since been deleted from the Asset Library.</p>
                        )
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
