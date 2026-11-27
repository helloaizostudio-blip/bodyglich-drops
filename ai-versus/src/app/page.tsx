"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Idea } from "@/lib/types";
import { api, Badge, ErrorBox, ScoreBar, useAction, usePoll } from "./ui";

export default function IdeasPage() {
  const router = useRouter();
  const { data, reload } = usePoll<{ ideas: Idea[] }>("/api/ideas", 0);
  const { busy, error, run } = useAction();
  const [theme, setTheme] = useState("");
  const [manual, setManual] = useState({ question: "", setting: "" });
  const [filter, setFilter] = useState<"proposed" | "all">("proposed");

  const ideas = (data?.ideas ?? [])
    .filter((i) => filter === "all" || i.status === "proposed")
    .sort((a, b) => b.scores.overall - a.scores.overall);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-black">Idea Generator</h1>
        <p className="text-sm text-white/60">
          Claude proposes situations and scores them. Approving a topic is the only manual step: script, voices, animation, edit, QC and export then run automatically.
        </p>
      </header>

      <ErrorBox error={error} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card space-y-3">
          <div className="font-bold">Propose 10 situations</div>
          <input className="input" placeholder="Optional theme (e.g. 'space disasters', 'school chaos')" value={theme} onChange={(e) => setTheme(e.target.value)} />
          <button
            className="btn-primary"
            disabled={!!busy}
            onClick={() =>
              run("gen", async () => {
                await api("/api/ideas", { method: "POST", body: JSON.stringify({ theme: theme || undefined }) });
                await reload();
              })
            }
          >
            {busy === "gen" ? "Claude is brainstorming…" : "Generate ideas"}
          </button>
        </div>
        <div className="card space-y-3">
          <div className="font-bold">Add a manual topic</div>
          <input className="input" placeholder="What would five AIs do if…" value={manual.question} onChange={(e) => setManual({ ...manual, question: e.target.value })} />
          <input className="input" placeholder="Setting (optional, e.g. 'a sinking cruise ship deck')" value={manual.setting} onChange={(e) => setManual({ ...manual, setting: e.target.value })} />
          <button
            className="btn-ghost"
            disabled={!!busy || manual.question.length < 8}
            onClick={() =>
              run("manual", async () => {
                await api("/api/ideas", { method: "POST", body: JSON.stringify({ manual }) });
                setManual({ question: "", setting: "" });
                await reload();
              })
            }
          >
            {busy === "manual" ? "Scoring…" : "Score & add"}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-white/50">Show:</span>
        {(["proposed", "all"] as const).map((f) => (
          <button key={f} className={`rounded-lg px-3 py-1 ${filter === f ? "bg-white/15" : "text-white/60"}`} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {ideas.map((i) => (
          <div key={i.id} className="card flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-bold">{i.title}</div>
                <div className="text-sm text-white/80">{i.question}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-indigo-300">{i.scores.overall.toFixed(1)}</div>
                <Badge status={i.status} />
              </div>
            </div>
            <div className="text-xs text-white/60">
              <b>Setting:</b> {i.setting}
              <br />
              <b>Visual hook:</b> {i.visualHook}
            </div>
            <div className="space-y-1">
              <ScoreBar label="Visual" value={i.scores.visual} />
              <ScoreBar label="Story" value={i.scores.story} />
              <ScoreBar label="Humor" value={i.scores.humor} />
              <ScoreBar label="Clarity" value={i.scores.clarity} />
            </div>
            <div className="text-xs italic text-white/50">{i.rationale}</div>
            <div className="mt-auto flex gap-2">
              {i.projectId ? (
                <button className="btn-ghost" onClick={() => router.push(`/projects/${i.projectId}`)}>
                  Open project
                </button>
              ) : (
                <>
                  <button
                    className="btn-primary"
                    disabled={!!busy}
                    onClick={() =>
                      run(`a-${i.id}`, async () => {
                        const r = await api<{ projectId: string }>(`/api/ideas/${i.id}/approve`, { method: "POST" });
                        router.push(`/projects/${r.projectId}`);
                      })
                    }
                  >
                    {busy === `a-${i.id}` ? "Queuing…" : "Approve & produce"}
                  </button>
                  {i.status !== "rejected" && (
                    <button
                      className="btn-ghost"
                      disabled={!!busy}
                      onClick={() =>
                        run(`r-${i.id}`, async () => {
                          await api(`/api/ideas/${i.id}/reject`, { method: "POST" });
                          await reload();
                        })
                      }
                    >
                      Reject
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
        {!ideas.length && <div className="text-sm text-white/50">No ideas yet — generate some or add a manual topic.</div>}
      </div>
    </div>
  );
}
