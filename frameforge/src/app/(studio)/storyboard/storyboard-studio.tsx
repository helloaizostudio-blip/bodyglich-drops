"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DndContext, PointerSensor, TouchSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, Clock, Copy, GripVertical, ImageIcon, LayoutPanelLeft, MapPin, MessageSquare, Play, Plus, Printer, Sparkles, Trash2, Wand2 } from "lucide-react";
import type { SceneStatus } from "@/db/schema";
import type { SceneView } from "@/server/services/scenes";
import { addScene, breakScriptIntoScenes, deleteScene, duplicateScene, reorderScenes } from "@/server/actions/storyboard";
import { SCENE_STATUS_LABELS } from "@/lib/constants";
import { cn, formatDuration } from "@/lib/utils";
import { Button, IconButton, LinkButton } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/misc";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { SelectField, TextField } from "@/components/ui/field";
import { AssetThumb, CharacterAvatar } from "@/components/ui/media";
import { useRun } from "@/components/ui/use-run";
import type { CastOption } from "@/components/episodes/episode-form";
import { SceneEditor } from "./scene-editor";
import { Animatic } from "./animatic";

const STATUS_TONE: Record<SceneStatus, "gray" | "blue" | "warn" | "ok"> = { draft: "gray", ready: "blue", in_progress: "warn", done: "ok" };

export function StoryboardStudio({
  episode,
  scenes,
  cast,
  locations,
  hasScript,
  aiReady,
  openSceneId,
}: {
  episode: { id: string; title: string; targetDurationSec: number };
  scenes: SceneView[];
  cast: CastOption[];
  locations: { id: string; name: string }[];
  hasScript: boolean;
  aiReady: boolean;
  openSceneId: string | null;
}) {
  const router = useRouter();
  const { run, pending } = useRun();
  // Local order so drag & drop feels instant; the server order replaces it after each refresh.
  const [order, setOrder] = useState(scenes.map((s) => s.id));
  useEffect(() => setOrder(scenes.map((s) => s.id)), [scenes]);
  const ordered = useMemo(() => order.map((id) => scenes.find((s) => s.id === id)).filter((s): s is SceneView => !!s), [order, scenes]);

  const [editingId, setEditingId] = useState<string | null>(openSceneId && scenes.some((s) => s.id === openSceneId) ? openSceneId : null);
  const [deleting, setDeleting] = useState<SceneView | null>(null);
  const [animaticAt, setAnimaticAt] = useState<number | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [sceneCount, setSceneCount] = useState("");
  const [mode, setMode] = useState<"replace" | "append">("replace");
  const [breaking, setBreaking] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const commitOrder = async (next: string[]) => {
    setOrder(next);
    const ok = await run(reorderScenes({ episodeId: episode.id, orderedIds: next }));
    if (!ok) setOrder(scenes.map((s) => s.id));
  };
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    void commitOrder(arrayMove(order, order.indexOf(String(e.active.id)), order.indexOf(String(e.over.id))));
  };
  const move = (id: string, delta: number) => {
    const i = order.indexOf(id);
    const j = i + delta;
    if (j < 0 || j >= order.length) return;
    void commitOrder(arrayMove(order, i, j));
  };

  const add = async (afterSceneId?: string) => {
    const scene = await run(addScene({ episodeId: episode.id, afterSceneId }));
    if (scene) setEditingId(scene.id);
  };

  const total = ordered.reduce((sum, s) => sum + s.durationSec, 0);
  const withVisual = ordered.filter((s) => s.visual).length;
  const editing = scenes.find((s) => s.id === editingId) ?? null;

  const runBreakdown = async () => {
    setBreaking(true);
    const n = Number(sceneCount);
    const res = await run(breakScriptIntoScenes({ episodeId: episode.id, mode, sceneCount: Number.isInteger(n) && n > 0 ? n : undefined }));
    setBreaking(false);
    if (res) {
      setAiOpen(false);
      router.refresh();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <Card className="flex flex-wrap items-center gap-x-5 gap-y-3 p-4">
        <dl className="flex flex-1 basis-64 flex-wrap gap-x-6 gap-y-1 text-sm">
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-wider text-faint">Scenes</dt>
            <dd className="font-display text-lg font-extrabold text-navy-900 tabular-nums">{ordered.length}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-wider text-faint">Runtime</dt>
            <dd className="font-display text-lg font-extrabold text-navy-900 tabular-nums">
              {formatDuration(total)} <span className="text-xs font-semibold text-muted">/ {formatDuration(episode.targetDurationSec)} target</span>
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-wider text-faint">With visuals</dt>
            <dd className="font-display text-lg font-extrabold text-navy-900 tabular-nums">
              {withVisual}/{ordered.length}
            </dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-2">
          <Button icon={<Plus className="size-4" />} loading={pending && !breaking} onClick={() => add()}>
            Add Scene
          </Button>
          <Button variant="secondary" icon={<Wand2 className="size-4" />} onClick={() => setAiOpen(true)}>
            From script
          </Button>
          {ordered.length ? (
            <>
              <Button variant="secondary" icon={<Play className="size-4" />} onClick={() => setAnimaticAt(0)}>
                Preview
              </Button>
              <LinkButton href={`/print/storyboard?episode=${episode.id}`} variant="secondary" icon={<Printer className="size-4" />}>
                Export
              </LinkButton>
            </>
          ) : null}
        </div>
      </Card>

      {ordered.length === 0 ? (
        <EmptyState
          icon={<LayoutPanelLeft />}
          title="No scenes yet"
          action={
            <>
              <Button icon={<Plus className="size-4" />} onClick={() => add()}>
                Add first scene
              </Button>
              <Button variant="secondary" icon={<Wand2 className="size-4" />} onClick={() => setAiOpen(true)}>
                Break script into scenes
              </Button>
            </>
          }
        >
          A storyboard is a list of scenes — each with a location, characters, dialogue, camera direction and a visual reference — so you can see the whole episode before animating it.
        </EmptyState>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={order} strategy={rectSortingStrategy}>
            <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {ordered.map((scene, index) => (
                <SceneCard
                  key={scene.id}
                  scene={scene}
                  index={index}
                  count={ordered.length}
                  cast={cast}
                  busy={pending}
                  onOpen={() => setEditingId(scene.id)}
                  onMove={(d) => move(scene.id, d)}
                  onDuplicate={() => run(duplicateScene({ id: scene.id }), "Scene duplicated")}
                  onDelete={() => setDeleting(scene)}
                  onPreview={() => setAnimaticAt(index)}
                />
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => add()}
                  className="flex h-full min-h-40 w-full flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-brand-200 bg-white/60 text-sm font-semibold text-brand-700 transition-colors hover:border-brand-400 hover:bg-brand-50"
                >
                  <Plus className="size-6" /> Add scene
                </button>
              </li>
            </ol>
          </SortableContext>
        </DndContext>
      )}

      {editing ? (
        <SceneEditor key={editing.id} scene={editing} episodeId={episode.id} cast={cast} locations={locations} onClose={() => setEditingId(null)} />
      ) : null}

      {animaticAt !== null ? <Animatic scenes={ordered} cast={cast} startIndex={animaticAt} onClose={() => setAnimaticAt(null)} /> : null}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete this scene?"
        message={
          deleting ? (
            <>
              Scene {deleting.position + 1}
              {deleting.title ? ` “${deleting.title}”` : ""} and its {deleting.lines.length} dialogue line{deleting.lines.length === 1 ? "" : "s"} will be removed. Images and clips stay in the Asset Library.
            </>
          ) : null
        }
        confirmLabel="Delete scene"
        onConfirm={async () => {
          if (deleting) await run(deleteScene({ id: deleting.id }), "Scene deleted");
          setDeleting(null);
        }}
      />

      <Modal
        open={aiOpen}
        onClose={() => !breaking && setAiOpen(false)}
        title="Break script into scenes"
        description="Reads this episode's script and creates a scene card for every change of location or shot, with dialogue, characters and camera notes."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAiOpen(false)} disabled={breaking}>
              Cancel
            </Button>
            <Button icon={<Sparkles className="size-4" />} loading={breaking} disabled={!aiReady || !hasScript} onClick={runBreakdown}>
              {breaking ? "Reading script…" : "Create scenes"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {!aiReady ? (
            <p className="rounded-xl bg-lav-100 px-3 py-2.5 text-[13px] text-navy-800">
              This needs a connected text provider. Add and verify one in <a href="/settings" className="font-semibold text-brand-700 underline">Settings</a>, or add scenes by hand.
            </p>
          ) : !hasScript ? (
            <p className="rounded-xl bg-warn-100 px-3 py-2.5 text-[13px] text-warn-700">
              This episode has no script yet. Write one in <a href={`/story?episode=${episode.id}`} className="font-semibold underline">Story Engine</a> first.
            </p>
          ) : null}
          <TextField label="Number of scenes (optional)" type="number" inputMode="numeric" min={1} max={80} value={sceneCount} onChange={(e) => setSceneCount(e.target.value)} placeholder="Let the script decide" />
          {ordered.length ? (
            <SelectField label={`This episode already has ${ordered.length} scene${ordered.length === 1 ? "" : "s"}`} value={mode} onChange={(e) => setMode(e.target.value as "replace" | "append")}>
              <option value="replace">Replace them (deletes current scenes and dialogue)</option>
              <option value="append">Keep them and add the new scenes after</option>
            </SelectField>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}

function SceneCard({
  scene,
  index,
  count,
  cast,
  busy,
  onOpen,
  onMove,
  onDuplicate,
  onDelete,
  onPreview,
}: {
  scene: SceneView;
  index: number;
  count: number;
  cast: CastOption[];
  busy: boolean;
  onOpen: () => void;
  onMove: (delta: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onPreview: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: scene.id });
  const members = cast.filter((c) => scene.characterIds.includes(c.id));
  const location = scene.locationName ?? scene.locationText;
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex flex-col overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-line/70", isDragging && "z-10 opacity-90 shadow-pop ring-2 ring-brand-500")}
    >
      <div className="relative">
        <button type="button" onClick={onOpen} className="block w-full" aria-label={`Edit scene ${index + 1}`}>
          {scene.visual ? (
            <AssetThumb asset={scene.visual} className="aspect-video w-full" />
          ) : (
            <span className="flex aspect-video w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-brand-100 to-lav-100 text-brand-400">
              <ImageIcon className="size-7" aria-hidden />
              <span className="text-[11px] font-semibold text-navy-600">No visual reference yet</span>
            </span>
          )}
        </button>
        <span className="font-display absolute left-2.5 top-2.5 grid h-7 min-w-7 place-items-center rounded-full bg-navy-900/90 px-2 text-xs font-bold text-white">{index + 1}</span>
        <span className="absolute right-2.5 top-2.5">
          <Badge tone={STATUS_TONE[scene.status]}>{SCENE_STATUS_LABELS[scene.status]}</Badge>
        </span>
        <button
          type="button"
          onClick={onPreview}
          aria-label={`Preview scene ${index + 1}`}
          className="absolute bottom-2.5 right-2.5 grid size-9 place-items-center rounded-full bg-white/95 text-navy-900 shadow hover:bg-white"
        >
          <Play className="size-4 translate-x-px fill-current" />
        </button>
      </div>

      <button type="button" onClick={onOpen} className="flex flex-1 flex-col gap-1.5 px-3.5 pb-2 pt-3 text-left">
        <span className="flex items-start justify-between gap-2">
          <span className="line-clamp-1 text-[15px] font-bold text-navy-900">{scene.title || <span className="italic text-faint">Untitled scene</span>}</span>
          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-muted tabular-nums">
            <Clock className="size-3.5" /> {formatDuration(scene.durationSec)}
          </span>
        </span>
        {scene.action ? <span className="line-clamp-2 text-[13px] leading-snug text-navy-800">{scene.action}</span> : null}
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {location ? (
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" /> <span className="max-w-36 truncate">{location}</span>
            </span>
          ) : null}
          <span className="flex items-center gap-1">
            <MessageSquare className="size-3.5" /> {scene.lines.length}
          </span>
          {members.length ? (
            <span className="flex -space-x-1.5">
              {members.slice(0, 5).map((m) => (
                <CharacterAvatar key={m.id} name={m.name} assetId={m.profileAssetId} className="size-6 ring-2 ring-white" rounded="rounded-full" />
              ))}
            </span>
          ) : null}
        </span>
        {scene.lines[0]?.text ? <span className="line-clamp-1 text-xs italic text-faint">“{scene.lines[0].text}”</span> : null}
      </button>

      <div className="flex items-center gap-0.5 border-t border-line/70 px-1.5 py-1">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder scene ${index + 1}`}
          className="grid size-10 cursor-grab touch-none place-items-center rounded-xl text-faint hover:bg-brand-100 active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>
        <IconButton label="Move earlier" disabled={busy || index === 0} onClick={() => onMove(-1)}>
          <ArrowUp className="size-4" />
        </IconButton>
        <IconButton label="Move later" disabled={busy || index === count - 1} onClick={() => onMove(1)}>
          <ArrowDown className="size-4" />
        </IconButton>
        <span className="flex-1" />
        <IconButton label="Duplicate scene" disabled={busy} onClick={onDuplicate}>
          <Copy className="size-4" />
        </IconButton>
        <IconButton label="Delete scene" disabled={busy} onClick={onDelete}>
          <Trash2 className="size-4 text-bad-600" />
        </IconButton>
      </div>
    </li>
  );
}
