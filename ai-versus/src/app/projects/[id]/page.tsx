"use client";
import { use, useState } from "react";
import { CHARACTER_SEEDS } from "@/lib/characters";
import type { AudioRole, CharacterId, Project, StageName } from "@/lib/types";
import { STAGES } from "@/lib/types";
import { api, Badge, ErrorBox, fileUrl, useAction, usePoll } from "../../ui";

type P = Omit<Project, "audio"> & { audio: Record<string, (Project["audio"][AudioRole] & { envelopeFrames: number }) | undefined> };

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error, reload } = usePoll<{ project: P }>(`/api/projects/${id}`, 3000);
  const { busy, error: actionError, run } = useAction();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [openLog, setOpenLog] = useState<StageName | null>(null);
  const p = data?.project;
  if (!p) return <div className="text-sm text-white/50">{error ?? "Loading…"}</div>;
  const working = p.status === "running" || p.status === "queued";
  const trigger = (name: string, body: object) =>
    run(name, async () => {
      await api(`/api/projects/${id}/run`, { method: "POST", body: JSON.stringify(body) });
      await reload();
    });
  const spend = p.costs.reduce((a, c) => a + c.usd, 0);
  const version = p.updatedAt;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">{p.script?.title ?? p.topic}</h1>
          <div className="text-sm text-white/60">{p.topic}</div>
        </div>
        <div className="flex items-center gap-2">
          <Badge status={p.status} />
          <span className="text-xs text-white/50">spend ${spend.toFixed(3)}</span>
        </div>
      </header>
      <ErrorBox error={actionError || error} />

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="card p-3">
            {p.outputKey && p.stages.render.status === "done" ? (
              <video key={version} controls playsInline className="aspect-[9/16] w-full rounded-xl bg-black" src={`${fileUrl(p.outputKey)}?v=${encodeURIComponent(version)}`} />
            ) : (
              <div className="flex aspect-[9/16] w-full items-center justify-center rounded-xl bg-black/50 text-sm text-white/50">
                {working ? "Producing…" : "No render yet"}
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <a className={`btn-primary ${!p.outputKey ? "pointer-events-none opacity-40" : ""}`} href={fileUrl(p.outputKey, `${p.slug}.mp4`)}>
                Export MP4
              </a>
              <button className="btn-ghost" disabled={working || !!busy} onClick={() => trigger("render", { from: "render" })}>
                Re-render
              </button>
              <button className="btn-ghost" disabled={working || !!busy} onClick={() => trigger("bg", { newBackground: true, from: "background" })}>
                New background
              </button>
            </div>
          </div>

          <div className="card space-y-2">
            <div className="font-bold">Production stages</div>
            {STAGES.map((s) => (
              <div key={s}>
                <button className="flex w-full items-center justify-between text-sm" onClick={() => setOpenLog(openLog === s ? null : s)}>
                  <span className="capitalize">{s}</span>
                  <Badge status={p.stages[s].status} />
                </button>
                {p.stages[s].error && <div className="mt-1 text-xs text-rose-300">{p.stages[s].error}</div>}
                {openLog === s && (
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-black/40 p-2 text-[11px] text-white/70">
                    {p.stages[s].log.join("\n") || "no log"}
                  </pre>
                )}
              </div>
            ))}
            <div className="flex flex-wrap gap-2 pt-2">
              <button className="btn-ghost" disabled={working || !!busy} onClick={() => trigger("resume", {})}>
                Resume / retry
              </button>
              <button className="btn-ghost" disabled={working || !!busy} onClick={() => trigger("script", { from: "script" })}>
                Rewrite whole script
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {p.script && (
            <div className="card space-y-3">
              <div className="font-bold">Narrator</div>
              <Row role="narrator_intro" label="Intro" text={p.script.narratorIntro} p={p} />
              <Row role="narrator_outro" label="Outro" text={p.script.narratorOutro} p={p} />
              <div className="flex gap-2">
                <button className="btn-ghost" disabled={working || !!busy} onClick={() => trigger("nv", { revoice: ["narrator_intro", "narrator_outro"] })}>
                  Re-voice narrator
                </button>
              </div>
            </div>
          )}
          {p.script?.lines.map((l) => {
            const c = CHARACTER_SEEDS[l.characterId as CharacterId];
            return (
              <div key={l.characterId} className="card space-y-3" style={{ borderColor: `${c.color}55` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold">
                    <span className="h-3 w-3 rounded-full" style={{ background: c.color }} />
                    {c.displayName}
                    <span className="text-xs font-normal text-white/50">
                      {l.mood} · listeners: {l.listenerReaction}
                    </span>
                  </div>
                </div>
                <Row role={l.characterId} label="" text={l.text} p={p} />
                <div className="text-xs text-white/50">Highlighted: {l.emphasis.join(", ")}</div>
                <div className="flex flex-wrap gap-2">
                  <input
                    className="input max-w-sm"
                    placeholder="Optional note for Claude (e.g. 'funnier', 'shorter')"
                    value={notes[l.characterId] ?? ""}
                    onChange={(e) => setNotes({ ...notes, [l.characterId]: e.target.value })}
                  />
                  <button className="btn-ghost" disabled={working || !!busy} onClick={() => trigger(`rw-${l.characterId}`, { rewriteLine: { characterId: l.characterId, note: notes[l.characterId] } })}>
                    Rewrite answer
                  </button>
                  <button className="btn-ghost" disabled={working || !!busy} onClick={() => trigger(`rv-${l.characterId}`, { revoice: [l.characterId] })}>
                    Re-voice
                  </button>
                </div>
              </div>
            );
          })}

          {p.qc && (
            <div className="card space-y-2">
              <div className="flex items-center justify-between font-bold">
                Quality control <span className={p.qc.ok ? "text-emerald-300" : "text-rose-300"}>{p.qc.checks.filter((c) => c.ok).length}/{p.qc.checks.length} passed</span>
              </div>
              <div className="grid gap-1">
                {p.qc.checks.map((c, i) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className={c.ok ? "text-emerald-300" : "text-rose-300"}>{c.ok ? "✓" : "✗"}</span>
                    <span className="text-white/80">{c.name}</span>
                    <span className="truncate text-white/40">{c.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {p.costs.length > 0 && (
            <div className="card text-xs">
              <div className="mb-2 font-bold">Costs</div>
              {p.costs.map((c, i) => (
                <div key={i} className="flex justify-between text-white/60">
                  <span>
                    {c.provider} · {c.what}
                  </span>
                  <span>${c.usd.toFixed(4)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ role, label, text, p }: { role: string; label: string; text: string; p: P }) {
  const clip = p.audio[role];
  return (
    <div className="space-y-1">
      <div className="text-sm">
        {label && <b className="mr-2 text-white/60">{label}:</b>}
        {text}
      </div>
      {clip?.key ? (
        <div className="flex items-center gap-3">
          <audio controls className="h-8 flex-1" src={`${fileUrl(clip.key)}?v=${encodeURIComponent(p.updatedAt)}`} />
          <span className="text-xs text-white/40">
            {clip.duration.toFixed(1)}s · {clip.alignment} timing · ×{clip.tempo.toFixed(2)}
          </span>
        </div>
      ) : (
        <div className="text-xs text-white/40">no audio yet</div>
      )}
    </div>
  );
}
