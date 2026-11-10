"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ExternalLink, Minus, Plus } from "lucide-react";
import type { Asset } from "@/db/schema";
import { moveScene, setSceneClip, setSceneDuration } from "@/server/actions/editor";
import { sceneLabel, secondsLabel, timecode } from "@/server/render/timeline";
import { Button, IconButton } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/misc";
import { Field, Input } from "@/components/ui/field";
import { AssetField } from "@/components/ui/asset-picker";
import { useRun } from "@/components/ui/use-run";
import type { EditorScene } from "./model";

const MIN_SEC = 0.5;
const MAX_SEC = 600;
const tidy = (n: number) => Math.round(n * 10) / 10;

export function SceneInspector({
  scene,
  sceneCount,
  episodeId,
  clipSec,
  onMoved,
}: {
  scene: EditorScene;
  sceneCount: number;
  episodeId: string;
  /** Length of the scene's clip when known (stored, or measured in the browser). */
  clipSec: number | null;
  /** Called after a successful reorder so the preview can follow the scene to its new place. */
  onMoved: () => void;
}) {
  const { run, pending } = useRun();
  const [draft, setDraft] = useState(String(scene.durationSec));
  // Re-seed the field when another scene is selected or the saved duration changes.
  const seed = `${scene.id}:${scene.durationSec}`;
  const [seeded, setSeeded] = useState(seed);
  if (seeded !== seed) {
    setSeeded(seed);
    setDraft(String(scene.durationSec));
  }

  const parsed = Number(draft.replace(",", "."));
  const valid = draft.trim() !== "" && Number.isFinite(parsed) && parsed >= MIN_SEC && parsed <= MAX_SEC;

  const saveDuration = (value: number) => {
    const next = tidy(Math.min(MAX_SEC, Math.max(MIN_SEC, value)));
    setDraft(String(next));
    if (next !== scene.durationSec) void run(setSceneDuration({ sceneId: scene.id, durationSec: next }));
  };
  const commitDraft = () => {
    if (valid) saveDuration(parsed);
    else setDraft(String(scene.durationSec));
  };

  const voiced = scene.lines.filter((l) => l.audio).length;
  const clipDiffers = scene.clip && clipSec !== null && Math.abs(clipSec - scene.durationSec) > 0.05;
  const voiceOverruns = scene.voiceSec !== null && scene.voiceSec > scene.durationSec + 0.05;

  return (
    <Card className="p-4 sm:p-5">
      <SectionTitle
        action={
          <span className="text-xs font-medium text-muted">
            {scene.index + 1} of {sceneCount} · starts {timecode(scene.startSec)}
          </span>
        }
      >
        <span className="line-clamp-1">{sceneLabel(scene)}</span>
      </SectionTitle>

      <div className="flex flex-col gap-4">
        {/* Duration */}
        <div>
          <Field label="Duration (seconds)" error={!valid ? `Enter a number between ${MIN_SEC} and ${MAX_SEC}.` : undefined}>
            {(id) => (
              <div className="flex items-center gap-1.5">
                <IconButton label="Half a second shorter" className="ring-1 ring-inset ring-line" disabled={pending || scene.durationSec <= MIN_SEC} onClick={() => saveDuration(scene.durationSec - 0.5)}>
                  <Minus className="size-4" />
                </IconButton>
                <Input
                  id={id}
                  type="number"
                  inputMode="decimal"
                  min={MIN_SEC}
                  max={MAX_SEC}
                  step={0.5}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={commitDraft}
                  onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                  className="text-center font-semibold tabular-nums"
                />
                <IconButton label="Half a second longer" className="ring-1 ring-inset ring-line" disabled={pending || scene.durationSec >= MAX_SEC} onClick={() => saveDuration(scene.durationSec + 0.5)}>
                  <Plus className="size-4" />
                </IconButton>
              </div>
            )}
          </Field>

          {clipDiffers && clipSec !== null ? (
            <div className="mt-2 rounded-xl bg-brand-50 p-2.5 text-xs leading-relaxed text-navy-800 ring-1 ring-line/70">
              {clipSec < scene.durationSec
                ? `The clip is ${secondsLabel(clipSec)} long. Its last frame is held for the remaining ${secondsLabel(scene.durationSec - clipSec)}.`
                : `The clip is ${secondsLabel(clipSec)} long. Only its first ${secondsLabel(scene.durationSec)} is used.`}
              {tidy(clipSec) >= MIN_SEC && tidy(clipSec) !== scene.durationSec ? (
                <button type="button" disabled={pending} onClick={() => saveDuration(clipSec)} className="ml-1 font-bold text-brand-700 underline-offset-2 hover:underline disabled:opacity-50">
                  Match the clip ({secondsLabel(clipSec)})
                </button>
              ) : null}
            </div>
          ) : null}

          {voiceOverruns && scene.voiceSec !== null ? (
            <div className="mt-2 rounded-xl bg-warn-100 p-2.5 text-xs leading-relaxed text-warn-700">
              The voiceovers of this scene run {secondsLabel(scene.voiceSec)} — longer than the scene, so they continue over the next one.
              <button type="button" disabled={pending} onClick={() => saveDuration(Math.ceil(scene.voiceSec! * 10) / 10)} className="ml-1 font-bold underline underline-offset-2 disabled:opacity-50">
                Fit the scene to them
              </button>
            </div>
          ) : null}
        </div>

        {/* Clip */}
        <AssetField
          label="Animation clip"
          asset={scene.clip}
          onChange={(asset: Asset | null) => void run(setSceneClip({ sceneId: scene.id, assetId: asset?.id ?? null }), asset ? "Clip assigned" : "Clip detached — it stays in your Asset Library")}
          kind="video"
          categories={["animation_clip"]}
          uploadCategory="animation_clip"
          episodeId={episodeId}
          hint={
            scene.clip
              ? "Remove only detaches the clip from this scene; the file stays in your Asset Library."
              : scene.visual
                ? "No clip yet — the scene's visual is shown as a still image."
                : "No clip or visual yet — the scene renders as a plain dark card."
          }
        />

        {/* Order */}
        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-navy-800">Order</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              icon={<ArrowLeft className="size-4" />}
              disabled={pending || scene.index === 0}
              onClick={async () => {
                if (await run(moveScene({ sceneId: scene.id, direction: "earlier" }))) onMoved();
              }}
            >
              Earlier
            </Button>
            <Button
              variant="secondary"
              disabled={pending || scene.index >= sceneCount - 1}
              onClick={async () => {
                if (await run(moveScene({ sceneId: scene.id, direction: "later" }))) onMoved();
              }}
            >
              Later <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 border-t border-line pt-3 text-[13px]">
          <p className="text-muted">
            {scene.lines.length ? `${voiced} of ${scene.lines.length} dialogue line${scene.lines.length === 1 ? "" : "s"} voiced` : "No dialogue in this scene"}
            {scene.lines.length ? (
              <>
                {" · "}
                <Link href={`/audio?episode=${episodeId}`} className="font-semibold text-brand-700 hover:underline">
                  Audio Studio
                </Link>
              </>
            ) : null}
          </p>
          <Link href={`/storyboard?episode=${episodeId}&scene=${scene.id}`} className="flex h-10 w-fit items-center gap-1.5 font-semibold text-brand-700 hover:underline">
            <ExternalLink className="size-4" /> Open in Storyboard Studio
          </Link>
        </div>
      </div>
    </Card>
  );
}
