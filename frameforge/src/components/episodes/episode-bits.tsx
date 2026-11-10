import Link from "next/link";
import { Check } from "lucide-react";
import type { Episode, EpisodeStage } from "@/db/schema";
import { EPISODE_STAGES } from "@/db/schema";
import type { EpisodeProgress } from "@/server/services/episodes";
import { STAGE_LABELS } from "@/lib/constants";
import { cn, fileUrl, formatDuration, timeAgo } from "@/lib/utils";
import { Badge, ProgressBar } from "@/components/ui/misc";

const STAGE_TONE: Record<EpisodeStage, "gray" | "blue" | "lav" | "warn" | "ok" | "navy"> = {
  idea: "gray",
  script: "blue",
  storyboard: "lav",
  assets: "lav",
  animation: "warn",
  editing: "warn",
  published: "ok",
};

export function StageBadge({ stage }: { stage: EpisodeStage }) {
  return <Badge tone={STAGE_TONE[stage]}>{STAGE_LABELS[stage]}</Badge>;
}

export function EpisodeCover({ episode, className }: { episode: Pick<Episode, "number" | "coverAssetId" | "title">; className?: string }) {
  if (episode.coverAssetId) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={fileUrl(episode.coverAssetId)} alt="" loading="lazy" className={cn("bg-brand-100 object-cover", className)} />;
  }
  return (
    <div className={cn("relative grid place-items-center overflow-hidden bg-gradient-to-br from-navy-800 via-navy-700 to-brand-500", className)} aria-hidden>
      <span className="absolute -right-6 -top-8 size-24 rounded-full bg-white/10" />
      <span className="absolute -bottom-10 -left-6 size-28 rounded-full bg-brand-400/25" />
      <span className="font-display relative text-3xl font-extrabold text-white/90">EP {episode.number}</span>
    </div>
  );
}

export function EpisodeCard({ episode, progress }: { episode: Episode; progress: EpisodeProgress }) {
  return (
    <Link
      href={`/episodes/${episode.id}`}
      className="group flex flex-col overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-line/70 transition hover:-translate-y-0.5 hover:shadow-pop"
    >
      <EpisodeCover episode={episode} className="aspect-video w-full" />
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-navy-900">{episode.title}</h3>
          <StageBadge stage={episode.stage} />
        </div>
        <div className="mt-auto">
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-muted">
            <span>
              {progress.sceneCount} scene{progress.sceneCount === 1 ? "" : "s"} · {formatDuration(progress.totalDurationSec)}
            </span>
            <span className="tabular-nums text-navy-800">{progress.percent}%</span>
          </div>
          <ProgressBar value={progress.percent} />
          <p className="mt-2 text-[11px] text-faint">Updated {timeAgo(episode.updatedAt)}</p>
        </div>
      </div>
    </Link>
  );
}

/** Idea → Script → Storyboard → Assets → Animation → Editing → Published */
export function PipelineTrack({ current, counts }: { current?: EpisodeStage; counts?: Record<string, number> }) {
  const currentIndex = current ? EPISODE_STAGES.indexOf(current) : -1;
  return (
    <ol className="no-scrollbar -mx-1 flex snap-x gap-1.5 overflow-x-auto px-1 pb-1">
      {EPISODE_STAGES.map((stage, i) => {
        const done = current ? i < currentIndex : false;
        const active = current ? i === currentIndex : false;
        const n = counts?.[stage] ?? 0;
        return (
          <li key={stage} className="flex min-w-[92px] flex-1 snap-start flex-col items-center">
            <div className="flex w-full items-center">
              <span className={cn("h-0.5 flex-1", i === 0 ? "opacity-0" : done || active ? "bg-brand-500" : "bg-brand-200")} />
              <span
                className={cn(
                  "font-display grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-bold transition-colors",
                  active ? "bg-brand-600 text-white ring-4 ring-brand-200" : done ? "bg-brand-500 text-white" : counts && n > 0 ? "bg-navy-900 text-white" : "bg-brand-100 text-navy-600",
                )}
              >
                {counts ? n : done ? <Check className="size-4" /> : i + 1}
              </span>
              <span className={cn("h-0.5 flex-1", i === EPISODE_STAGES.length - 1 ? "opacity-0" : done ? "bg-brand-500" : "bg-brand-200")} />
            </div>
            <span className={cn("mt-1.5 text-[11.5px] font-semibold", active ? "text-brand-700" : "text-navy-700")}>{STAGE_LABELS[stage]}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function ProgressChecklist({ progress }: { progress: EpisodeProgress }) {
  return (
    <ul className="flex flex-col gap-2">
      {progress.tasks.map((t) => (
        <li key={t.key} className="flex items-center gap-2.5">
          <span
            className={cn(
              "grid size-5 shrink-0 place-items-center rounded-md",
              t.done ? "bg-brand-500 text-white" : t.fraction > 0 ? "bg-brand-200 text-brand-700" : "ring-1 ring-inset ring-line",
            )}
          >
            {t.done ? <Check className="size-3.5" strokeWidth={3} /> : null}
          </span>
          <span className="text-sm font-semibold text-navy-900">{t.label}</span>
          <span className="ml-auto truncate text-xs text-muted">{t.detail}</span>
        </li>
      ))}
    </ul>
  );
}
