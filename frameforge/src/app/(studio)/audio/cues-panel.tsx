"use client";

import { useState } from "react";
import { AudioLines, Music, Pencil, Plus, Trash2 } from "lucide-react";
import type { Asset } from "@/db/schema";
import type { CueView } from "@/server/services/audio";
import { addAudioCue, removeAudioCue, updateAudioCue } from "@/server/actions/audio";
import { cueStartSec, sceneLabel, timecode } from "@/server/render/timeline";
import { Button, IconButton } from "@/components/ui/button";
import { Badge, Card, EmptyState, Notice, SectionTitle } from "@/components/ui/misc";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { Field, Input, SelectField } from "@/components/ui/field";
import { AssetField } from "@/components/ui/asset-picker";
import { useRun } from "@/components/ui/use-run";
import { MiniAudio } from "./audio-bits";

export type CueScene = { id: string; position: number; title: string; startSec: number };
type CueKind = "music" | "sfx";
type FormState = { mode: "new"; asset: Asset | null } | { mode: "edit"; cue: CueView };

const KIND_LABEL: Record<CueKind, string> = { music: "Music", sfx: "Sound effect" };

export function CuesPanel({
  episodeId,
  scenes,
  totalSec,
  cues,
  draftAsset,
}: {
  episodeId: string;
  scenes: CueScene[];
  totalSec: number;
  cues: CueView[];
  /** A sound picked in the Library tab: the panel opens with the "add" form pre-filled with it. */
  draftAsset: Asset | null;
}) {
  const { run } = useRun();
  const [form, setForm] = useState<FormState | null>(draftAsset ? { mode: "new", asset: draftAsset } : null);
  const [removing, setRemoving] = useState<CueView | null>(null);

  const starts = Object.fromEntries(scenes.map((s) => [s.id, s.startSec]));
  const sceneById = new Map(scenes.map((s) => [s.id, s]));
  const rows = cues
    .map((cue) => ({ cue, at: cueStartSec(cue, starts) }))
    .sort((a, b) => (a.at ?? Infinity) - (b.at ?? Infinity));

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4 sm:p-5">
        <SectionTitle
          action={
            <Button size="sm" className="!h-10" icon={<Plus className="size-4" />} onClick={() => setForm({ mode: "new", asset: null })}>
              Add sound
            </Button>
          }
        >
          Music &amp; sound effects in this episode
        </SectionTitle>
        <p className="-mt-1.5 mb-3 text-xs leading-relaxed text-muted">
          Each sound plays once from its start point and is mixed into the rendered video at its own volume. Tie a sound to a scene and it moves with that scene when the timeline changes.
        </p>

        {rows.length ? (
          <ul className="flex flex-col gap-2.5">
            {rows.map(({ cue, at }) => {
              const scene = cue.sceneId ? sceneById.get(cue.sceneId) : undefined;
              const late = at !== null && totalSec > 0 && at >= totalSec;
              return (
                <li key={cue.id} className="rounded-2xl bg-brand-50 p-3 ring-1 ring-line/70">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Badge tone={cue.kind === "music" ? "lav" : "blue"}>
                          {cue.kind === "music" ? <Music className="size-3" /> : <AudioLines className="size-3" />} {KIND_LABEL[cue.kind]}
                        </Badge>
                        <span className="min-w-0 truncate text-sm font-semibold text-navy-900">{cue.asset.name}</span>
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {scene ? `${sceneLabel(scene)}, ${cue.startSec > 0 ? `${timecode(cue.startSec)} in` : "from its start"}` : "Whole episode"}
                        {at !== null ? ` · starts at ${timecode(at)}` : ""} · volume {Math.round(cue.volume * 100)}%
                      </p>
                      {late ? <p className="mt-1 text-xs font-semibold text-warn-700">Starts after the episode ends ({timecode(totalSec)}), so it will not be heard.</p> : null}
                    </div>
                    <IconButton label={`Edit ${cue.asset.name}`} onClick={() => setForm({ mode: "edit", cue })}>
                      <Pencil className="size-4" />
                    </IconButton>
                    <IconButton label={`Remove ${cue.asset.name}`} onClick={() => setRemoving(cue)}>
                      <Trash2 className="size-4 text-bad-600" />
                    </IconButton>
                  </div>
                  <MiniAudio assetId={cue.asset.id} label={cue.asset.name} className="mt-2" />
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            icon={<Music />}
            title="No music or sound effects yet"
            className="!py-8"
            action={
              <Button icon={<Plus className="size-4" />} onClick={() => setForm({ mode: "new", asset: null })}>
                Add sound
              </Button>
            }
          >
            Pick a track or effect from your library (or upload one), then choose where it starts and how loud it is.
          </EmptyState>
        )}
      </Card>

      {form ? (
        <CueForm
          key={form.mode === "edit" ? form.cue.id : `new-${form.asset?.id ?? ""}`}
          state={form}
          episodeId={episodeId}
          scenes={scenes}
          totalSec={totalSec}
          onClose={() => setForm(null)}
        />
      ) : null}

      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title="Remove this sound from the episode?"
        message={
          <>
            <strong>{removing?.asset.name}</strong> will no longer play in this episode. The file itself stays in your Asset Library.
          </>
        }
        confirmLabel="Remove"
        onConfirm={async () => {
          if (removing) await run(removeAudioCue({ id: removing.id }), "Sound removed from the episode");
          setRemoving(null);
        }}
      />
    </div>
  );
}

function CueForm({ state, episodeId, scenes, totalSec, onClose }: { state: FormState; episodeId: string; scenes: CueScene[]; totalSec: number; onClose: () => void }) {
  const { run, pending } = useRun();
  const editing = state.mode === "edit" ? state.cue : null;
  const initialAsset = editing ? editing.asset : state.mode === "new" ? state.asset : null;
  const [asset, setAsset] = useState<Asset | null>(initialAsset);
  const [kind, setKind] = useState<CueKind>(editing?.kind ?? (initialAsset?.category === "sfx" ? "sfx" : "music"));
  const [sceneId, setSceneId] = useState(editing?.sceneId ?? "");
  const [start, setStart] = useState(String(editing?.startSec ?? 0));
  const [volume, setVolume] = useState(editing?.volume ?? 1);

  const startSec = Number(start.replace(",", "."));
  const startValid = start.trim() !== "" && Number.isFinite(startSec) && startSec >= 0;
  const scene = scenes.find((s) => s.id === sceneId);
  const absolute = startValid ? (scene ? scene.startSec : 0) + startSec : null;
  const late = absolute !== null && totalSec > 0 && absolute >= totalSec;

  const save = async () => {
    if (!asset || !startValid) return;
    const values = { assetId: asset.id, kind, sceneId: sceneId || null, startSec: Math.round(startSec * 100) / 100, volume };
    const ok = editing ? await run(updateAudioCue({ id: editing.id, ...values }), "Sound updated") : await run(addAudioCue({ episodeId, ...values }), "Sound added to the episode");
    if (ok) onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? "Edit sound" : "Add music or a sound effect"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={pending} disabled={!asset || !startValid} onClick={save}>
            {editing ? "Save" : "Add to episode"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SelectField label="Type" value={kind} onChange={(e) => setKind(e.target.value as CueKind)}>
          <option value="music">Music</option>
          <option value="sfx">Sound effect</option>
        </SelectField>

        <div>
          <AssetField
            label="Sound"
            asset={asset}
            onChange={(next) => {
              setAsset(next);
              // A sound filed under Music / Sound effects sets the type to match.
              if (next?.category === "music" || next?.category === "sfx") setKind(next.category);
            }}
            kind="audio"
            categories={["music", "sfx"]}
            uploadCategory={kind}
            episodeId={episodeId}
            hint={`New uploads from here are filed under ${kind === "music" ? "Music" : "Sound effects"}.`}
          />
          {asset ? <MiniAudio assetId={asset.id} label={asset.name} className="mt-2" /> : null}
        </div>

        <SelectField
          label="Attach to"
          value={sceneId}
          onChange={(e) => setSceneId(e.target.value)}
          hint={scene ? `The start offset is counted from the start of this scene (${timecode(scene.startSec)} into the episode).` : "The start offset is counted from the start of the episode."}
        >
          <option value="">Whole episode</option>
          {scenes.map((s) => (
            <option key={s.id} value={s.id}>
              {sceneLabel(s)}
            </option>
          ))}
        </SelectField>

        <Field
          label="Start offset (seconds)"
          error={!startValid ? "Enter 0 or a positive number of seconds." : undefined}
          hint={absolute !== null ? `Starts at ${timecode(absolute)} in the episode.` : undefined}
        >
          {(id) => <Input id={id} type="number" inputMode="decimal" min={0} step={0.1} value={start} onChange={(e) => setStart(e.target.value)} />}
        </Field>

        <Field label={`Volume — ${Math.round(volume * 100)}%`} hint="100% plays the file as it is. Up to 150% for quiet recordings.">
          {(id) => (
            <input
              id={id}
              type="range"
              min={0}
              max={1.5}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="h-10 w-full accent-brand-600"
            />
          )}
        </Field>

        {late ? (
          <Notice tone="warn" title="This starts after the episode ends">
            The episode is {timecode(totalSec)} long, so this sound would not be heard. Choose an earlier start.
          </Notice>
        ) : null}
      </div>
    </Modal>
  );
}
