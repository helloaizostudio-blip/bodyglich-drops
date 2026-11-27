"use client";
import { useEffect, useState } from "react";
import type { CharacterId, CharacterProfile } from "@/lib/types";
import { CHARACTER_ORDER } from "@/lib/types";
import { api, ErrorBox, fileUrl, useAction, usePoll } from "../ui";

interface Voice {
  voiceId: string;
  name: string;
  category: string;
  previewUrl: string | null;
}

export default function CharactersPage() {
  const { data, reload, error: loadError } = usePoll<{ characters: Record<CharacterId, CharacterProfile> }>("/api/characters", 0);
  const [voices, setVoices] = useState<Voice[] | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  useEffect(() => {
    api<{ voices: Voice[] }>("/api/voices")
      .then((r) => setVoices(r.voices))
      .catch((e) => setVoiceError(e.message));
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-black">Character Library</h1>
        <p className="text-sm text-white/60">
          Five permanent chibi mascots, reused for every video. Each has aligned expression sprites (used for lip-sync and reactions), optional extended
          expression and turnaround sheets, and a persistent ElevenLabs voice.
        </p>
      </header>
      <ErrorBox error={loadError} />
      {voiceError && <div className="text-xs text-amber-300">Voice list unavailable ({voiceError}). You can still paste a voice ID.</div>}
      {data &&
        CHARACTER_ORDER.map((id) => <CharacterCard key={id} c={data.characters[id]} voices={voices} onChange={reload} />)}
      {!data && <div className="text-sm text-white/50">Loading library (first load imports the bundled reference sheets)…</div>}
    </div>
  );
}

function CharacterCard({ c, voices, onChange }: { c: CharacterProfile; voices: Voice[] | null; onChange: () => void }) {
  const { busy, error, run } = useAction();
  const [voice, setVoice] = useState(c.voice);
  const [kind, setKind] = useState("core");
  const [file, setFile] = useState<File | null>(null);
  const sprites = Object.entries(c.sprites).filter(([, v]) => v);
  const views = Object.entries(c.views).filter(([, v]) => v);

  return (
    <div className="card space-y-4" style={{ borderColor: `${c.color}66` }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="h-4 w-4 rounded-full" style={{ background: c.color }} />
          <div>
            <div className="text-xl font-black">{c.displayName}</div>
            <div className="text-xs text-white/60">{c.personality}</div>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={c.locked}
            onChange={(e) =>
              run("lock", async () => {
                await api(`/api/characters/${c.id}`, { method: "PATCH", body: JSON.stringify({ locked: e.target.checked }) });
                onChange();
              })
            }
          />
          Lock design
        </label>
      </div>
      <ErrorBox error={error} />

      <div>
        <div className="label">Expressions ({sprites.length})</div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {sprites.map(([name, ref]) => (
            <figure key={name} className="shrink-0 rounded-xl bg-white/5 p-2 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fileUrl(ref!.key)} alt={`${c.displayName} ${name}`} className="h-40 w-auto" />
              <figcaption className="mt-1 text-xs text-white/60">{name}</figcaption>
            </figure>
          ))}
          {views.map(([name, ref]) => (
            <figure key={name} className="shrink-0 rounded-xl bg-indigo-500/10 p-2 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fileUrl(ref!.key)} alt={`${c.displayName} ${name} view`} className="h-40 w-auto" />
              <figcaption className="mt-1 text-xs text-white/60">{name.replace("_", "-")} view</figcaption>
            </figure>
          ))}
        </div>
        <div className="text-xs text-white/40">
          Sprite alignment: {c.alignmentScore ? `${(c.alignmentScore * 100).toFixed(1)}% body overlap` : "n/a"} · design: {c.designPrompt.slice(0, 140)}…
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <div className="label">Reference sheets</div>
          <div className="flex flex-wrap gap-2">
            {(["expressions", "views", "core"] as const).map((k) => (
              <button
                key={k}
                className="btn-ghost"
                disabled={!!busy || (k === "core" && c.locked)}
                onClick={() =>
                  run(`gen-${k}`, async () => {
                    await api(`/api/characters/${c.id}/generate`, { method: "POST", body: JSON.stringify({ kind: k }) });
                    onChange();
                  })
                }
              >
                {busy === `gen-${k}` ? "Generating…" : `Generate ${k === "core" ? "core 2×2" : k === "expressions" ? "9 expressions" : "front/side/¾ views"}`}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select className="input w-auto" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="core">Core 2×2 (neutral, talking, blink, surprised)</option>
              <option value="expressions">Expressions 3×3</option>
              <option value="views">Views 1×3 (front, ¾, side)</option>
              <option value="reference">Identity reference image</option>
            </select>
            <input type="file" accept="image/png,image/jpeg,image/webp" className="text-xs" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <button
              className="btn-primary"
              disabled={!file || !!busy}
              onClick={() =>
                run("upload", async () => {
                  const fd = new FormData();
                  fd.append("file", file!);
                  fd.append("kind", kind);
                  await api(`/api/characters/${c.id}/sheet`, { method: "POST", body: fd });
                  onChange();
                })
              }
            >
              {busy === "upload" ? "Uploading…" : "Upload"}
            </button>
          </div>
          <div className="text-xs text-white/40">{c.sheets.uploads.length} identity reference(s) stored · used as references for future generations.</div>
        </div>

        <div className="space-y-2">
          <div className="label">Voice (ElevenLabs)</div>
          {voices ? (
            <select
              className="input"
              value={voice.voiceId}
              onChange={(e) => {
                const v = voices.find((x) => x.voiceId === e.target.value);
                setVoice({ ...voice, voiceId: e.target.value, voiceName: v?.name ?? e.target.value });
              }}
            >
              {!voices.some((v) => v.voiceId === voice.voiceId) && <option value={voice.voiceId}>{voice.voiceName}</option>}
              {voices.map((v) => (
                <option key={v.voiceId} value={v.voiceId}>
                  {v.name} ({v.category})
                </option>
              ))}
            </select>
          ) : (
            <>
              <input className="input" value={voice.voiceId} onChange={(e) => setVoice({ ...voice, voiceId: e.target.value })} />
              <div className="text-xs text-white/50">Current: {c.voice.voiceName}</div>
            </>
          )}
          {voices?.find((v) => v.voiceId === voice.voiceId)?.previewUrl && (
            <audio controls className="h-8 w-full" src={voices.find((v) => v.voiceId === voice.voiceId)!.previewUrl!} />
          )}
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["stability", 0, 1, 0.05],
                ["similarityBoost", 0, 1, 0.05],
                ["style", 0, 1, 0.05],
                ["speed", 0.7, 1.2, 0.01],
              ] as const
            ).map(([k, min, max, step]) => (
              <label key={k} className="text-xs text-white/60">
                {k} {voice[k].toFixed(2)}
                <input type="range" min={min} max={max} step={step} value={voice[k]} className="w-full" onChange={(e) => setVoice({ ...voice, [k]: parseFloat(e.target.value) })} />
              </label>
            ))}
          </div>
          <button
            className="btn-ghost"
            disabled={!!busy}
            onClick={() =>
              run("voice", async () => {
                await api(`/api/characters/${c.id}`, { method: "PATCH", body: JSON.stringify({ voice }) });
                onChange();
              })
            }
          >
            {busy === "voice" ? "Saving…" : "Save voice"}
          </button>
        </div>
      </div>
    </div>
  );
}
