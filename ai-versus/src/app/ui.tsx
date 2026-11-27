"use client";
import { useCallback, useEffect, useState } from "react";

export async function api<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body && !(init.body instanceof FormData) ? { "content-type": "application/json", ...(init?.headers ?? {}) } : init?.headers,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || `${res.status} ${res.statusText}`);
  return j as T;
}

/** Poll a JSON endpoint. */
export function usePoll<T>(url: string | null, ms = 3000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!url) return;
    try {
      setData(await api<T>(url));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [url]);
  useEffect(() => {
    load();
    if (!ms) return;
    const t = setInterval(load, ms);
    return () => clearInterval(t);
  }, [load, ms]);
  return { data, error, reload: load };
}

export function fileUrl(key?: string, download?: string) {
  if (!key) return "";
  return `/api/files/${key.split("/").map(encodeURIComponent).join("/")}${download ? `?download=1&name=${encodeURIComponent(download)}` : ""}`;
}

const COLORS: Record<string, string> = {
  done: "bg-emerald-500/20 text-emerald-300",
  running: "bg-amber-500/20 text-amber-300 animate-pulse",
  queued: "bg-sky-500/20 text-sky-300",
  pending: "bg-white/10 text-white/50",
  failed: "bg-rose-500/20 text-rose-300",
  skipped: "bg-white/10 text-white/40",
  proposed: "bg-sky-500/20 text-sky-300",
  approved: "bg-emerald-500/20 text-emerald-300",
  rejected: "bg-white/10 text-white/40",
};
export function Badge({ status }: { status: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${COLORS[status] ?? "bg-white/10"}`}>{status}</span>;
}

export function ErrorBox({ error }: { error: string | null }) {
  if (!error) return null;
  return <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>;
}

/** Run an async action with busy + error state. */
export function useAction() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = async (name: string, fn: () => Promise<void>) => {
    setBusy(name);
    setError(null);
    try {
      await fn();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };
  return { busy, error, run };
}

export function HealthBadge() {
  const { data } = usePoll<any>("/api/health", 10000);
  if (!data) return <div className="text-xs text-white/40">checking services…</div>;
  const row = (name: string, ok: boolean, detail: string) => (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-white/60">{name}</span>
      <span className={ok ? "text-emerald-300" : "text-rose-300"}>{detail}</span>
    </div>
  );
  return (
    <div className="space-y-1.5 rounded-xl border border-white/10 p-3">
      {row("Queue", data.queue.ok && data.queue.workers > 0, data.queue.ok ? `${data.queue.workers} worker(s)` : "redis down")}
      {row("Storage", true, data.storage)}
      {row("FFmpeg", data.ffmpeg !== "missing", data.ffmpeg === "missing" ? "missing" : "ok")}
      {Object.entries(data.credentials as Record<string, string>).map(([k, v]) => row(k, v !== "missing", v))}
    </div>
  );
}

export function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-14 text-white/50">{label}</span>
      <div className="h-1.5 flex-1 rounded-full bg-white/10">
        <div className="h-1.5 rounded-full bg-indigo-400" style={{ width: `${value * 10}%` }} />
      </div>
      <span className="w-6 text-right tabular-nums">{value}</span>
    </div>
  );
}
