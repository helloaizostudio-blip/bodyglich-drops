"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, CircleCheck, Download, ExternalLink, FileJson, FileText, Package, Save, Send, Unplug } from "lucide-react";
import type { Asset, EpisodeStage, PublishStatus, PublishingRecord } from "@/db/schema";
import type { PublishingHistoryRow, PublishingView } from "@/server/services/publishing";
import { markEpisodePublished, savePublishing } from "@/server/actions/publishing";
import { cn, fileUrl, formatBytes } from "@/lib/utils";
import { Button, buttonClass } from "@/components/ui/button";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { Badge, Card, Notice, PageHeader, ProgressBar, SectionTitle } from "@/components/ui/misc";
import { ConfirmDialog } from "@/components/ui/modal";
import { AssetField } from "@/components/ui/asset-picker";
import { useRun } from "@/components/ui/use-run";
import { useToast } from "@/components/ui/toast";
import { EpisodeSwitcher, type EpisodeOption } from "@/components/episodes/episode-switcher";
import { YT_DESCRIPTION_MAX, YT_TAGS_MAX, YT_THUMBNAIL_MAX_BYTES, YT_TITLE_MAX, hasAngleBrackets, isHttpUrl, metadataProblems, tagCharacters } from "./limits";
import { LocalDateTime, formatLocal, isoToLocalInput, localInputToIso, useMounted } from "./local-date";
import { TagInput } from "./tag-input";

type Visibility = PublishingRecord["visibility"];
type EpisodeInfo = { id: string; number: number; title: string; stage: EpisodeStage };

const STATUS_LABELS: Record<PublishStatus, string> = { draft: "Draft", ready: "Ready to publish", scheduled: "Scheduled", published: "Published" };
const STATUS_TONES: Record<PublishStatus, "gray" | "blue" | "lav" | "ok"> = { draft: "gray", ready: "blue", scheduled: "lav", published: "ok" };
const VISIBILITY_LABELS: Record<Visibility, string> = { private: "Private", unlisted: "Unlisted", public: "Public" };

type FormState = {
  title: string;
  description: string;
  tags: string[];
  visibility: Visibility;
  thumbnail: Asset | null;
  video: Asset | null;
  status: PublishStatus;
  /** ISO timestamps, "" when not set. */
  scheduledAt: string;
  publishedAt: string;
  youtubeUrl: string;
};

const iso = (d: Date | null | undefined) => (d ? new Date(d).toISOString() : "");

function stateFrom(record: PublishingRecord | null, thumbnail: Asset | null, video: Asset | null): FormState {
  return {
    title: record?.title ?? "",
    description: record?.description ?? "",
    tags: record?.tags ?? [],
    visibility: record?.visibility ?? "private",
    thumbnail,
    video,
    status: record?.status ?? "draft",
    scheduledAt: iso(record?.scheduledAt),
    publishedAt: iso(record?.publishedAt),
    youtubeUrl: record?.youtubeUrl ?? "",
  };
}

const fingerprint = (s: FormState) =>
  JSON.stringify([s.title.trim(), s.description.trim(), s.tags, s.visibility, s.thumbnail?.id ?? null, s.video?.id ?? null, s.status, s.scheduledAt, s.publishedAt, s.youtubeUrl.trim()]);

function StatusBadge({ status }: { status: PublishStatus | null }) {
  if (!status) return <Badge tone="gray">Not started</Badge>;
  return <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>;
}

function download(filename: string, mimeType: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const counter = (used: number, max: number, unit = "characters") => `${used.toLocaleString("en-US")} / ${max.toLocaleString("en-US")} ${unit}`;

export function PublishingCenter({
  episode,
  episodes,
  view,
  history,
}: {
  episode: EpisodeInfo;
  episodes: EpisodeOption[];
  view: PublishingView;
  history: PublishingHistoryRow[];
}) {
  const { run, pending } = useRun();
  const toast = useToast();
  const mounted = useMounted();
  const [form, setForm] = useState<FormState>(() => stateFrom(view.record, view.thumbnail, view.video));
  const [confirmPublish, setConfirmPublish] = useState(false);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const savedStatus = view.record?.status ?? null;
  const alreadyPublished = savedStatus === "published";
  const dirty = fingerprint(form) !== fingerprint(stateFrom(view.record, view.thumbnail, view.video));

  const tagChars = tagCharacters(form.tags);
  const titleOver = form.title.length > YT_TITLE_MAX;
  const descriptionOver = form.description.length > YT_DESCRIPTION_MAX;
  const tagsOver = tagChars > YT_TAGS_MAX;
  const problems = metadataProblems(form);
  const url = form.youtubeUrl.trim();
  const urlInvalid = !!url && !isHttpUrl(url);
  const scheduleMissing = form.status === "scheduled" && !form.scheduledAt;
  const scheduleInPast = form.status === "scheduled" && !!form.scheduledAt && mounted && new Date(form.scheduledAt).getTime() < Date.now();
  // Drafts can be saved while they are still over a limit; anything past Draft has to fit YouTube's rules.
  const blocker = urlInvalid
    ? "Fix the YouTube link to save."
    : scheduleMissing
      ? "Choose the scheduled date and time to save."
      : form.status !== "draft" && !form.title.trim()
        ? "Add a video title, or set the status back to Draft."
        : form.status !== "draft" && problems.length
          ? `${problems[0]} Fix it, or set the status back to Draft.`
          : "";

  const checklist = [
    { label: "Video title", done: !!form.title.trim() && !titleOver && !hasAngleBrackets(form.title), detail: !form.title.trim() ? "Missing" : titleOver ? "Too long" : hasAngleBrackets(form.title) ? "Contains < or >" : "Ready" },
    {
      label: "Description",
      done: !!form.description.trim() && !descriptionOver && !hasAngleBrackets(form.description),
      detail: !form.description.trim() ? "Missing" : descriptionOver ? "Too long" : hasAngleBrackets(form.description) ? "Contains < or >" : "Ready",
    },
    { label: "Thumbnail", done: !!form.thumbnail, detail: form.thumbnail ? form.thumbnail.name : "Missing" },
    { label: "Video file", done: !!form.video, detail: form.video ? form.video.name : "Missing" },
  ];
  const readyCount = checklist.filter((c) => c.done).length;
  const missing = checklist.filter((c) => !c.done).map((c) => c.label.toLowerCase());

  const payload = (status: PublishStatus) => ({
    episodeId: episode.id,
    title: form.title,
    description: form.description,
    tags: form.tags,
    visibility: form.visibility,
    thumbnailAssetId: form.thumbnail?.id ?? null,
    videoAssetId: form.video?.id ?? null,
    status,
    scheduledAt: form.scheduledAt || null,
    publishedAt: form.publishedAt || null,
    youtubeUrl: form.youtubeUrl,
  });

  // After a save, adopt what the server stored (trimmed text, de-duplicated tags, dates).
  const adopt = (record: PublishingRecord) => setForm((f) => stateFrom(record, f.thumbnail, f.video));

  const save = async () => {
    const record = await run(savePublishing(payload(form.status)), "Publishing package saved");
    if (record) adopt(record);
  };

  const askToPublish = () => {
    if (urlInvalid) return toast.error("Fix the YouTube link first.");
    if (!form.title.trim()) return toast.error("Add a video title before marking this episode as published.");
    if (problems.length) return toast.error(problems[0]);
    setConfirmPublish(true);
  };

  /* ---------------- export (built in the browser, nothing is sent anywhere) ---------------- */

  const slug = `ep${String(episode.number).padStart(2, "0")}-${
    (form.title || episode.title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 50)
      .replace(/^-+|-+$/g, "") || "episode"
  }`;
  const downloadLink = (asset: Asset) => `${window.location.origin}${fileUrl(asset.id)}?download=1`;

  const exportJson = () => {
    const pkg = {
      app: "FRAMEFORGE",
      kind: "youtube-publishing-package",
      exportedAt: new Date().toISOString(),
      episode: { number: episode.number, title: episode.title },
      title: form.title.trim(),
      description: form.description.trim(),
      tags: form.tags,
      visibility: form.visibility,
      status: form.status,
      scheduledAt: form.status === "scheduled" && form.scheduledAt ? form.scheduledAt : null,
      publishedAt: form.status === "published" && form.publishedAt ? form.publishedAt : null,
      youtubeUrl: url || null,
      thumbnail: form.thumbnail
        ? { name: form.thumbnail.name, mimeType: form.thumbnail.mimeType, sizeBytes: form.thumbnail.sizeBytes, width: form.thumbnail.width, height: form.thumbnail.height, downloadUrl: downloadLink(form.thumbnail) }
        : null,
      video: form.video
        ? { name: form.video.name, mimeType: form.video.mimeType, sizeBytes: form.video.sizeBytes, durationSec: form.video.durationSec, downloadUrl: downloadLink(form.video) }
        : null,
      note: "Download links only work while you are signed in to FRAMEFORGE. Nothing in this package has been sent to YouTube.",
    };
    download(`${slug}-publishing.json`, "application/json", JSON.stringify(pkg, null, 2));
    toast.success("JSON package downloaded");
  };

  const exportText = () => {
    const lines = [
      "FRAMEFORGE — YouTube publishing package",
      `Episode ${episode.number}: ${episode.title}`,
      `Exported: ${formatLocal(new Date())}`,
      "",
      "TITLE",
      form.title.trim() || "(not written yet)",
      "",
      "DESCRIPTION",
      form.description.trim() || "(not written yet)",
      "",
      "TAGS",
      form.tags.length ? form.tags.join(", ") : "(none)",
      "",
      `VISIBILITY: ${VISIBILITY_LABELS[form.visibility]}`,
      `STATUS: ${STATUS_LABELS[form.status]}`,
      `SCHEDULE: ${form.status === "scheduled" && form.scheduledAt ? `${formatLocal(form.scheduledAt)} (your local time) — ${form.scheduledAt}` : "not scheduled"}`,
      ...(url ? [`YOUTUBE LINK: ${url}`] : []),
      "",
      "FILES (download links work while you are signed in to FRAMEFORGE)",
      `Thumbnail: ${form.thumbnail ? `${form.thumbnail.name} — ${downloadLink(form.thumbnail)}` : "(not chosen yet)"}`,
      `Video: ${form.video ? `${form.video.name} — ${downloadLink(form.video)}` : "(not chosen yet)"}`,
      "",
      "Upload the video in YouTube Studio yourself — nothing in this package has been sent to YouTube.",
      "",
    ];
    download(`${slug}-publishing.txt`, "text/plain;charset=utf-8", lines.join("\n"));
    toast.success("Text package downloaded");
  };

  const statusOptions: PublishStatus[] = alreadyPublished || form.status === "published" ? ["draft", "ready", "scheduled", "published"] : ["draft", "ready", "scheduled"];
  const thumbnailTooBig = !!form.thumbnail && form.thumbnail.sizeBytes > YT_THUMBNAIL_MAX_BYTES;

  return (
    <>
      <PageHeader title="Publishing Center" subtitle="Prepare each episode's YouTube package and keep track of what has gone live.">
        <div className="max-w-xl">
          <EpisodeSwitcher episodes={episodes} currentId={episode.id} />
        </div>
      </PageHeader>

      <Notice tone="warn" icon={<Unplug />} title="YouTube is not connected — publishing is manual" className="mb-4 sm:mb-5">
        Direct upload through the YouTube Data API is not connected in this build. Prepare the package here, export it, upload the video yourself in YouTube Studio, then paste the
        link below and mark the episode as published. Nothing on this page is sent to YouTube.
      </Notice>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
        <Card className="min-w-0 p-4 sm:p-5 lg:col-span-2">
          <SectionTitle action={<StatusBadge status={savedStatus} />}>
            <span className="block truncate">
              EP {episode.number} · {episode.title}
            </span>
          </SectionTitle>
          {/* Not a <form>: the asset pickers render inside it, and Enter in their search box must not save. */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <TextField
                label="Video title"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder={episode.title}
                error={titleOver ? `${counter(form.title.length, YT_TITLE_MAX)} — ${form.title.length - YT_TITLE_MAX} over YouTube's limit` : hasAngleBrackets(form.title) ? "YouTube does not allow < or > in a title." : undefined}
                hint={counter(form.title.length, YT_TITLE_MAX)}
              />
              {!form.title && episode.title ? (
                <button type="button" onClick={() => set("title", episode.title)} className="-my-1.5 h-10 w-fit rounded-lg text-[13px] font-semibold text-brand-700 hover:underline">
                  Use the episode title
                </button>
              ) : null}
            </div>

            <TextAreaField
              label="Description"
              rows={8}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What happens in this episode, credits, links…"
              error={
                descriptionOver
                  ? `${counter(form.description.length, YT_DESCRIPTION_MAX)} — ${(form.description.length - YT_DESCRIPTION_MAX).toLocaleString("en-US")} over YouTube's limit`
                  : hasAngleBrackets(form.description)
                    ? "YouTube does not allow < or > in a description."
                    : undefined
              }
              hint={counter(form.description.length, YT_DESCRIPTION_MAX)}
            />

            <TagInput
              label="Tags"
              value={form.tags}
              onChange={(tags) => set("tags", tags)}
              error={tagsOver ? `${counter(tagChars, YT_TAGS_MAX)} — ${tagChars - YT_TAGS_MAX} over YouTube's limit. Remove a tag or two.` : undefined}
              hint={`${counter(tagChars, YT_TAGS_MAX)} · ${form.tags.length} tag${form.tags.length === 1 ? "" : "s"} · commas between tags count`}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <AssetField
                  label="Thumbnail"
                  asset={form.thumbnail}
                  onChange={(a) => set("thumbnail", a)}
                  kind="image"
                  uploadCategory="generated_image"
                  episodeId={episode.id}
                  hint="YouTube recommends 1280 × 720 (16:9), under 2 MB."
                />
                {thumbnailTooBig && form.thumbnail ? (
                  <p className="text-xs font-medium text-warn-700">This image is {formatBytes(form.thumbnail.sizeBytes)} — YouTube only accepts thumbnails up to 2 MB.</p>
                ) : null}
              </div>
              <AssetField
                label="Video file"
                asset={form.video}
                onChange={(a) => set("video", a)}
                kind="video"
                categories={["final_video"]}
                uploadCategory="final_video"
                episodeId={episode.id}
                hint="The finished episode, from the Video Editor or uploaded here."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="Visibility" value={form.visibility} onChange={(e) => set("visibility", e.target.value as Visibility)} hint="The setting to choose when you upload to YouTube.">
                {(Object.keys(VISIBILITY_LABELS) as Visibility[]).map((v) => (
                  <option key={v} value={v}>
                    {VISIBILITY_LABELS[v]}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Publishing status"
                value={form.status}
                onChange={(e) => set("status", e.target.value as PublishStatus)}
                hint={alreadyPublished ? "Moving back from Published clears the published date." : "To publish, use “Mark as published” below."}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </SelectField>
              {form.status === "scheduled" ? (
                <TextField
                  label="Scheduled date and time"
                  type="datetime-local"
                  value={mounted ? isoToLocalInput(form.scheduledAt) : ""}
                  onChange={(e) => set("scheduledAt", localInputToIso(e.target.value))}
                  error={scheduleMissing ? "Required while the status is Scheduled." : undefined}
                  hint={scheduleInPast ? "This time is already in the past." : "In your local time. Set the same time in YouTube Studio."}
                />
              ) : null}
              {form.status === "published" ? (
                <TextField
                  label="Published date"
                  type="datetime-local"
                  value={mounted ? isoToLocalInput(form.publishedAt) : ""}
                  max={mounted ? isoToLocalInput(new Date().toISOString()) : undefined}
                  onChange={(e) => set("publishedAt", localInputToIso(e.target.value))}
                  hint="When the video went live, in your local time."
                />
              ) : null}
              <TextField
                label="YouTube link (optional)"
                type="url"
                inputMode="url"
                autoCapitalize="none"
                autoComplete="off"
                value={form.youtubeUrl}
                onChange={(e) => set("youtubeUrl", e.target.value)}
                placeholder="https://youtu.be/…"
                error={urlInvalid ? "Enter the full link, starting with https://" : undefined}
                hint="Paste it once the video is uploaded."
                className={form.status === "draft" || form.status === "ready" ? "sm:col-span-2" : undefined}
              />
            </div>

            <div className="flex flex-col gap-2 border-t border-line pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={save} loading={pending} disabled={!!blocker} icon={<Save className="size-4" />}>
                  Save
                </Button>
                {alreadyPublished ? null : (
                  <Button variant="navy" disabled={pending} icon={<Send className="size-4" />} onClick={askToPublish}>
                    Mark as published
                  </Button>
                )}
                <span className="text-xs font-medium text-muted" role="status">
                  {dirty ? "Unsaved changes" : view.record ? "All changes saved" : "Nothing saved for this episode yet"}
                </span>
              </div>
              {blocker ? <p className="text-xs font-medium text-bad-700">{blocker}</p> : null}
            </div>
          </div>
        </Card>

        <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
          <Card className="p-4 sm:p-5">
            <SectionTitle
              action={
                <span className="text-xs font-bold tabular-nums text-navy-800">
                  {readyCount} of {checklist.length}
                </span>
              }
            >
              Readiness
            </SectionTitle>
            <ProgressBar value={(readyCount / checklist.length) * 100} className="mb-3.5" />
            <ul className="flex flex-col gap-2.5">
              {checklist.map((c) => (
                <li key={c.label} className="flex items-center gap-2.5">
                  <span className={cn("grid size-5 shrink-0 place-items-center rounded-md", c.done ? "bg-brand-500 text-white" : "ring-1 ring-inset ring-line")}>
                    {c.done ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : null}
                  </span>
                  <span className="text-sm font-semibold text-navy-900">{c.label}</span>
                  <span className={cn("ml-auto min-w-0 truncate text-xs", c.done ? "text-muted" : "font-semibold text-warn-700")}>{c.detail}</span>
                </li>
              ))}
            </ul>
            {readyCount === checklist.length ? (
              <p className="mt-3.5 flex items-center gap-1.5 text-xs font-semibold text-ok-700">
                <CircleCheck className="size-4" aria-hidden /> Everything YouTube needs is here.
              </p>
            ) : null}
          </Card>

          <Card className="p-4 sm:p-5">
            <SectionTitle>
              <span className="flex items-center gap-2">
                <Package className="size-[18px] text-brand-600" aria-hidden /> Export publishing package
              </span>
            </SectionTitle>
            <p className="mb-3 text-xs leading-relaxed text-muted">
              Downloads the title, description, tags, visibility and schedule as shown in the form{dirty ? " (including unsaved changes)" : ""}, plus download links for the files.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" icon={<FileJson className="size-4" />} onClick={exportJson}>
                JSON
              </Button>
              <Button variant="secondary" icon={<FileText className="size-4" />} onClick={exportText}>
                Text
              </Button>
              {form.thumbnail ? (
                <a href={`${fileUrl(form.thumbnail.id)}?download=1`} className={buttonClass("ghost", "md", "ring-1 ring-inset ring-line")}>
                  <Download className="size-4" aria-hidden /> Thumbnail
                </a>
              ) : null}
              {form.video ? (
                <a href={`${fileUrl(form.video.id)}?download=1`} className={buttonClass("ghost", "md", "ring-1 ring-inset ring-line")}>
                  <Download className="size-4" aria-hidden /> Video
                </a>
              ) : null}
            </div>
          </Card>
        </div>
      </div>

      <section className="mt-6 sm:mt-8">
        <SectionTitle>Episode history</SectionTitle>
        <Card className="overflow-hidden">
          {/* Phones: one block per episode */}
          <ul className="divide-y divide-line/70 md:hidden">
            {history.map((h) => (
              <li key={h.episodeId} className={cn("flex flex-col gap-2 p-4", h.episodeId === episode.id && "bg-brand-50")}>
                <div className="flex items-center justify-between gap-3">
                  <Link href={`/publishing?episode=${h.episodeId}`} className="flex min-h-10 min-w-0 items-center text-sm font-bold text-navy-900 hover:underline">
                    <span>
                      <span className="text-brand-700">EP {h.number}</span> · {h.title}
                    </span>
                  </Link>
                  <StatusBadge status={h.status} />
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <div>
                    <dt className="font-bold uppercase tracking-wider text-faint">Scheduled</dt>
                    <dd className="text-navy-800">
                      <LocalDateTime value={h.scheduledAt} />
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold uppercase tracking-wider text-faint">Published</dt>
                    <dd className="text-navy-800">
                      <LocalDateTime value={h.publishedAt} />
                    </dd>
                  </div>
                </dl>
                {h.youtubeUrl ? (
                  <a href={h.youtubeUrl} target="_blank" rel="noopener noreferrer" className="flex h-10 w-fit items-center gap-1.5 text-[13px] font-semibold text-brand-700 hover:underline">
                    <ExternalLink className="size-3.5" aria-hidden /> Open on YouTube
                  </a>
                ) : null}
              </li>
            ))}
          </ul>

          {/* Larger screens: a table */}
          <table className="hidden w-full text-left text-sm md:table">
            <thead>
              <tr className="border-b border-line bg-brand-50/60 text-[11px] font-bold uppercase tracking-wider text-faint">
                <th scope="col" className="w-2/5 px-5 py-3">
                  Episode
                </th>
                <th scope="col" className="px-3 py-3">
                  Status
                </th>
                <th scope="col" className="px-3 py-3">
                  Scheduled
                </th>
                <th scope="col" className="px-3 py-3">
                  Published
                </th>
                <th scope="col" className="px-5 py-3">
                  YouTube
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {history.map((h) => (
                <tr key={h.episodeId} className={h.episodeId === episode.id ? "bg-brand-50" : undefined}>
                  <td className="max-w-0 px-5 py-3">
                    <Link href={`/publishing?episode=${h.episodeId}`} className="block truncate font-semibold text-navy-900 hover:underline">
                      <span className="text-brand-700">EP {h.number}</span> · {h.title}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <StatusBadge status={h.status} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-navy-800">
                    <LocalDateTime value={h.scheduledAt} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-navy-800">
                    <LocalDateTime value={h.publishedAt} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-3">
                    {h.youtubeUrl ? (
                      <a href={h.youtubeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:underline">
                        <ExternalLink className="size-3.5" aria-hidden /> Open
                      </a>
                    ) : (
                      <span className="text-faint">–</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <ConfirmDialog
        open={confirmPublish}
        onClose={() => setConfirmPublish(false)}
        danger={false}
        title="Mark this episode as published?"
        confirmLabel="Yes, it is live"
        message={
          <div className="flex flex-col gap-2.5">
            <p>
              Only confirm once <strong>{form.title.trim() || episode.title}</strong> is actually live on YouTube. FRAMEFORGE does not upload it for you and sends nothing to YouTube.
            </p>
            <p>
              Confirming saves this package, sets its status to Published with {form.publishedAt ? "the published date you entered" : "the current date and time"}, and moves the episode
              to the Published stage.
            </p>
            {missing.length ? <p className="font-semibold text-warn-700">Still missing here: {missing.join(", ")}.</p> : null}
            {url ? null : <p className="text-muted">No YouTube link yet — you can paste it afterwards.</p>}
          </div>
        }
        onConfirm={async () => {
          const record = await run(markEpisodePublished(payload("published")), "Episode marked as published");
          if (record) adopt(record);
          setConfirmPublish(false);
        }}
      />
    </>
  );
}
