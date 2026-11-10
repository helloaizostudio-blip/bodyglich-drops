"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import type { Asset, Episode, EpisodeStage } from "@/db/schema";
import { EPISODE_STAGES } from "@/db/schema";
import { deleteEpisode, updateEpisode } from "@/server/actions/episodes";
import { STAGE_LABELS } from "@/lib/constants";
import { cn, formatDuration } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/misc";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { AssetField } from "@/components/ui/asset-picker";
import { useRun } from "@/components/ui/use-run";
import { CharacterAvatar } from "@/components/ui/media";
import { CastPicker, DURATION_OPTIONS, type CastOption } from "@/components/episodes/episode-form";
import { EpisodeCover, StageBadge } from "@/components/episodes/episode-bits";

export function EpisodeEditor({ episode, cast, castIds, cover }: { episode: Episode; cast: CastOption[]; castIds: string[]; cover: Asset | null }) {
  const router = useRouter();
  const { run, pending } = useRun();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [title, setTitle] = useState(episode.title);
  const [logline, setLogline] = useState(episode.logline);
  const [notes, setNotes] = useState(episode.notes);
  const [duration, setDuration] = useState(episode.targetDurationSec);
  const [ids, setIds] = useState(castIds);
  const [coverAsset, setCoverAsset] = useState<Asset | null>(cover);

  // Remember this as the episode being worked on so every studio opens on it.
  useEffect(() => {
    document.cookie = `ff_episode=${episode.id}; path=/; max-age=${60 * 60 * 24 * 90}; samesite=lax`;
  }, [episode.id]);

  const setStage = (stage: EpisodeStage) => run(updateEpisode({ id: episode.id, stage }), `Moved to ${STAGE_LABELS[stage]}`);

  const save = async () => {
    const ok = await run(
      updateEpisode({
        id: episode.id,
        title,
        logline,
        notes,
        targetDurationSec: duration,
        format: duration <= 60 ? "short" : "long",
        characterIds: ids,
        coverAssetId: coverAsset?.id ?? null,
      }),
      "Episode saved",
    );
    if (ok) setEditing(false);
  };

  const members = cast.filter((c) => castIds.includes(c.id));
  const durations = DURATION_OPTIONS.some((d) => d.value === duration) ? DURATION_OPTIONS : [...DURATION_OPTIONS, { label: formatDuration(duration), value: duration }];

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
          <EpisodeCover episode={{ ...episode, coverAssetId: cover?.id ?? null }} className="aspect-video w-full shrink-0 rounded-2xl sm:w-64" />
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-700">Episode {episode.number}</span>
              <StageBadge stage={episode.stage} />
              <span className="text-xs text-muted">Target {formatDuration(episode.targetDurationSec)}</span>
            </div>
            <h1 className="mt-1 text-2xl font-extrabold leading-tight text-navy-900 sm:text-[28px]">{episode.title}</h1>
            {episode.logline ? <p className="mt-1.5 text-sm leading-relaxed text-muted">{episode.logline}</p> : <p className="mt-1.5 text-sm italic text-faint">No logline yet.</p>}
            {members.length ? (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {members.map((m) => (
                  <li key={m.id} className="flex items-center gap-1.5 rounded-full bg-brand-50 py-0.5 pl-0.5 pr-2.5 text-xs font-semibold text-navy-800 ring-1 ring-line/70">
                    <CharacterAvatar name={m.name} assetId={m.profileAssetId} className="size-6" rounded="rounded-full" />
                    {m.name}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mt-auto flex flex-wrap gap-2 pt-4">
              <Button variant="secondary" size="sm" icon={<Pencil className="size-3.5" />} onClick={() => setEditing(true)}>
                Edit details
              </Button>
              <Button variant="ghost" size="sm" className="!text-bad-700 hover:!bg-bad-100" icon={<Trash2 className="size-3.5" />} onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            </div>
          </div>
        </div>

        <div className="border-t border-line/70 bg-brand-50/50 p-4 sm:p-5">
          <SectionTitle className="!mb-2.5">
            Status <span className="ml-1 text-xs font-medium text-muted">tap a stage to move this episode</span>
          </SectionTitle>
          <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {EPISODE_STAGES.map((stage, i) => {
              const currentIndex = EPISODE_STAGES.indexOf(episode.stage);
              const active = stage === episode.stage;
              return (
                <button
                  key={stage}
                  type="button"
                  disabled={pending}
                  aria-pressed={active}
                  onClick={() => !active && setStage(stage)}
                  className={cn(
                    "flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[13px] font-semibold transition-colors",
                    active ? "bg-brand-600 text-white shadow-[0_6px_14px_-6px_rgb(38_112_230/0.8)]" : i < currentIndex ? "bg-brand-200 text-navy-800" : "bg-white text-navy-700 ring-1 ring-inset ring-line hover:bg-brand-100",
                  )}
                >
                  <span className={cn("font-display grid size-5 place-items-center rounded-full text-[11px]", active ? "bg-white/25" : "bg-navy-900/10")}>{i + 1}</span>
                  {STAGE_LABELS[stage]}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Edit episode"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button onClick={save} loading={pending} disabled={!title.trim()}>
              Save changes
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} />
          <TextAreaField label="Idea / logline" value={logline} onChange={(e) => setLogline(e.target.value)} />
          <SelectField label="Target length" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            {durations.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </SelectField>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-navy-800">Cast</span>
            <CastPicker options={cast} value={ids} onChange={setIds} />
          </div>
          <AssetField label="Cover image" asset={coverAsset} onChange={setCoverAsset} kind="image" uploadCategory="generated_image" episodeId={episode.id} hint="Shown on the dashboard and episode cards." />
          <TextAreaField label="Production notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this episode?"
        message={
          <>
            <strong>{episode.title}</strong> will be deleted together with its script, scenes, dialogue and publishing data. Files in the Asset Library and your characters are kept.
          </>
        }
        confirmLabel="Delete episode"
        onConfirm={async () => {
          const ok = await run(deleteEpisode({ id: episode.id }), "Episode deleted");
          if (ok) router.push("/episodes");
        }}
      />
    </>
  );
}
