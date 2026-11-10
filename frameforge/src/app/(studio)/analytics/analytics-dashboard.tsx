"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, BarChart3, ExternalLink, Eye, MessageSquare, Pencil, Percent, Plus, ThumbsUp, Timer, Trash2, Unplug } from "lucide-react";
import type { AnalyticsEntry } from "@/db/schema";
import type { AnalyticsOverview, EpisodeAnalytics } from "@/server/services/analytics";
import { deleteAnalyticsEntry, saveAnalyticsEntry } from "@/server/actions/analytics";
import { cn, formatDuration } from "@/lib/utils";
import { Button, IconButton } from "@/components/ui/button";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { Card, EmptyState, Notice, PageHeader, SectionTitle } from "@/components/ui/misc";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { useRun } from "@/components/ui/use-run";
import { EpisodeSwitcher, type EpisodeOption } from "@/components/episodes/episode-switcher";
import { LocalDateTime } from "../publishing/local-date";
import { engagementRate, formatDay, formatInt, formatPercent, formatRate, parseDuration, todayLocal } from "./metrics";
import { ViewsChart } from "./views-chart";

type Editing = { mode: "add"; episodeId: string } | { mode: "edit"; entry: AnalyticsEntry };

/** The figures of one snapshot, formatted for a table row or a card. A missing snapshot shows dashes, never zeros. */
function figures(e: AnalyticsEntry | null) {
  return [
    { label: "Views", value: e ? formatInt(e.views) : "–" },
    { label: "Likes", value: e ? formatInt(e.likes) : "–" },
    { label: "Comments", value: e ? formatInt(e.comments) : "–" },
    { label: "Engagement", value: formatRate(engagementRate(e)) },
    { label: "Avg view", value: e?.avgViewDurationSec != null ? formatDuration(e.avgViewDurationSec) : "–" },
    { label: "Retention", value: formatPercent(e?.retentionPct) },
  ];
}

function StatTile({ icon, label, value, note, className }: { icon: React.ReactNode; label: string; value: string; note: string; className?: string }) {
  return (
    <Card className={cn("p-4", className)}>
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-faint [&>svg]:size-3.5 [&>svg]:text-brand-600">
        {icon}
        {label}
      </p>
      <p className="font-display mt-1.5 text-[26px] font-extrabold leading-none tabular-nums text-navy-900">{value}</p>
      <p className="mt-1.5 text-[11px] leading-snug text-muted">{note}</p>
    </Card>
  );
}

export function AnalyticsDashboard({
  rows,
  overview,
  selectedId,
  episodes,
}: {
  rows: EpisodeAnalytics[];
  overview: AnalyticsOverview;
  selectedId: string;
  episodes: EpisodeOption[];
}) {
  const router = useRouter();
  const { run } = useRun();
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleting, setDeleting] = useState<AnalyticsEntry | null>(null);

  const selected = rows.find((r) => r.episodeId === selectedId) ?? rows[0];
  const hasData = overview.episodesWithData > 0;

  // Episodes without any snapshot always sort last — they have no views figure to compare.
  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        if (!a.latest || !b.latest) return a.latest ? -1 : b.latest ? 1 : b.number - a.number;
        const diff = a.latest.views - b.latest.views;
        return (sortDir === "desc" ? -diff : diff) || b.number - a.number;
      }),
    [rows, sortDir],
  );

  const select = (episodeId: string) => router.push(`/analytics?episode=${episodeId}`, { scroll: false });
  const addButton = (
    <Button icon={<Plus className="size-4" />} onClick={() => setEditing({ mode: "add", episodeId: selected.episodeId })}>
      Add snapshot
    </Button>
  );
  const sortButton = (
    <Button
      variant="secondary"
      icon={sortDir === "desc" ? <ArrowDown className="size-4" /> : <ArrowUp className="size-4" />}
      onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
      aria-label={`Sorted by views, ${sortDir === "desc" ? "highest" : "lowest"} first. Tap to reverse.`}
    >
      Views: {sortDir === "desc" ? "high to low" : "low to high"}
    </Button>
  );

  const selectedEntries = [...selected.entries].reverse();
  const coverage = `Latest snapshot of ${overview.episodesWithData} of ${overview.episodeCount} episode${overview.episodeCount === 1 ? "" : "s"}`;

  return (
    <>
      <PageHeader title="Analytics" subtitle="How each episode is doing, from the numbers you record." actions={hasData ? addButton : undefined} />

      {hasData ? (
        <>
          <Notice tone="blue" icon={<Unplug />} title="YouTube Analytics is not connected" className="mb-4 sm:mb-5">
            Every number here was typed in by hand from YouTube Studio. Each entry is a snapshot of an episode&apos;s running totals on one date — add a new one whenever you check.
          </Notice>

          <section aria-label="Overview" className="mb-6 grid grid-cols-2 gap-3 sm:mb-8 md:grid-cols-3 lg:gap-4 xl:grid-cols-5">
            <StatTile icon={<Eye />} label="Total views" value={formatInt(overview.views)} note={coverage} />
            <StatTile icon={<ThumbsUp />} label="Likes" value={formatInt(overview.likes)} note={coverage} />
            <StatTile icon={<MessageSquare />} label="Comments" value={formatInt(overview.comments)} note={coverage} />
            <StatTile icon={<Percent />} label="Engagement rate" value={formatRate(overview.engagementRate)} note="(Likes + comments) ÷ views" />
            <StatTile
              className="col-span-2 md:col-span-1"
              icon={<Timer />}
              label="Avg view duration"
              value={overview.avgViewDurationSec != null ? formatDuration(overview.avgViewDurationSec) : "–"}
              note={overview.avgViewDurationSec != null ? "Across episodes, weighted by views" : "No durations recorded yet"}
            />
          </section>

          <section className="mb-6 sm:mb-8">
            <SectionTitle action={<div className="xl:hidden">{sortButton}</div>}>Episode performance</SectionTitle>
            <Card className="overflow-hidden">
              {/* Phones and tablets: one block per episode */}
              <ul className="divide-y divide-line/70 xl:hidden">
                {sorted.map((r) => (
                  <li key={r.episodeId} className={cn(r.episodeId === selected.episodeId && "bg-brand-50")}>
                    <button type="button" onClick={() => select(r.episodeId)} aria-current={r.episodeId === selected.episodeId} className="flex w-full flex-col gap-2.5 p-4 text-left">
                      <span className="block">
                        <span className="block text-sm font-bold text-navy-900">
                          <span className="text-brand-700">EP {r.number}</span> · {r.title}
                        </span>
                        <span className="block text-xs text-muted">
                          {r.publishedAt ? (
                            <>
                              Uploaded <LocalDateTime value={r.publishedAt} dateOnly />
                            </>
                          ) : (
                            "Not marked as published"
                          )}
                          {r.latest ? ` · as of ${formatDay(r.latest.recordedOn)}` : " · no snapshots yet"}
                        </span>
                      </span>
                      <span className="grid grid-cols-3 gap-x-3 gap-y-2 sm:grid-cols-6">
                        {figures(r.latest).map((f) => (
                          <span key={f.label} className="block">
                            <span className="block text-[10.5px] font-bold uppercase tracking-wider text-faint">{f.label}</span>
                            <span className="block text-sm font-semibold tabular-nums text-navy-900">{f.value}</span>
                          </span>
                        ))}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              {/* Wide screens: a table */}
              <table className="hidden w-full text-left text-sm xl:table">
                <thead>
                  <tr className="border-b border-line bg-brand-50/60 text-[11px] font-bold uppercase tracking-wider text-faint">
                    <th scope="col" className="w-1/3 px-5 py-3">
                      Episode
                    </th>
                    <th scope="col" className="px-3 py-3">
                      Upload date
                    </th>
                    <th scope="col" className="px-3 py-3 text-right" aria-sort={sortDir === "desc" ? "descending" : "ascending"}>
                      <button
                        type="button"
                        onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
                        className="-my-2 inline-flex h-10 items-center gap-1 font-bold uppercase tracking-wider text-navy-800 hover:text-brand-700"
                        title="Sort by views"
                      >
                        Views {sortDir === "desc" ? <ArrowDown className="size-3.5" aria-hidden /> : <ArrowUp className="size-3.5" aria-hidden />}
                      </button>
                    </th>
                    {["Likes", "Comments", "Engagement", "Avg view", "Retention"].map((h) => (
                      <th key={h} scope="col" className={cn("px-3 py-3 text-right", h === "Retention" && "pr-5")}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {sorted.map((r) => (
                    <tr key={r.episodeId} className={r.episodeId === selected.episodeId ? "bg-brand-50" : undefined}>
                      <td className="max-w-0 px-5 py-2.5">
                        <button type="button" onClick={() => select(r.episodeId)} aria-current={r.episodeId === selected.episodeId} className="flex min-h-10 w-full flex-col justify-center text-left">
                          <span className="block w-full truncate font-semibold text-navy-900 hover:underline">
                            <span className="text-brand-700">EP {r.number}</span> · {r.title}
                          </span>
                          <span className="block w-full truncate text-xs text-muted">{r.latest ? `As of ${formatDay(r.latest.recordedOn)}` : "No snapshots yet"}</span>
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-navy-800">
                        <LocalDateTime value={r.publishedAt} dateOnly />
                      </td>
                      {figures(r.latest).map((f, i) => (
                        <td key={f.label} className={cn("whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-navy-800", i === 0 && "font-bold text-navy-900", i === 5 && "pr-5")}>
                          {f.value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </section>

          <section>
            <SectionTitle>Episode detail</SectionTitle>
            <div className="mb-3 max-w-xl">
              <EpisodeSwitcher episodes={episodes} currentId={selected.episodeId} />
            </div>
            <Card className="p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-[15px] font-bold text-navy-900">Views over time</h3>
                  <p className="text-xs text-muted">Total views at each snapshot of “{selected.title}”.</p>
                </div>
                {selected.youtubeUrl ? (
                  <a href={selected.youtubeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-1.5 text-[13px] font-semibold text-brand-700 hover:underline">
                    <ExternalLink className="size-3.5" aria-hidden /> Open on YouTube
                  </a>
                ) : null}
              </div>
              <ViewsChart key={selected.episodeId} points={selected.entries.map((e) => ({ day: e.recordedOn, views: e.views }))} />

              <div className="mt-5 border-t border-line pt-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-[15px] font-bold text-navy-900">Snapshots ({selected.entries.length})</h3>
                  <Button variant="secondary" icon={<Plus className="size-4" />} onClick={() => setEditing({ mode: "add", episodeId: selected.episodeId })}>
                    Add snapshot
                  </Button>
                </div>
                {selectedEntries.length ? (
                  <ul className="divide-y divide-line/70">
                    {selectedEntries.map((e, i) => {
                      const previous = selectedEntries[i + 1];
                      const delta = previous ? e.views - previous.views : null;
                      return (
                        <li key={e.id} className="py-3">
                          <div className="flex items-center gap-1">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-navy-900">{formatDay(e.recordedOn)}</p>
                              {delta !== null ? (
                                <p className="text-xs font-medium text-muted">
                                  {delta >= 0 ? "+" : "−"}
                                  {formatInt(Math.abs(delta))} views since {formatDay(previous.recordedOn, true)}
                                </p>
                              ) : null}
                            </div>
                            <IconButton label={`Edit snapshot of ${formatDay(e.recordedOn)}`} onClick={() => setEditing({ mode: "edit", entry: e })}>
                              <Pencil className="size-4" />
                            </IconButton>
                            <IconButton label={`Delete snapshot of ${formatDay(e.recordedOn)}`} className="!text-bad-700 hover:!bg-bad-100" onClick={() => setDeleting(e)}>
                              <Trash2 className="size-4" />
                            </IconButton>
                          </div>
                          <dl className="mt-1.5 grid grid-cols-3 gap-x-3 gap-y-2 sm:grid-cols-6">
                            {figures(e).map((f) => (
                              <div key={f.label}>
                                <dt className="text-[10.5px] font-bold uppercase tracking-wider text-faint">{f.label}</dt>
                                <dd className="text-sm font-semibold tabular-nums text-navy-900">{f.value}</dd>
                              </div>
                            ))}
                          </dl>
                          {e.notes ? <p className="mt-1.5 whitespace-pre-wrap break-words text-xs leading-relaxed text-muted">{e.notes}</p> : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-[13px] text-muted">Nothing recorded for this episode yet.</p>
                )}
              </div>
            </Card>
          </section>
        </>
      ) : (
        <EmptyState icon={<BarChart3 />} title="No numbers yet" action={addButton}>
          Nothing has been recorded, so there is nothing to show. YouTube Analytics is not connected in this build — open YouTube Studio, read an episode&apos;s totals and type them
          in here as a snapshot. Add another whenever you check, and the trend builds up from your own entries.
        </EmptyState>
      )}

      {editing ? (
        <EntryModal
          key={editing.mode === "edit" ? editing.entry.id : "new"}
          editing={editing}
          rows={rows}
          onClose={() => setEditing(null)}
          onSaved={(episodeId) => {
            setEditing(null);
            if (episodeId !== selected.episodeId) select(episodeId);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete this snapshot?"
        message={
          deleting ? (
            <>
              The snapshot of <strong>{formatDay(deleting.recordedOn)}</strong> ({formatInt(deleting.views)} views) will be removed from “{selected.title}”. This cannot be undone.
            </>
          ) : null
        }
        confirmLabel="Delete snapshot"
        onConfirm={async () => {
          if (deleting) await run(deleteAnalyticsEntry({ id: deleting.id }), "Snapshot deleted");
          setDeleting(null);
        }}
      />
    </>
  );
}

/** Whole number typed by hand or pasted from YouTube Studio ("12,345"). null when it is not one. */
function parseCount(text: string): number | null {
  const v = text.replace(/[,\s]/g, "");
  return /^\d{1,10}$/.test(v) ? Number(v) : null;
}

function EntryModal({ editing, rows, onClose, onSaved }: { editing: Editing; rows: EpisodeAnalytics[]; onClose: () => void; onSaved: (episodeId: string) => void }) {
  const { run, pending } = useRun();
  const entry = editing.mode === "edit" ? editing.entry : null;
  const [episodeId, setEpisodeId] = useState(entry?.episodeId ?? (editing.mode === "add" ? editing.episodeId : ""));
  const [recordedOn, setRecordedOn] = useState(entry?.recordedOn ?? todayLocal());
  const [views, setViews] = useState(entry ? String(entry.views) : "");
  const [likes, setLikes] = useState(entry ? String(entry.likes) : "");
  const [comments, setComments] = useState(entry ? String(entry.comments) : "");
  const [duration, setDuration] = useState(entry?.avgViewDurationSec != null ? formatDuration(entry.avgViewDurationSec) : "");
  const [retention, setRetention] = useState(entry?.retentionPct != null ? String(entry.retentionPct) : "");
  const [notes, setNotes] = useState(entry?.notes ?? "");

  const episode = rows.find((r) => r.episodeId === episodeId);
  const others = (episode?.entries ?? []).filter((e) => e.id !== entry?.id);
  const sameDay = others.find((e) => e.recordedOn === recordedOn);
  const previous = others.filter((e) => e.recordedOn < recordedOn).at(-1);

  const v = parseCount(views);
  const l = parseCount(likes);
  const c = parseCount(comments);
  const d = parseDuration(duration);
  const retentionText = retention.replace(/[%\s]/g, "");
  const r = !retentionText ? null : /^\d+(\.\d+)?$/.test(retentionText) ? Number(retentionText) : "invalid";
  const countError = (text: string, parsed: number | null) => (text.trim() && parsed === null ? "Enter a whole number." : undefined);
  const valid = !!episodeId && !!recordedOn && !sameDay && v !== null && l !== null && c !== null && d !== "invalid" && r !== "invalid";

  const save = async () => {
    if (!valid) return;
    const saved = await run(
      saveAnalyticsEntry({ id: entry?.id, episodeId, recordedOn, views: v, likes: l, comments: c, avgViewDurationSec: d, retentionPct: r, notes }),
      entry ? "Snapshot updated" : "Snapshot added",
    );
    if (saved) onSaved(episodeId);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={entry ? "Edit snapshot" : "Add snapshot"}
      description="Copy the totals from YouTube Studio exactly as they stand on this date."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={save} loading={pending} disabled={!valid}>
            {entry ? "Save changes" : "Add snapshot"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Episode" value={episodeId} onChange={(e) => setEpisodeId(e.target.value)} disabled={!!entry}>
            {rows.map((row) => (
              <option key={row.episodeId} value={row.episodeId}>
                EP {row.number} · {row.title}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Date"
            type="date"
            value={recordedOn}
            max={todayLocal()}
            onChange={(e) => setRecordedOn(e.target.value)}
            error={!recordedOn ? "Choose the date these numbers were read." : sameDay ? "This episode already has a snapshot for that date — edit that one instead." : undefined}
            hint="The day you read these numbers."
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <TextField
            label="Views (total)"
            inputMode="numeric"
            autoComplete="off"
            value={views}
            onChange={(e) => setViews(e.target.value)}
            error={countError(views, v)}
            hint={
              previous
                ? v !== null && v < previous.views
                  ? `Lower than ${formatInt(previous.views)} on ${formatDay(previous.recordedOn, true)} — totals normally only go up.`
                  : `Previous: ${formatInt(previous.views)} on ${formatDay(previous.recordedOn, true)}`
                : undefined
            }
          />
          <TextField label="Likes (total)" inputMode="numeric" autoComplete="off" value={likes} onChange={(e) => setLikes(e.target.value)} error={countError(likes, l)} />
          <TextField label="Comments (total)" inputMode="numeric" autoComplete="off" value={comments} onChange={(e) => setComments(e.target.value)} error={countError(comments, c)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Average view duration (optional)"
            inputMode="text"
            autoComplete="off"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="m:ss"
            error={d === "invalid" ? "Use minutes:seconds, e.g. 2:34." : undefined}
            hint="As shown in YouTube Studio, e.g. 2:34."
          />
          <TextField
            label="Average percentage viewed (optional)"
            inputMode="decimal"
            autoComplete="off"
            value={retention}
            onChange={(e) => setRetention(e.target.value)}
            placeholder="%"
            error={r === "invalid" ? "Enter a percentage, e.g. 48.5." : undefined}
            hint="Retention, as a percentage."
          />
        </div>
        <TextAreaField label="Notes (optional)" rows={2} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Two days after the Short went up." />
      </div>
    </Modal>
  );
}
