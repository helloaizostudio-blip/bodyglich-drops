"use client";

import { useState } from "react";
import Link from "next/link";
import { BookmarkPlus, ImagePlus, RefreshCw, ShieldCheck, Sparkles, Trash2, TriangleAlert, Wand2, X } from "lucide-react";
import type { Asset, GenerationJob } from "@/db/schema";
import { buildGeneratorPrompt, deletePromptTemplate, savePromptTemplate, startImageGeneration, useImageForScene as assignImageToScene } from "@/server/actions/generation";
import { addCharacterReference } from "@/server/actions/characters";
import { cn, timeAgo } from "@/lib/utils";
import { Button, IconButton, LinkButton } from "@/components/ui/button";
import { Card, Notice, SectionTitle } from "@/components/ui/misc";
import { SelectField, TextAreaField, TextField, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { AssetPicker } from "@/components/ui/asset-picker";
import { AssetThumb, CharacterAvatar } from "@/components/ui/media";
import { useRun } from "@/components/ui/use-run";
import { JobBadge, useJobs } from "@/components/jobs/use-jobs";

const PURPOSES = [
  { value: "scene", label: "Scene illustration" },
  { value: "storyboard", label: "Storyboard image" },
  { value: "character_variation", label: "Character variation" },
  { value: "expression", label: "Character expression" },
  { value: "environment", label: "Environment" },
  { value: "prop", label: "Prop" },
  { value: "thumbnail", label: "Thumbnail concept" },
] as const;
type Purpose = (typeof PURPOSES)[number]["value"];
type Aspect = "16:9" | "9:16" | "1:1" | "4:3" | "3:4";

type CastItem = { id: string; name: string; profileAssetId: string | null; hasOriginal: boolean };
type SceneContext = { id: string; label: string; episodeId: string; prompt: string; aspectRatio: string; characterIds: string[]; backgroundAssetId: string | null; visualAssetId: string | null };

export function ImageGenerator({
  ai,
  aspects,
  cast,
  locations,
  episodes,
  defaultEpisodeId,
  scene,
  jobs: initialJobs,
  results,
  templates,
}: {
  ai: { ready: boolean; providerName: string | null; model: string | null };
  aspects: string[];
  cast: CastItem[];
  locations: { id: string; name: string }[];
  episodes: { id: string; number: number; title: string }[];
  defaultEpisodeId: string | null;
  scene: SceneContext | null;
  jobs: GenerationJob[];
  results: Asset[];
  templates: { id: string; name: string; body: string }[];
}) {
  const { run, pending } = useRun();
  const { jobs, add } = useJobs(initialJobs);
  const [purpose, setPurpose] = useState<Purpose>(scene ? "scene" : "character_variation");
  const [aspect, setAspect] = useState<Aspect>((scene && aspects.includes(scene.aspectRatio) ? scene.aspectRatio : aspects[0]) as Aspect);
  const [characterIds, setCharacterIds] = useState<string[]>(scene?.characterIds ?? []);
  const [locationId, setLocationId] = useState("");
  const [episodeId, setEpisodeId] = useState(scene?.episodeId ?? defaultEpisodeId ?? "");
  const [idea, setIdea] = useState("");
  const [prompt, setPrompt] = useState(scene?.prompt ?? "");
  const [refs, setRefs] = useState<Asset[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [assignFor, setAssignFor] = useState<Asset | null>(null);

  const chosen = cast.filter((c) => characterIds.includes(c.id));
  const withoutOriginal = chosen.filter((c) => !c.hasOriginal);

  const build = async () => {
    const res = await run(buildGeneratorPrompt({ purpose, characterIds, locationId: locationId || null, idea, aspectRatio: aspect }));
    if (res) setPrompt(res.prompt);
  };

  const generate = async (override?: { prompt: string; aspectRatio: Aspect; purpose: Purpose; characterIds: string[]; referenceAssetIds: string[]; sceneId: string | null; episodeId: string | null }) => {
    const payload = override ?? {
      prompt,
      aspectRatio: aspect,
      purpose,
      characterIds,
      referenceAssetIds: refs.map((r) => r.id),
      sceneId: scene?.id ?? null,
      episodeId: episodeId || null,
    };
    const job = await run(startImageGeneration(payload), "Generation started");
    if (job) add(job);
  };

  const toggleCharacter = (id: string) => setCharacterIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : ids.length >= 8 ? ids : [...ids, id]));

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <div className="flex flex-col gap-4 lg:col-span-3">
        {!ai.ready ? (
          <Notice
            tone="lav"
            icon={<Sparkles />}
            title="No image provider is connected"
            action={
              <LinkButton href="/settings" size="sm" variant="navy">
                Connect in Settings
              </LinkButton>
            }
          >
            Nothing can be generated yet — FRAMEFORGE never fakes results. You can still build, edit, copy and save prompts here, and use them in any tool. Add and verify an image provider key to generate inside the
            studio.
          </Notice>
        ) : null}

        <Card className="flex flex-col gap-4 p-4 sm:p-5">
          {scene ? (
            <p className="rounded-xl bg-brand-100 px-3 py-2 text-[13px] font-semibold text-navy-800">
              Generating for {scene.label}. Results are linked to this scene, and you choose whether one becomes its visual reference.
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="What to generate" value={purpose} onChange={(e) => setPurpose(e.target.value as Purpose)}>
              {PURPOSES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </SelectField>
            <SelectField label="Aspect ratio" value={aspect} onChange={(e) => setAspect(e.target.value as Aspect)}>
              {aspects.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </SelectField>
            {!scene ? (
              <SelectField label="Belongs to episode" value={episodeId} onChange={(e) => setEpisodeId(e.target.value)}>
                <option value="">No episode</option>
                {episodes.map((e) => (
                  <option key={e.id} value={e.id}>
                    EP {e.number} · {e.title}
                  </option>
                ))}
              </SelectField>
            ) : null}
            <SelectField label="Location (for the prompt)" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              <option value="">None</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </SelectField>
          </div>

          {/* Characters — their ORIGINAL references are attached automatically */}
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-navy-800">
              <ShieldCheck className="size-4 text-brand-600" /> Characters <span className="font-medium text-muted">— each one&apos;s locked original reference is sent with the prompt</span>
            </p>
            {cast.length ? (
              <div className="flex flex-wrap gap-2">
                {cast.map((c) => {
                  const on = characterIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleCharacter(c.id)}
                      className={cn(
                        "flex h-11 items-center gap-2 rounded-full pl-1 pr-3.5 text-[13px] font-semibold transition-colors",
                        on ? "bg-brand-600 text-white" : "bg-white text-navy-800 ring-1 ring-inset ring-line hover:bg-brand-100",
                      )}
                    >
                      <CharacterAvatar name={c.name} assetId={c.profileAssetId} className="size-9" rounded="rounded-full" />
                      {c.name}
                      {!c.hasOriginal ? <TriangleAlert className={cn("size-3.5", on ? "text-white" : "text-warn-700")} aria-label="No original reference" /> : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-[13px] text-muted">
                No characters yet. Add your cast in <Link href="/characters" className="font-semibold text-brand-700 underline">Character Lab</Link>.
              </p>
            )}
            {withoutOriginal.length ? (
              <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-warn-100 px-3 py-2 text-xs font-medium text-warn-700">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                {withoutOriginal.map((c) => c.name).join(", ")} {withoutOriginal.length === 1 ? "has" : "have"} no original reference image, so the generator can only follow the written profile and will not
                match your real design. Upload originals in Character Lab first.
              </p>
            ) : null}
          </div>

          {/* Extra references */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-navy-800">Extra reference images</span>
              <Button size="sm" variant="secondary" icon={<ImagePlus className="size-3.5" />} onClick={() => setPickerOpen(true)} disabled={refs.length >= 8}>
                Add
              </Button>
            </div>
            {refs.length ? (
              <ul className="flex flex-wrap gap-2">
                {refs.map((r) => (
                  <li key={r.id} className="relative">
                    <AssetThumb asset={r} className="size-16 rounded-xl ring-1 ring-line" />
                    <button
                      type="button"
                      aria-label={`Remove ${r.name}`}
                      onClick={() => setRefs((all) => all.filter((x) => x.id !== r.id))}
                      className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-navy-900 text-white shadow"
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted">Optional: backgrounds, props or pose sketches from your library or phone.</p>
            )}
          </div>

          <TextAreaField label="What should it show?" value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="e.g. Zash proudly holding a cardboard rocket, Potato hiding behind him" rows={2} />

          <div>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="gen-prompt" className="text-[13px] font-semibold text-navy-800">
                Prompt <span className="font-medium text-muted">(fully editable)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {templates.length ? (
                  <select
                    aria-label="Load a saved prompt"
                    className="h-9 max-w-40 rounded-xl bg-white px-2 text-[13px] font-semibold text-navy-800 ring-1 ring-inset ring-line"
                    value=""
                    onChange={(e) => {
                      const t = templates.find((x) => x.id === e.target.value);
                      if (t) setPrompt(t.body);
                    }}
                  >
                    <option value="">Saved prompts…</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                ) : null}
                <Button size="sm" variant="secondary" icon={<Wand2 className="size-3.5" />} loading={pending} onClick={build}>
                  Build prompt
                </Button>
              </div>
            </div>
            <Textarea
              id="gen-prompt"
              rows={prompt ? 10 : 4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Tap “Build prompt” to assemble one from your style guide and character Consistency Profiles, or write your own."
              className="font-mono text-[13px] md:text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button icon={<Sparkles className="size-4" />} loading={pending} disabled={!ai.ready || prompt.trim().length < 10} onClick={() => generate()}>
              Generate image
            </Button>
            <Button variant="secondary" icon={<BookmarkPlus className="size-4" />} disabled={!prompt.trim()} onClick={() => setSaveOpen(true)}>
              Save prompt
            </Button>
            {ai.ready ? (
              <span className="text-xs text-muted">
                {ai.providerName} · {ai.model}. Each image is billed to your provider account.
              </span>
            ) : null}
          </div>

          {templates.length ? (
            <details className="rounded-2xl bg-brand-50 px-3.5 py-2.5 ring-1 ring-line/70">
              <summary className="text-[13px] font-semibold text-navy-800">Manage saved prompts ({templates.length})</summary>
              <ul className="mt-2 flex flex-col gap-1">
                {templates.map((t) => (
                  <li key={t.id} className="flex items-center gap-2">
                    <button type="button" className="min-w-0 flex-1 truncate rounded-lg px-2 py-2 text-left text-[13px] text-navy-800 hover:bg-brand-100" onClick={() => setPrompt(t.body)}>
                      {t.name}
                    </button>
                    <IconButton label={`Delete saved prompt ${t.name}`} onClick={() => run(deletePromptTemplate({ id: t.id }), "Saved prompt deleted")}>
                      <Trash2 className="size-4 text-bad-600" />
                    </IconButton>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </Card>
      </div>

      {/* Results */}
      <div className="lg:col-span-2">
        <SectionTitle>Generations</SectionTitle>
        {jobs.length === 0 ? (
          <p className="rounded-3xl border-2 border-dashed border-brand-200 bg-white/70 px-5 py-8 text-center text-sm text-muted">
            Generated images appear here and are saved to the Asset Library automatically.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {jobs.map((job) => {
              const asset = results.find((a) => a.id === job.resultAssetId);
              const params = job.params as { aspectRatio?: Aspect; characterIds?: string[]; referenceAssetIds?: string[] };
              return (
                <li key={job.id} className="overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-line/70">
                  {asset ? (
                    <Link href={`/assets?asset=${asset.id}`}>
                      <AssetThumb asset={asset} fit="contain" className="max-h-80 w-full bg-brand-50" />
                    </Link>
                  ) : job.status === "queued" || job.status === "running" ? (
                    <div className="skeleton grid aspect-video w-full place-items-center rounded-none" role="status">
                      <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-navy-800">Generating… this can take up to a minute</span>
                    </div>
                  ) : null}
                  <div className="flex flex-col gap-2 p-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <JobBadge job={job} />
                      <span className="text-xs font-semibold capitalize text-navy-800">{job.purpose.replace("_", " ")}</span>
                      <span className="ml-auto text-[11px] text-faint">{timeAgo(job.createdAt)}</span>
                    </div>
                    {job.status === "failed" && job.error ? <p className="rounded-xl bg-bad-100 px-3 py-2 text-xs font-medium text-bad-700">{job.error}</p> : null}
                    <p className="line-clamp-2 text-xs text-muted">{job.prompt}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {asset && (job.sceneId || scene) ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={pending}
                          onClick={() => run(assignImageToScene({ assetId: asset.id, sceneId: (job.sceneId ?? scene?.id)! }), "Set as the scene's visual reference")}
                        >
                          Use for scene
                        </Button>
                      ) : null}
                      {asset && cast.length ? (
                        <Button size="sm" variant="secondary" onClick={() => setAssignFor(asset)}>
                          Add to character…
                        </Button>
                      ) : null}
                      {job.status !== "queued" && job.status !== "running" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<RefreshCw className="size-3.5" />}
                          disabled={!ai.ready || pending}
                          onClick={() =>
                            generate({
                              prompt: job.prompt,
                              aspectRatio: params.aspectRatio ?? aspect,
                              purpose: (PURPOSES.some((p) => p.value === job.purpose) ? job.purpose : "scene") as Purpose,
                              characterIds: params.characterIds ?? [],
                              referenceAssetIds: params.referenceAssetIds ?? [],
                              sceneId: job.sceneId,
                              episodeId: job.episodeId,
                            })
                          }
                        >
                          Regenerate
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <AssetPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        kind="image"
        uploadCategory="prop"
        title="Add a reference image"
        onPick={(a) => {
          setRefs((all) => (all.some((x) => x.id === a.id) ? all : [...all, a].slice(0, 8)));
          setPickerOpen(false);
        }}
      />

      <Modal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        title="Save prompt"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={pending}
              disabled={!templateName.trim()}
              onClick={async () => {
                const ok = await run(savePromptTemplate({ name: templateName, body: prompt, kind: "image" }), "Prompt saved");
                if (ok) {
                  setSaveOpen(false);
                  setTemplateName("");
                }
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <TextField label="Name" value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="e.g. Zash hero pose" maxLength={80} autoFocus />
      </Modal>

      <AddToCharacterModal asset={assignFor} cast={cast} onClose={() => setAssignFor(null)} />
    </div>
  );
}

function AddToCharacterModal({ asset, cast, onClose }: { asset: Asset | null; cast: CastItem[]; onClose: () => void }) {
  const { run, pending } = useRun();
  const [characterId, setCharacterId] = useState(cast[0]?.id ?? "");
  const [kind, setKind] = useState<"variation" | "expression" | "outfit">("variation");
  const [label, setLabel] = useState("");
  if (!asset) return null;
  return (
    <Modal
      open
      onClose={onClose}
      title="Add to a character"
      description="Saved as a variation, expression or outfit image. Generated images can never replace a character's original reference or profile image."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={pending}
            disabled={!characterId}
            onClick={async () => {
              const ok = await run(addCharacterReference({ characterId, assetId: asset.id, kind, label }), "Added to character");
              if (ok) onClose();
            }}
          >
            Add
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <AssetThumb asset={asset} fit="contain" className="max-h-48 w-full rounded-2xl bg-brand-50" />
        <SelectField label="Character" value={characterId} onChange={(e) => setCharacterId(e.target.value)}>
          {cast.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
        <SelectField label="Save as" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          <option value="variation">Variation</option>
          <option value="expression">Expression</option>
          <option value="outfit">Outfit image</option>
        </SelectField>
        <TextField label="Label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Shocked, Side view" maxLength={120} />
      </div>
    </Modal>
  );
}
