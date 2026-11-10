"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clapperboard, Clock, Film, ImageIcon, Sparkles, UploadCloud, Wand2 } from "lucide-react";
import type { Asset, GenerationJob } from "@/db/schema";
import type { SceneView } from "@/server/services/scenes";
import { saveSceneAnimation, setSceneClip, startVideoGeneration } from "@/server/actions/animation";
import { generateVisualPrompt } from "@/server/actions/storyboard";
import { cancelJob } from "@/server/actions/jobs";
import { ASPECT_RATIOS } from "@/lib/constants";
import { formatDuration, timeAgo } from "@/lib/utils";
import { Button, LinkButton } from "@/components/ui/button";
import { Badge, Card, EmptyState, Notice, ProgressBar, SectionTitle } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { SelectField, TextAreaField, TextField, Textarea } from "@/components/ui/field";
import { AssetField, AssetPicker } from "@/components/ui/asset-picker";
import { AssetPlayer, AssetThumb } from "@/components/ui/media";
import { UploadButton } from "@/components/ui/upload";
import { useRun } from "@/components/ui/use-run";
import { CastPicker, type CastOption } from "@/components/episodes/episode-form";
import { JobBadge, useJobs } from "@/components/jobs/use-jobs";

type Aspect = (typeof ASPECT_RATIOS)[number];
type VideoInfo = { ready: boolean; providerName: string | null; model: string | null; limits: { durations: number[]; aspects: string[] } | null };

export function AnimationStudio({
  episodeId,
  scenes,
  cast,
  jobs: initialJobs,
  video,
  openSceneId,
}: {
  episodeId: string;
  scenes: SceneView[];
  cast: CastOption[];
  jobs: GenerationJob[];
  video: VideoInfo;
  openSceneId: string | null;
}) {
  // Video jobs are polled less often than images: they take minutes, and each poll calls the provider.
  const { jobs, add } = useJobs(initialJobs, 6000);
  const [activeId, setActiveId] = useState<string | null>(openSceneId && scenes.some((s) => s.id === openSceneId) ? openSceneId : null);
  const active = scenes.find((s) => s.id === activeId) ?? null;
  const withClip = scenes.filter((s) => s.clip).length;
  const running = jobs.filter((j) => j.status === "queued" || j.status === "running");

  if (!scenes.length) {
    return (
      <EmptyState icon={<Clapperboard />} title="No scenes to animate yet" action={<LinkButton href={`/storyboard?episode=${episodeId}`}>Open Storyboard Studio</LinkButton>}>
        Animation is organised scene by scene. Build the storyboard first, then come back to produce a clip for each scene.
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!video.ready ? (
        <Notice
          tone="lav"
          icon={<Sparkles />}
          title="No video generation provider is connected"
          action={
            <LinkButton href="/settings" size="sm" variant="navy">
              Connect in Settings
            </LinkButton>
          }
        >
          You can prepare every shot here (characters, reference frame, motion, camera, prompt) and upload clips you animate in any other tool. In-studio generation becomes available after a video provider key is
          added and verified.
        </Notice>
      ) : null}

      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-bold text-navy-900">
            {withClip} of {scenes.length} scenes have a clip
          </span>
          {running.length ? (
            <Badge tone="blue">
              <Clock className="size-3" /> {running.length} job{running.length === 1 ? "" : "s"} in the queue
            </Badge>
          ) : null}
        </div>
        <ProgressBar value={(withClip / scenes.length) * 100} />
      </Card>

      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {scenes.map((scene) => {
          const sceneJobs = jobs.filter((j) => j.sceneId === scene.id);
          const latest = sceneJobs[0];
          const busy = sceneJobs.some((j) => j.status === "queued" || j.status === "running");
          return (
            <li key={scene.id}>
              <button
                type="button"
                onClick={() => setActiveId(scene.id)}
                className="flex h-full w-full flex-col overflow-hidden rounded-3xl bg-white text-left shadow-card ring-1 ring-line/70 transition hover:-translate-y-0.5 hover:ring-2 hover:ring-brand-500"
              >
                <span className="relative block">
                  {scene.clip ? (
                    <AssetThumb asset={scene.clip} className="aspect-video w-full" />
                  ) : scene.visual ? (
                    <AssetThumb asset={scene.visual} className="aspect-video w-full opacity-80" />
                  ) : (
                    <span className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-brand-100 to-lav-100 text-brand-400">
                      <ImageIcon className="size-7" aria-hidden />
                    </span>
                  )}
                  <span className="font-display absolute left-2.5 top-2.5 grid h-7 min-w-7 place-items-center rounded-full bg-navy-900/90 px-2 text-xs font-bold text-white">{scene.position + 1}</span>
                  <span className="absolute right-2.5 top-2.5">
                    {busy && latest ? (
                      <JobBadge job={latest} />
                    ) : scene.clip ? (
                      <Badge tone="ok">
                        <CheckCircle2 className="size-3" /> Clip ready
                      </Badge>
                    ) : latest?.status === "failed" ? (
                      <JobBadge job={latest} />
                    ) : (
                      <Badge tone="gray">No clip</Badge>
                    )}
                  </span>
                </span>
                <span className="flex flex-1 flex-col gap-1 p-3.5">
                  <span className="flex items-start justify-between gap-2">
                    <span className="line-clamp-1 text-[15px] font-bold text-navy-900">{scene.title || <span className="italic text-faint">Untitled scene</span>}</span>
                    <span className="shrink-0 text-xs font-semibold text-muted tabular-nums">
                      {formatDuration(scene.durationSec)} · {scene.aspectRatio}
                    </span>
                  </span>
                  <span className="line-clamp-2 text-[13px] leading-snug text-muted">{scene.motion || scene.action || "No action or motion described yet."}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Queue */}
      <Card className="p-4 sm:p-5">
        <SectionTitle>Generation queue</SectionTitle>
        {jobs.length ? (
          <ul className="flex flex-col divide-y divide-line/70">
            {jobs.map((job) => {
              const scene = scenes.find((s) => s.id === job.sceneId);
              return (
                <li key={job.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 first:pt-0 last:pb-0">
                  <JobBadge job={job} />
                  <button type="button" className="min-w-0 flex-1 basis-40 truncate text-left text-sm font-semibold text-navy-900 hover:text-brand-700" onClick={() => scene && setActiveId(scene.id)}>
                    {scene ? `Scene ${scene.position + 1}${scene.title ? ` · ${scene.title}` : ""}` : "Deleted scene"}
                  </button>
                  <span className="text-xs text-muted">
                    {job.model} · {timeAgo(job.createdAt)}
                  </span>
                  {job.status === "failed" && job.error ? <p className="basis-full text-xs font-medium text-bad-700">{job.error}</p> : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">No generation jobs for this episode yet. Jobs you submit appear here with their real status from the provider.</p>
        )}
      </Card>

      {active ? (
        <ShotPanel
          key={active.id}
          scene={active}
          episodeId={episodeId}
          cast={cast}
          video={video}
          jobs={jobs.filter((j) => j.sceneId === active.id)}
          onJob={add}
          onClose={() => setActiveId(null)}
        />
      ) : null}
    </div>
  );
}

function ShotPanel({
  scene,
  episodeId,
  cast,
  video,
  jobs,
  onJob,
  onClose,
}: {
  scene: SceneView;
  episodeId: string;
  cast: CastOption[];
  video: VideoInfo;
  jobs: GenerationJob[];
  onJob: (job: GenerationJob) => void;
  onClose: () => void;
}) {
  const { run, pending } = useRun();
  const durations = video.limits?.durations ?? [];
  const nearest = (sec: number) => (durations.length ? durations.reduce((best, d) => (Math.abs(d - sec) < Math.abs(best - sec) ? d : best), durations[0]) : sec);

  const [action, setAction] = useState(scene.action);
  const [motion, setMotion] = useState(scene.motion);
  const [camera, setCamera] = useState(scene.camera);
  const [durationSec, setDurationSec] = useState(String(scene.durationSec));
  const [aspect, setAspect] = useState<Aspect>((ASPECT_RATIOS as readonly string[]).includes(scene.aspectRatio) ? (scene.aspectRatio as Aspect) : "16:9");
  const [prompt, setPrompt] = useState(scene.animationPrompt);
  const [characterIds, setCharacterIds] = useState(scene.characterIds);
  const [reference, setReference] = useState<Asset | null>(scene.visual);
  const [background, setBackground] = useState<Asset | null>(scene.background);
  const [clipSeconds, setClipSeconds] = useState(nearest(scene.durationSec));
  const [pickClip, setPickClip] = useState(false);

  const duration = Number(durationSec);
  const validDuration = Number.isFinite(duration) && duration >= 0.5 && duration <= 600;
  const snapshot = useMemo(
    () => JSON.stringify([scene.action, scene.motion, scene.camera, String(scene.durationSec), scene.aspectRatio, scene.animationPrompt, scene.characterIds, scene.visual?.id ?? null, scene.background?.id ?? null]),
    [scene],
  );
  const dirty = snapshot !== JSON.stringify([action, motion, camera, durationSec, aspect, prompt, characterIds, reference?.id ?? null, background?.id ?? null]);

  const save = async (quiet = false) =>
    !!(await run(
      saveSceneAnimation({
        id: scene.id,
        action,
        motion,
        camera,
        durationSec: duration,
        aspectRatio: aspect,
        animationPrompt: prompt,
        characterIds,
        visualAssetId: reference?.id ?? null,
        backgroundAssetId: background?.id ?? null,
      }),
      quiet ? undefined : "Shot saved",
    ));

  const build = async () => {
    if (dirty && !(await save(true))) return;
    const res = await run(generateVisualPrompt({ sceneId: scene.id, kind: "animation" }));
    if (res) setPrompt(res.prompt);
  };

  const submit = async () => {
    if (dirty && !(await save(true))) return;
    const job = await run(startVideoGeneration({ sceneId: scene.id, prompt, seconds: clipSeconds, aspectRatio: aspect, referenceAssetId: reference?.id ?? null }), "Job submitted to the provider");
    if (job) onJob(job);
  };

  const aspectSupported = !video.limits || video.limits.aspects.includes(aspect);
  const finished = jobs.filter((j) => j.status === "succeeded" && j.resultAssetId);

  return (
    <Modal
      open
      onClose={onClose}
      title={`Scene ${scene.position + 1}${scene.title ? ` · ${scene.title}` : ""}`}
      description="Set up the shot, then generate a clip or upload one you animated elsewhere."
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button loading={pending} disabled={!dirty || !validDuration} onClick={() => save()}>
            Save shot
          </Button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Shot setup */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-navy-800">Characters in the shot</span>
            <CastPicker options={cast} value={characterIds} onChange={setCharacterIds} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <AssetField
              label="Reference image (first frame)"
              asset={reference}
              onChange={setReference}
              kind="image"
              categories={["storyboard", "generated_image"]}
              uploadCategory="storyboard"
              episodeId={episodeId}
              hint="Keeps the characters on-model in the clip."
            />
            <AssetField label="Background" asset={background} onChange={setBackground} kind="image" categories={["background"]} uploadCategory="background" episodeId={episodeId} />
          </div>
          <TextAreaField label="Action description" value={action} onChange={(e) => setAction(e.target.value)} rows={2} placeholder="What happens in this shot?" />
          <TextAreaField label="Motion description" value={motion} onChange={(e) => setMotion(e.target.value)} rows={2} placeholder="How do the characters move?" />
          <TextAreaField label="Camera movement" value={camera} onChange={(e) => setCamera(e.target.value)} rows={2} placeholder="e.g. Slow push in, then whip pan to Potato" />
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Scene duration (s)"
              type="number"
              inputMode="decimal"
              min={0.5}
              max={600}
              step={0.5}
              value={durationSec}
              onChange={(e) => setDurationSec(e.target.value)}
              error={validDuration ? undefined : "0.5–600 seconds"}
            />
            <SelectField label="Aspect ratio" value={aspect} onChange={(e) => setAspect(e.target.value as Aspect)}>
              {ASPECT_RATIOS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </SelectField>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label htmlFor="anim-prompt" className="text-[13px] font-semibold text-navy-800">
                Generation prompt
              </label>
              <Button size="sm" variant="secondary" icon={<Wand2 className="size-3.5" />} loading={pending} onClick={build}>
                {prompt ? "Rebuild prompt" : "Build prompt"}
              </Button>
            </div>
            <Textarea
              id="anim-prompt"
              rows={prompt ? 9 : 3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Tap “Build prompt” to assemble one from this shot, its location and the characters' Consistency Profiles. Edit it freely."
              className="font-mono text-[13px] md:text-xs"
            />
          </div>
        </div>

        {/* Output */}
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-navy-800">Clip for this scene</p>
            {scene.clip ? (
              <>
                <AssetPlayer asset={scene.clip} />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-xs text-muted">{scene.clip.name}</span>
                  <Button size="sm" variant="ghost" className="!text-bad-700 hover:!bg-bad-100" loading={pending} onClick={() => run(setSceneClip({ sceneId: scene.id, assetId: null }), "Clip removed from scene")}>
                    Remove from scene
                  </Button>
                </div>
              </>
            ) : (
              <div className="grid aspect-video place-items-center rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50 text-center">
                <div className="px-4">
                  <Film className="mx-auto size-8 text-brand-300" />
                  <p className="mt-1.5 text-sm font-semibold text-navy-800">No clip yet</p>
                  <p className="text-xs text-muted">Generate one below or upload your own.</p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-brand-50 p-3.5 ring-1 ring-line/70">
            <p className="text-sm font-bold text-navy-900">Generate with AI</p>
            {video.ready ? (
              <>
                <p className="mt-0.5 text-xs text-muted">
                  {video.providerName} · {video.model}. Billed per second of video to your provider account.
                </p>
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <SelectField label="Clip length" value={clipSeconds} onChange={(e) => setClipSeconds(Number(e.target.value))} className="w-32">
                    {durations.map((d) => (
                      <option key={d} value={d}>
                        {d} seconds
                      </option>
                    ))}
                  </SelectField>
                  <Button icon={<Sparkles className="size-4" />} loading={pending} disabled={!aspectSupported || prompt.trim().length < 10} onClick={submit}>
                    Submit generation job
                  </Button>
                </div>
                {!aspectSupported ? (
                  <p className="mt-2 text-xs font-medium text-warn-700">
                    {video.model} supports {video.limits?.aspects.join(" and ")} only. Change the aspect ratio to generate.
                  </p>
                ) : prompt.trim().length < 10 ? (
                  <p className="mt-2 text-xs text-muted">Build or write a generation prompt first.</p>
                ) : null}
              </>
            ) : (
              <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
                Not available — no video provider is connected.{" "}
                <Link href="/settings" className="font-semibold text-brand-700 underline">
                  Open Settings
                </Link>
              </p>
            )}
          </div>

          <div className="rounded-2xl bg-brand-50 p-3.5 ring-1 ring-line/70">
            <p className="text-sm font-bold text-navy-900">Use your own clip</p>
            <p className="mt-0.5 text-xs text-muted">Animated it in another app? Upload the video or pick one from the Asset Library.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <UploadButton
                category="animation_clip"
                multiple={false}
                sceneId={scene.id}
                variant="secondary"
                onUploaded={(a) => a[0] && run(setSceneClip({ sceneId: scene.id, assetId: a[0].id }), "Clip added to scene")}
              >
                Upload clip
              </UploadButton>
              <Button variant="secondary" icon={<UploadCloud className="size-4 rotate-180" />} onClick={() => setPickClip(true)}>
                Choose from library
              </Button>
            </div>
          </div>

          {jobs.length ? (
            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-navy-800">Jobs for this scene</p>
              <ul className="flex flex-col gap-2">
                {jobs.map((job) => (
                  <li key={job.id} className="rounded-2xl bg-white p-3 ring-1 ring-line">
                    <div className="flex flex-wrap items-center gap-2">
                      <JobBadge job={job} />
                      <span className="text-xs text-muted">
                        {job.model} · {timeAgo(job.createdAt)}
                      </span>
                      <span className="flex-1" />
                      {job.status === "queued" || job.status === "running" ? (
                        <Button size="sm" variant="ghost" onClick={() => run(cancelJob({ id: job.id }), "Stopped tracking this job")}>
                          Stop tracking
                        </Button>
                      ) : null}
                      {job.status === "succeeded" && job.resultAssetId && job.resultAssetId !== scene.clip?.id ? (
                        <Button size="sm" variant="secondary" loading={pending} onClick={() => run(setSceneClip({ sceneId: scene.id, assetId: job.resultAssetId }), "Clip set for this scene")}>
                          Use this clip
                        </Button>
                      ) : null}
                    </div>
                    {typeof job.progress === "number" && (job.status === "running" || job.status === "queued") ? <ProgressBar value={job.progress * 100} className="mt-2" /> : null}
                    {job.status === "failed" && job.error ? <p className="mt-1.5 text-xs font-medium text-bad-700">{job.error}</p> : null}
                  </li>
                ))}
              </ul>
              {finished.length > 1 ? <p className="mt-1.5 text-xs text-muted">Every finished clip is saved in the Asset Library under Animation clips.</p> : null}
            </div>
          ) : null}
        </div>
      </div>

      <AssetPicker
        open={pickClip}
        onClose={() => setPickClip(false)}
        kind="video"
        categories={["animation_clip"]}
        uploadCategory="animation_clip"
        title="Choose a clip"
        onPick={async (a) => {
          setPickClip(false);
          await run(setSceneClip({ sceneId: scene.id, assetId: a.id }), "Clip set for this scene");
        }}
      />
    </Modal>
  );
}
