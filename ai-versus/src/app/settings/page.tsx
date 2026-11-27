"use client";
import { useEffect, useState } from "react";
import type { Settings } from "@/lib/types";
import { api, ErrorBox, useAction } from "../ui";

type S = Settings & { credentialStatus: Record<string, string> };

export default function SettingsPage() {
  const [s, setS] = useState<S | null>(null);
  const [creds, setCreds] = useState({ anthropicApiKey: "", elevenLabsApiKey: "", falKey: "" });
  const [saved, setSaved] = useState(false);
  const { busy, error, run } = useAction();
  useEffect(() => {
    api<{ settings: S }>("/api/settings").then((r) => setS(r.settings));
  }, []);
  if (!s) return <div className="text-sm text-white/50">Loading…</div>;

  const set = <K extends keyof Settings>(group: K, key: keyof Settings[K], value: unknown) =>
    setS({ ...s, [group]: { ...s[group], [key]: value } });
  const num = (group: "costLimits" | "video", key: string, label: string, step = 1) => (
    <label className="block">
      <span className="label">{label}</span>
      <input className="input" type="number" step={step} value={(s[group] as any)[key]} onChange={(e) => set(group, key as never, parseFloat(e.target.value))} />
    </label>
  );
  const text = (group: "providers" | "language", key: string, label: string) => (
    <label className="block">
      <span className="label">{label}</span>
      <input className="input" value={(s[group] as any)[key]} onChange={(e) => set(group, key as never, e.target.value)} />
    </label>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-black">Settings</h1>
        <p className="text-sm text-white/60">Keys entered here are stored server-side and override environment variables. They are never sent back to the browser.</p>
      </header>
      <ErrorBox error={error} />

      <section className="card space-y-3">
        <div className="font-bold">API credentials</div>
        {(
          [
            ["anthropicApiKey", "Anthropic (Claude scriptwriter)", "anthropic"],
            ["elevenLabsApiKey", "ElevenLabs (voices)", "elevenlabs"],
            ["falKey", "fal.ai (images / video)", "fal"],
          ] as const
        ).map(([k, label, st]) => (
          <label key={k} className="block">
            <span className="label">
              {label} — <span className={s.credentialStatus[st] === "missing" ? "text-rose-300" : "text-emerald-300"}>{s.credentialStatus[st]}</span>{" "}
              {s.credentials[k] && <span className="normal-case text-white/40">({s.credentials[k]})</span>}
            </span>
            <input className="input" type="password" autoComplete="off" placeholder="paste a new key to replace" value={creds[k]} onChange={(e) => setCreds({ ...creds, [k]: e.target.value })} />
          </label>
        ))}
      </section>

      <section className="card grid gap-3 md:grid-cols-2">
        <div className="font-bold md:col-span-2">Providers</div>
        {text("providers", "anthropicModel", "Claude model")}
        {text("providers", "elevenLabsModel", "ElevenLabs model (eleven_v3 supports [tags])")}
        {text("providers", "falImageModel", "fal text-to-image model")}
        {text("providers", "falEditModel", "fal reference/edit model")}
        {text("providers", "falBackgroundRemovalModel", "fal background removal model")}
        {text("providers", "falVideoModel", "fal image-to-video model")}
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" checked={s.providers.useImageToVideoBackground} onChange={(e) => set("providers", "useImageToVideoBackground", e.target.checked)} />
          Animate backgrounds with image-to-video (adds ~${s.costLimits.falVideoUsd} per video)
        </label>
      </section>

      <section className="card grid gap-3 md:grid-cols-3">
        <div className="font-bold md:col-span-3">Cost limits (USD)</div>
        {num("costLimits", "perVideoUsd", "Per video limit", 0.1)}
        {num("costLimits", "monthlyUsd", "Monthly limit", 1)}
        {num("costLimits", "elevenLabsUsdPer1kChars", "ElevenLabs $/1k chars", 0.01)}
        {num("costLimits", "falImageUsd", "fal $/image", 0.01)}
        {num("costLimits", "falVideoUsd", "fal $/video clip", 0.01)}
      </section>

      <section className="card grid gap-3 md:grid-cols-3">
        <div className="font-bold md:col-span-3">Video quality</div>
        <div className="text-xs text-white/50 md:col-span-3">Output is fixed to 1080×1920, 30 FPS, H.264 + AAC.</div>
        {num("video", "crf", "CRF (lower = better, 14–30)")}
        <label className="block">
          <span className="label">x264 preset</span>
          <select className="input" value={s.video.preset} onChange={(e) => set("video", "preset", e.target.value)}>
            {["veryfast", "faster", "fast", "medium", "slow"].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        {num("video", "musicVolumeDb", "Music level (dB)")}
        {num("video", "minDurationSec", "Min duration (s)")}
        {num("video", "maxDurationSec", "Max duration (s)")}
        <div className="flex flex-col gap-2 text-sm">
          {(["music", "sfx", "showDisclaimer"] as const).map((k) => (
            <label key={k} className="flex items-center gap-2">
              <input type="checkbox" checked={s.video[k]} onChange={(e) => set("video", k, e.target.checked)} />
              {k === "showDisclaimer" ? "Show 'fictional parody' label" : k === "sfx" ? "Sound effects" : "Background music"}
            </label>
          ))}
        </div>
      </section>

      <section className="card grid gap-3 md:grid-cols-2">
        <div className="font-bold md:col-span-2">Language</div>
        {text("language", "scriptLanguage", "Script language (e.g. English, Hindi, Spanish)")}
        {text("language", "ttsLanguageCode", "TTS language code (ISO 639-1)")}
      </section>

      <div className="flex items-center gap-3">
        <button
          className="btn-primary"
          disabled={!!busy}
          onClick={() =>
            run("save", async () => {
              const r = await api<{ settings: S }>("/api/settings", {
                method: "PUT",
                body: JSON.stringify({ ...s, credentials: creds }),
              });
              setS(r.settings);
              setCreds({ anthropicApiKey: "", elevenLabsApiKey: "", falKey: "" });
              setSaved(true);
              setTimeout(() => setSaved(false), 2000);
            })
          }
        >
          {busy ? "Saving…" : "Save settings"}
        </button>
        {saved && <span className="text-sm text-emerald-300">Saved</span>}
      </div>
    </div>
  );
}
