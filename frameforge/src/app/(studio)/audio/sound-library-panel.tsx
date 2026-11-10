"use client";

import Link from "next/link";
import { AudioLines, Music, Plus } from "lucide-react";
import type { Asset } from "@/db/schema";
import { formatBytes, formatDuration } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/misc";
import { UploadButton } from "@/components/ui/upload";
import { MiniAudio } from "./audio-bits";

/** All music and sound effects of the studio, so sound can be organised before it is placed. */
export function SoundLibraryPanel({ music, sfx, onAddToEpisode }: { music: Asset[]; sfx: Asset[]; onAddToEpisode: (asset: Asset) => void }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
      <SoundList
        title="Music"
        icon={<Music className="size-[18px] text-brand-600" />}
        category="music"
        assets={music}
        empty="No music yet. Upload tracks you have the rights to use."
        onAddToEpisode={onAddToEpisode}
      />
      <SoundList
        title="Sound effects"
        icon={<AudioLines className="size-[18px] text-brand-600" />}
        category="sfx"
        assets={sfx}
        empty="No sound effects yet. Upload whooshes, pops, footsteps…"
        onAddToEpisode={onAddToEpisode}
      />
    </div>
  );
}

function SoundList({
  title,
  icon,
  category,
  assets,
  empty,
  onAddToEpisode,
}: {
  title: string;
  icon: React.ReactNode;
  category: "music" | "sfx";
  assets: Asset[];
  empty: string;
  onAddToEpisode: (asset: Asset) => void;
}) {
  return (
    <Card className="p-4 sm:p-5">
      <SectionTitle
        action={
          <UploadButton category={category} size="sm" variant="secondary" className="!h-10">
            Upload
          </UploadButton>
        }
      >
        <span className="flex items-center gap-2">
          {icon} {title}
          <span className="text-xs font-medium text-muted">{assets.length}</span>
        </span>
      </SectionTitle>
      {assets.length ? (
        <ul className="flex flex-col gap-2.5">
          {assets.map((a) => (
            <li key={a.id} className="rounded-2xl bg-brand-50 p-3 ring-1 ring-line/70">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <Link href={`/assets?asset=${a.id}`} className="block truncate text-sm font-semibold text-navy-900 hover:text-brand-700 hover:underline" title="Open in Asset Library">
                    {a.name}
                  </Link>
                  <p className="text-[11px] text-muted">
                    {a.durationSec ? `${formatDuration(a.durationSec)} · ` : ""}
                    {formatBytes(a.sizeBytes)}
                  </p>
                </div>
                <Button size="sm" variant="secondary" className="!h-10" icon={<Plus className="size-3.5" />} onClick={() => onAddToEpisode(a)} aria-label={`Add ${a.name} to this episode`}>
                  Add to episode
                </Button>
              </div>
              <MiniAudio assetId={a.id} label={a.name} className="mt-2" />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border-2 border-dashed border-brand-200 px-4 py-5 text-center text-[13px] text-muted">{empty}</p>
      )}
      <p className="mt-3 text-xs text-muted">
        Rename, re-file or delete sounds in the{" "}
        <Link href={`/assets?category=${category}`} className="font-semibold text-brand-700 hover:underline">
          Asset Library
        </Link>
        .
      </p>
    </Card>
  );
}
