"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUp, Loader2, RotateCcw, Sparkles, Wrench, X } from "lucide-react";
import type { AssistantDisplayMessage } from "@/server/services/assistant";
import { askAssistant, openAssistant, resetAssistant } from "@/server/actions/assistant";
import { cn } from "@/lib/utils";

const TOOL_LABELS: Record<string, string> = {
  get_current_episode: "Checked the episode",
  list_episodes: "Looked at your episodes",
  list_characters: "Read the cast profiles",
  get_script: "Read the script",
  save_script_sections: "Wrote to the script",
  list_scenes: "Read the storyboard",
  find_scenes_missing: "Checked for gaps",
  replace_storyboard_scenes: "Updated the storyboard",
  build_scene_prompt: "Built a scene prompt",
  set_episode_stage: "Moved the episode",
  create_episode: "Created an episode",
};

const SUGGESTIONS_EPISODE = ["Show unfinished production tasks", "Find scenes without backgrounds", "Break this script into 12 scenes", "Create a visual prompt for scene 1", "Show all characters used in this episode"];
const SUGGESTIONS_GENERAL = ["Create a funny Blockheads episode", "Which episodes are closest to done?", "Who is in my cast?"];

function currentEpisodeId(param: string | null): string | null {
  if (param) return param;
  const m = /(?:^|;\s*)ff_episode=([^;]+)/.exec(document.cookie);
  return m ? decodeURIComponent(m[1]) : null;
}

type PanelState = { ready: boolean; providerName: string | null; model: string | null; episode: { id: string; number: number; title: string } | null };

/** The FRAMEFORGE assistant: a context-aware chat that reads and updates the open episode through studio tools. */
export function AssistantLauncher() {
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<PanelState | null>(null);
  const [messages, setMessages] = useState<AssistantDisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const episodeParam = params.get("episode");

  const load = useCallback(async () => {
    setError("");
    const res = await openAssistant({ episodeId: currentEpisodeId(episodeParam) }).catch(() => null);
    if (!res?.ok) {
      setError(res?.error ?? "Could not load the assistant.");
      return;
    }
    setState({ ready: res.data.ready.ready, providerName: res.data.ready.providerName, model: res.data.ready.model, episode: res.data.episode });
    setMessages(res.data.messages);
  }, [episodeParam]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || busy || !state?.ready) return;
    setInput("");
    setError("");
    setBusy(true);
    setMessages((m) => [...m, { role: "user", text: message, tools: [] }]);
    const res = await askAssistant({ episodeId: state.episode?.id ?? null, message }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      setError(res?.error ?? "Could not reach the server. Your message was not answered.");
      return;
    }
    setMessages((m) => [...m, { role: "assistant", text: res.data.text, tools: res.data.tools }]);
  };

  const reset = async () => {
    if (busy || !state) return;
    await resetAssistant({ episodeId: state.episode?.id ?? null });
    setMessages([]);
    setError("");
  };

  const suggestions = state?.episode ? SUGGESTIONS_EPISODE : SUGGESTIONS_GENERAL;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-3.5 text-[13px] font-semibold text-navy-900 shadow-card ring-1 ring-line/70 transition hover:bg-brand-100"
      >
        <Sparkles className="size-4 text-brand-600" aria-hidden /> Assistant
      </button>

      {open ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="FRAMEFORGE assistant">
          <button type="button" aria-label="Close assistant" className="absolute inset-0 animate-fade bg-navy-950/45" onClick={() => setOpen(false)} />
          <div className="absolute inset-0 flex animate-sheet flex-col bg-brand-50 sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[440px] sm:shadow-pop">
            <header className="flex items-center gap-3 bg-navy-900 px-4 py-3 text-white">
              <span className="grid size-9 place-items-center rounded-xl bg-brand-500/25">
                <Sparkles className="size-5 text-brand-300" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-base font-bold leading-tight">FRAMEFORGE Assistant</p>
                <p className="truncate text-xs text-brand-200/80">
                  {state ? (state.episode ? `Working on EP ${state.episode.number} · ${state.episode.title}` : "No episode open — studio-wide questions") : "Loading…"}
                </p>
              </div>
              {messages.length ? (
                <button type="button" onClick={reset} disabled={busy} aria-label="Start a new conversation" title="New conversation" className="grid size-10 place-items-center rounded-xl text-white/80 hover:bg-white/10 disabled:opacity-40">
                  <RotateCcw className="size-[18px]" />
                </button>
              ) : null}
              <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant" className="grid size-10 place-items-center rounded-xl text-white/80 hover:bg-white/10">
                <X className="size-5" />
              </button>
            </header>

            <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              {!state && !error ? (
                <div className="grid h-full place-items-center">
                  <Loader2 className="size-6 animate-spin text-brand-600" aria-label="Loading" />
                </div>
              ) : state && !state.ready ? (
                <div className="rounded-3xl bg-white p-5 text-center shadow-card ring-1 ring-line/70">
                  <Sparkles className="mx-auto size-8 text-brand-500" />
                  <p className="mt-2 text-base font-bold text-navy-900">The assistant is not connected</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">It runs on a text generation provider. Add and verify a key in Settings, then come back — your episode context will be ready.</p>
                  <Link href="/settings" onClick={() => setOpen(false)} className="mt-4 inline-flex h-11 items-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700">
                    Open Settings
                  </Link>
                </div>
              ) : state ? (
                <div className="flex flex-col gap-3">
                  {messages.length === 0 ? (
                    <div className="rounded-3xl bg-white p-4 shadow-card ring-1 ring-line/70">
                      <p className="text-sm font-bold text-navy-900">Ask me about your production</p>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-muted">I can read and update {state.episode ? "this episode's" : "your"} script, storyboard and tasks. I remember this conversation per episode.</p>
                      <div className="mt-3 flex flex-col gap-1.5">
                        {suggestions.map((s) => (
                          <button key={s} type="button" onClick={() => void send(s)} className="rounded-xl bg-brand-50 px-3 py-2.5 text-left text-[13px] font-semibold text-navy-800 ring-1 ring-line/70 hover:bg-brand-100">
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {messages.map((m, i) => (
                    <div key={i} className={cn("flex flex-col gap-1", m.role === "user" ? "items-end" : "items-start")}>
                      {m.tools.length ? (
                        <div className="flex flex-wrap gap-1">
                          {[...new Set(m.tools)].map((t) => (
                            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-lav-100 px-2 py-0.5 text-[11px] font-semibold text-lav-600">
                              <Wrench className="size-3" /> {TOOL_LABELS[t] ?? t}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {m.text ? (
                        <div
                          className={cn(
                            "max-w-[88%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                            m.role === "user" ? "rounded-br-md bg-brand-600 text-white" : "rounded-bl-md bg-white text-navy-900 shadow-card ring-1 ring-line/70",
                          )}
                        >
                          {m.text}
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {busy ? (
                    <div className="flex items-center gap-2 self-start rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-sm text-muted shadow-card ring-1 ring-line/70" role="status">
                      <Loader2 className="size-4 animate-spin text-brand-600" /> Working on it…
                    </div>
                  ) : null}
                </div>
              ) : null}
              {error ? (
                <p role="alert" className="mt-3 rounded-2xl bg-bad-100 px-3.5 py-2.5 text-[13px] font-medium text-bad-700">
                  {error}
                </p>
              ) : null}
            </div>

            <form
              className="flex items-end gap-2 border-t border-line bg-white px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3"
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                rows={1}
                maxLength={8000}
                disabled={!state?.ready || busy}
                placeholder={state?.ready ? "Ask or tell the assistant…" : "Connect a text provider to chat"}
                aria-label="Message the assistant"
                className="max-h-36 min-h-11 flex-1 resize-none rounded-2xl bg-brand-50 px-3.5 py-2.5 leading-snug text-ink ring-1 ring-inset ring-line placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60"
                style={{ fieldSizing: "content" } as React.CSSProperties}
              />
              <button type="submit" disabled={!state?.ready || busy || !input.trim()} aria-label="Send" className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-40">
                <ArrowUp className="size-5" />
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
