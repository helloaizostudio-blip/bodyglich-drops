"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Clapperboard, ExternalLink } from "lucide-react";
import type { EpisodeStage } from "@/db/schema";
import { STAGE_LABELS } from "@/lib/constants";
import { Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";

export type EpisodeOption = { id: string; number: number; title: string; stage: EpisodeStage };

const remember = (id: string) => {
  document.cookie = `ff_episode=${id}; path=/; max-age=${60 * 60 * 24 * 90}; samesite=lax`;
};

/**
 * Shows which episode the current studio page is working on and lets the user switch.
 * The choice is remembered so every studio (story, storyboard, audio…) opens on the same episode.
 */
export function EpisodeSwitcher({ episodes, currentId }: { episodes: EpisodeOption[]; currentId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => remember(currentId), [currentId]);
  const current = episodes.find((e) => e.id === currentId);
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-white p-1.5 pl-3 shadow-card ring-1 ring-line/70">
      <Clapperboard className="size-4 shrink-0 text-brand-600" aria-hidden />
      <span className="hidden text-[11px] font-bold uppercase tracking-wider text-faint sm:inline">Episode</span>
      <Select
        aria-label="Current episode"
        className="min-w-0 flex-1 [&>select]:h-10 [&>select]:truncate [&>select]:font-semibold [&>select]:ring-0"
        value={currentId}
        onChange={(e) => {
          remember(e.target.value);
          router.push(`${pathname}?episode=${e.target.value}`);
        }}
      >
        {episodes.map((e) => (
          <option key={e.id} value={e.id}>
            EP {e.number} · {e.title} ({STAGE_LABELS[e.stage]})
          </option>
        ))}
      </Select>
      {current ? (
        <Link href={`/episodes/${current.id}`} aria-label="Open episode overview" title="Episode overview" className="grid size-10 shrink-0 place-items-center rounded-xl text-navy-700 hover:bg-brand-100">
          <ExternalLink className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}

/** Shown by per-episode studios when no episode exists yet. */
export function NoEpisodeState({ what }: { what: string }) {
  return (
    <EmptyState icon={<Clapperboard />} title="Create an episode first" action={<LinkButton href="/episodes?new=1">Create Episode</LinkButton>}>
      {what} belongs to an episode. Create one and it will open here automatically.
    </EmptyState>
  );
}
