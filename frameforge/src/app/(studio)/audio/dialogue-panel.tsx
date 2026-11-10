"use client";

import { useState } from "react";
import { CheckCircle2, CircleDashed, FolderOpen, LayoutPanelLeft, MessageSquareText, RefreshCw, X } from "lucide-react";
import type { Asset, DialogueLine } from "@/db/schema";
import { setLineAudio } from "@/server/actions/audio";
import { sceneLabel } from "@/server/render/timeline";
import { Button, LinkButton } from "@/components/ui/button";
import { Badge, Card, EmptyState, ProgressBar } from "@/components/ui/misc";
import { ConfirmDialog } from "@/components/ui/modal";
import { AssetPicker } from "@/components/ui/asset-picker";
import { UploadButton } from "@/components/ui/upload";
import { useRun } from "@/components/ui/use-run";
import { MiniAudio } from "./audio-bits";

export type DialogueLineView = DialogueLine & {
  /** Library character name, or the free-text speaker. Empty when the line has no speaker. */
  speakerName: string;
  audio: Asset | null;
};
export type DialogueSceneView = { id: string; position: number; title: string; lines: DialogueLineView[] };

export function DialoguePanel({
  episodeId,
  scenes,
  renderGenerate,
}: {
  episodeId: string;
  scenes: DialogueSceneView[];
  /**
   * Optional slot for a "generate this line with a voice provider" control, rendered in each line's
   * action row. Voice generation is not part of this panel; when the prop is absent nothing is shown.
   */
  renderGenerate?: (line: DialogueLineView, scene: DialogueSceneView) => React.ReactNode;
}) {
  const { run, pending } = useRun();
  const [pickFor, setPickFor] = useState<DialogueLineView | null>(null);
  const [clearFor, setClearFor] = useState<DialogueLineView | null>(null);

  const lines = scenes.flatMap((s) => s.lines);
  const recorded = lines.filter((l) => l.audio).length;
  const storyboardHref = `/storyboard?episode=${episodeId}`;

  if (!scenes.length || !lines.length) {
    return (
      <EmptyState
        icon={scenes.length ? <MessageSquareText /> : <LayoutPanelLeft />}
        title={scenes.length ? "No dialogue lines yet" : "No scenes yet"}
        action={<LinkButton href={storyboardHref}>Open Storyboard Studio</LinkButton>}
      >
        {scenes.length
          ? "Dialogue is written per scene in Storyboard Studio. Once a scene has lines, they appear here ready for their voiceovers."
          : "Scenes and their dialogue are created in Storyboard Studio. Add scenes there, then come back to record the voices."}
      </EmptyState>
    );
  }

  const attach = (line: DialogueLineView, asset: Asset) => run(setLineAudio({ lineId: line.id, assetId: asset.id }), line.audio ? "Voiceover replaced" : "Voiceover attached");

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-navy-900">
            <span className="tabular-nums">
              {recorded} / {lines.length}
            </span>{" "}
            lines recorded
          </p>
          {recorded === lines.length ? <Badge tone="ok">All voiced</Badge> : <span className="text-xs text-muted">{lines.length - recorded} to go</span>}
        </div>
        <ProgressBar value={(recorded / lines.length) * 100} className="mt-2.5" />
      </Card>

      {scenes.map((scene) => {
        const done = scene.lines.filter((l) => l.audio).length;
        return (
          <Card key={scene.id} className="p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="min-w-0 truncate text-[17px] font-bold text-navy-900">{sceneLabel(scene)}</h2>
              {scene.lines.length ? (
                <Badge tone={done === scene.lines.length ? "ok" : "blue"}>
                  {done} / {scene.lines.length} recorded
                </Badge>
              ) : null}
            </div>
            {scene.lines.length ? (
              <ul className="flex flex-col gap-2.5">
                {scene.lines.map((line) => (
                  <li key={line.id} className="rounded-2xl bg-brand-50 p-3 ring-1 ring-line/70">
                    <div className="flex items-start gap-2">
                      {line.audio ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok-700" aria-label="Recorded" /> : <CircleDashed className="mt-0.5 size-4 shrink-0 text-faint" aria-label="Not recorded" />}
                      <div className="min-w-0 flex-1">
                        <p className={line.speakerName ? "text-xs font-bold uppercase tracking-wide text-brand-700" : "text-xs font-semibold italic text-faint"}>{line.speakerName || "No speaker set"}</p>
                        <p className={line.text.trim() ? "mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-navy-900" : "mt-0.5 text-sm italic text-faint"}>{line.text.trim() || "Empty line"}</p>
                      </div>
                    </div>

                    {line.audio ? (
                      <div className="mt-2.5">
                        <p className="mb-1 truncate text-[11px] font-semibold text-muted">{line.audio.name}</p>
                        <MiniAudio assetId={line.audio.id} label={`Voiceover: ${line.audio.name}`} />
                      </div>
                    ) : null}

                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      {line.audio ? (
                        <>
                          <Button size="sm" variant="secondary" className="!h-10" icon={<RefreshCw className="size-3.5" />} disabled={pending} onClick={() => setPickFor(line)}>
                            Replace
                          </Button>
                          <Button size="sm" variant="ghost" className="!h-10" icon={<X className="size-3.5" />} disabled={pending} onClick={() => setClearFor(line)}>
                            Clear
                          </Button>
                        </>
                      ) : (
                        <>
                          <UploadButton
                            category="voiceover"
                            multiple={false}
                            episodeId={episodeId}
                            sceneId={scene.id}
                            size="sm"
                            variant="secondary"
                            className="!h-10"
                            onUploaded={(uploaded) => {
                              if (uploaded[0]) void attach(line, uploaded[0]);
                            }}
                          >
                            Upload
                          </UploadButton>
                          <Button size="sm" variant="ghost" className="!h-10" icon={<FolderOpen className="size-3.5" />} disabled={pending} onClick={() => setPickFor(line)}>
                            Library
                          </Button>
                        </>
                      )}
                      {/* Extension point: external voice generation (see the prop's doc comment). */}
                      {renderGenerate?.(line, scene)}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-muted">No dialogue in this scene.</p>
            )}
          </Card>
        );
      })}

      <AssetPicker
        open={!!pickFor}
        onClose={() => setPickFor(null)}
        onPick={(asset) => {
          const line = pickFor;
          setPickFor(null);
          if (line) void attach(line, asset);
        }}
        kind="audio"
        categories={["voiceover"]}
        uploadCategory="voiceover"
        episodeId={episodeId}
        title="Choose a voiceover"
      />

      <ConfirmDialog
        open={!!clearFor}
        onClose={() => setClearFor(null)}
        title="Clear this voiceover?"
        message={
          <>
            The line goes back to “not recorded”. The recording{clearFor?.audio ? <> <strong>{clearFor.audio.name}</strong></> : null} stays in your Asset Library.
          </>
        }
        confirmLabel="Clear voiceover"
        onConfirm={async () => {
          if (clearFor) await run(setLineAudio({ lineId: clearFor.id, assetId: null }), "Voiceover cleared");
          setClearFor(null);
        }}
      />
    </div>
  );
}
