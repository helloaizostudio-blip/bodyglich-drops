"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Copy, ImagePlus, Plus, Trash2, Wand2 } from "lucide-react";
import type { Asset, SceneStatus } from "@/db/schema";
import { SCENE_STATUSES } from "@/db/schema";
import type { SceneView } from "@/server/services/scenes";
import { generateVisualPrompt, updateScene } from "@/server/actions/storyboard";
import { ASPECT_RATIOS, SCENE_STATUS_LABELS } from "@/lib/constants";
import { Button, IconButton } from "@/components/ui/button";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { Select, SelectField, TextAreaField, TextField, Textarea } from "@/components/ui/field";
import { AssetField } from "@/components/ui/asset-picker";
import { useRun } from "@/components/ui/use-run";
import { useToast } from "@/components/ui/toast";
import { CastPicker, type CastOption } from "@/components/episodes/episode-form";

type LineDraft = { key: string; id?: string; characterId: string | null; speaker: string; text: string };
type Draft = {
  title: string;
  durationSec: string;
  status: SceneStatus;
  aspectRatio: (typeof ASPECT_RATIOS)[number];
  locationId: string;
  locationText: string;
  action: string;
  camera: string;
  motion: string;
  visualPrompt: string;
  notes: string;
  characterIds: string[];
  lines: LineDraft[];
  visual: Asset | null;
  background: Asset | null;
};

const OTHER = "__other__";
let lineSeq = 0;

function toDraft(scene: SceneView): Draft {
  return {
    title: scene.title,
    durationSec: String(scene.durationSec),
    status: scene.status,
    aspectRatio: (ASPECT_RATIOS as readonly string[]).includes(scene.aspectRatio) ? (scene.aspectRatio as Draft["aspectRatio"]) : "16:9",
    locationId: scene.locationId ?? "",
    locationText: scene.locationText,
    action: scene.action,
    camera: scene.camera,
    motion: scene.motion,
    visualPrompt: scene.visualPrompt,
    notes: scene.notes,
    characterIds: scene.characterIds,
    lines: scene.lines.map((l) => ({ key: l.id, id: l.id, characterId: l.characterId, speaker: l.speaker, text: l.text })),
    visual: scene.visual,
    background: scene.background,
  };
}

const fingerprint = (d: Draft) => JSON.stringify({ ...d, visual: d.visual?.id ?? null, background: d.background?.id ?? null, lines: d.lines.map(({ key: _k, ...l }) => l) });

export function SceneEditor({
  scene,
  episodeId,
  cast,
  locations,
  onClose,
}: {
  scene: SceneView;
  episodeId: string;
  cast: CastOption[];
  locations: { id: string; name: string }[];
  onClose: () => void;
}) {
  const { run, pending } = useRun();
  const toast = useToast();
  const initial = useMemo(() => toDraft(scene), [scene]);
  const [d, setD] = useState<Draft>(initial);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [building, setBuilding] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((s) => ({ ...s, [k]: v }));
  const dirty = fingerprint(d) !== fingerprint(initial);
  const duration = Number(d.durationSec);
  const validDuration = Number.isFinite(duration) && duration >= 0.5 && duration <= 600;

  const save = async (): Promise<boolean> => {
    const res = await run(
      updateScene({
        id: scene.id,
        title: d.title,
        durationSec: duration,
        status: d.status,
        aspectRatio: d.aspectRatio,
        locationId: d.locationId || null,
        locationText: d.locationId ? "" : d.locationText,
        action: d.action,
        camera: d.camera,
        motion: d.motion,
        visualPrompt: d.visualPrompt,
        notes: d.notes,
        visualAssetId: d.visual?.id ?? null,
        backgroundAssetId: d.background?.id ?? null,
        characterIds: d.characterIds,
        lines: d.lines.filter((l) => l.text.trim() || l.id).map((l) => ({ id: l.id, characterId: l.characterId, speaker: l.speaker, text: l.text })),
      }),
      "Scene saved",
    );
    return !!res;
  };

  const requestClose = () => (dirty ? setConfirmDiscard(true) : onClose());

  const setLine = (key: string, patch: Partial<LineDraft>) => set("lines", d.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const moveLine = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= d.lines.length) return;
    const next = [...d.lines];
    [next[i], next[j]] = [next[j], next[i]];
    set("lines", next);
  };
  const addLine = () => {
    const lastSpeaker = d.lines[d.lines.length - 1]?.characterId;
    const options = d.characterIds.length ? d.characterIds : cast.map((c) => c.id);
    const next = options.find((id) => id !== lastSpeaker) ?? options[0] ?? null;
    set("lines", [...d.lines, { key: `new-${++lineSeq}`, characterId: next, speaker: "", text: "" }]);
  };

  const buildPrompt = async () => {
    // The prompt is built from saved scene data, so save first when there are unsaved edits.
    if (dirty && !(await save())) return;
    setBuilding(true);
    const res = await run(generateVisualPrompt({ sceneId: scene.id, kind: "visual" }));
    setBuilding(false);
    if (res) {
      set("visualPrompt", res.prompt);
      toast.success("Visual prompt built from your character and location profiles");
    }
  };

  return (
    <>
      <Modal
        open
        onClose={requestClose}
        title={`Scene ${scene.position + 1}${d.title ? ` · ${d.title}` : ""}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={requestClose}>
              {dirty ? "Cancel" : "Close"}
            </Button>
            <Button
              loading={pending && !building}
              disabled={!validDuration || !dirty}
              onClick={async () => {
                if (await save()) onClose();
              }}
            >
              Save scene
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Scene title" value={d.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. The Plan" maxLength={200} className="sm:col-span-2" />
            <TextField
              label="Duration (seconds)"
              type="number"
              inputMode="decimal"
              min={0.5}
              max={600}
              step={0.5}
              value={d.durationSec}
              onChange={(e) => set("durationSec", e.target.value)}
              error={validDuration ? undefined : "Enter a duration between 0.5 and 600 seconds."}
            />
            <SelectField label="Production status" value={d.status} onChange={(e) => set("status", e.target.value as SceneStatus)}>
              {SCENE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {SCENE_STATUS_LABELS[s]}
                </option>
              ))}
            </SelectField>
            <SelectField label="Location" value={d.locationId} onChange={(e) => set("locationId", e.target.value)} hint={locations.length ? undefined : "Create reusable locations in World Builder."}>
              <option value="">Custom / not in World Builder</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </SelectField>
            {d.locationId ? (
              <SelectField label="Aspect ratio" value={d.aspectRatio} onChange={(e) => set("aspectRatio", e.target.value as Draft["aspectRatio"])}>
                {ASPECT_RATIOS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </SelectField>
            ) : (
              <TextField label="Location description" value={d.locationText} onChange={(e) => set("locationText", e.target.value)} placeholder="e.g. Backyard at night" maxLength={300} />
            )}
            {!d.locationId ? (
              <SelectField label="Aspect ratio" value={d.aspectRatio} onChange={(e) => set("aspectRatio", e.target.value as Draft["aspectRatio"])}>
                {ASPECT_RATIOS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </SelectField>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-navy-800">Characters present</span>
            <CastPicker options={cast} value={d.characterIds} onChange={(ids) => set("characterIds", ids)} />
          </div>

          <TextAreaField label="Action description" value={d.action} onChange={(e) => set("action", e.target.value)} placeholder="What happens in this scene?" />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextAreaField label="Camera direction" value={d.camera} onChange={(e) => set("camera", e.target.value)} placeholder="e.g. Wide shot, slow push in on Zash" rows={2} />
            <TextAreaField label="Character motion" value={d.motion} onChange={(e) => set("motion", e.target.value)} placeholder="e.g. Potato trips and slides across the floor" rows={2} />
          </div>

          {/* Dialogue */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-navy-800">
                Dialogue <span className="font-medium text-muted">({d.lines.length} line{d.lines.length === 1 ? "" : "s"})</span>
              </span>
              <Button size="sm" variant="secondary" icon={<Plus className="size-3.5" />} onClick={addLine}>
                Add line
              </Button>
            </div>
            {d.lines.length ? (
              <ul className="flex flex-col gap-2">
                {d.lines.map((l, i) => {
                  const isOther = !l.characterId;
                  return (
                    <li key={l.key} className="rounded-2xl bg-brand-50 p-2.5 ring-1 ring-line/70">
                      <div className="flex items-center gap-1.5">
                        <Select
                          aria-label={`Speaker of line ${i + 1}`}
                          className="min-w-0 flex-1 [&>select]:h-10"
                          value={l.characterId ?? OTHER}
                          onChange={(e) => setLine(l.key, e.target.value === OTHER ? { characterId: null } : { characterId: e.target.value, speaker: "" })}
                        >
                          {cast.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                          <option value={OTHER}>Other / narrator…</option>
                        </Select>
                        <IconButton label="Move line up" disabled={i === 0} onClick={() => moveLine(i, -1)}>
                          <ArrowUp className="size-4" />
                        </IconButton>
                        <IconButton label="Move line down" disabled={i === d.lines.length - 1} onClick={() => moveLine(i, 1)}>
                          <ArrowDown className="size-4" />
                        </IconButton>
                        <IconButton label="Delete line" onClick={() => set("lines", d.lines.filter((x) => x.key !== l.key))}>
                          <Trash2 className="size-4 text-bad-600" />
                        </IconButton>
                      </div>
                      {isOther ? (
                        <input
                          aria-label={`Speaker name for line ${i + 1}`}
                          value={l.speaker}
                          maxLength={80}
                          onChange={(e) => setLine(l.key, { speaker: e.target.value })}
                          placeholder="Speaker name (e.g. Narrator)"
                          className="mt-1.5 h-10 w-full rounded-xl bg-white px-3 ring-1 ring-inset ring-line focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      ) : null}
                      <Textarea aria-label={`Text of line ${i + 1}`} rows={2} className="mt-1.5 min-h-0" value={l.text} onChange={(e) => setLine(l.key, { text: e.target.value })} placeholder="What do they say?" />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded-2xl border-2 border-dashed border-brand-200 px-4 py-4 text-center text-[13px] text-muted">No dialogue in this scene.</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <AssetField
              label="Visual reference"
              asset={d.visual}
              onChange={(a) => set("visual", a)}
              kind="image"
              categories={["storyboard", "generated_image"]}
              uploadCategory="storyboard"
              episodeId={episodeId}
              hint="The storyboard frame for this scene: a sketch, screenshot or generated image."
            />
            <AssetField
              label="Background reference"
              asset={d.background}
              onChange={(a) => set("background", a)}
              kind="image"
              categories={["background"]}
              uploadCategory="background"
              episodeId={episodeId}
              hint="The environment plate used when animating."
            />
          </div>

          {/* Visual prompt */}
          <div>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="visual-prompt" className="text-[13px] font-semibold text-navy-800">
                Visual prompt
              </label>
              <div className="flex gap-1.5">
                {d.visualPrompt ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Copy className="size-3.5" />}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(d.visualPrompt);
                        toast.success("Prompt copied");
                      } catch {
                        toast.error("Could not copy — select the text manually.");
                      }
                    }}
                  >
                    Copy
                  </Button>
                ) : null}
                <Button size="sm" variant="secondary" icon={<Wand2 className="size-3.5" />} loading={building} onClick={buildPrompt}>
                  {d.visualPrompt ? "Rebuild prompt" : "Generate visual prompt"}
                </Button>
              </div>
            </div>
            <Textarea
              id="visual-prompt"
              rows={d.visualPrompt ? 9 : 3}
              value={d.visualPrompt}
              onChange={(e) => set("visualPrompt", e.target.value)}
              placeholder="Tap “Generate visual prompt” to assemble one from the style guide, this scene, its location and each character's Consistency Profile — then edit it freely."
              className="font-mono text-[13px] md:text-xs"
            />
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <Link
                href={`/assets/generate?scene=${scene.id}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-[13px] font-semibold text-navy-900 ring-1 ring-inset ring-line hover:bg-brand-100"
              >
                <ImagePlus className="size-3.5" /> Open in Image Generator
              </Link>
              <span className="text-xs text-muted">{dirty ? "Save the scene first so the generator uses your latest changes." : "Uses this prompt and the characters' original references."}</span>
            </div>
          </div>

          <TextAreaField label="Notes" value={d.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Anything the animator or editor should know." />
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        title="Discard unsaved changes?"
        message="You have edits to this scene that have not been saved."
        confirmLabel="Discard changes"
        onConfirm={() => {
          setConfirmDiscard(false);
          onClose();
        }}
      />
    </>
  );
}
