"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ClipboardCheck, Lightbulb, Loader2, PenLine, RefreshCw, Sparkles, Wand2 } from "lucide-react";
import type { ScriptReview, ScriptSectionKey, ScriptSections, StoryInputs } from "@/db/schema";
import { SCRIPT_SECTIONS } from "@/db/schema";
import type { StoryIdea } from "@/server/services/story";
import { rewriteSection, runScriptReview, saveScriptSections, suggestIdeas, writeStoryOutline, writeStoryScriptPart } from "@/server/actions/story";
import { SCRIPT_SECTION_LABELS } from "@/lib/constants";
import { cn, formatDuration } from "@/lib/utils";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, Notice, SectionTitle } from "@/components/ui/misc";
import { SelectField, TextAreaField, TextField, Textarea } from "@/components/ui/field";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { useRun } from "@/components/ui/use-run";
import { useToast } from "@/components/ui/toast";
import { CastPicker, DURATION_OPTIONS, type CastOption } from "@/components/episodes/episode-form";

const STORY_TYPES = ["Episode idea", "Funny situation", "Comedy story", "Adventure story", "Mystery story", "Emotional story", "Unexpected plot twist", "Recurring storyline"];
const GENRES = ["Comedy", "Adventure", "Mystery", "Slice of life", "Emotional / heartfelt", "Parody", "Horror-comedy", "Sci-fi"];
const TONES = ["Funny and chaotic", "Light and wholesome", "Sarcastic", "Dramatic", "Suspenseful", "Heartwarming"];
const AUDIENCES = ["Kids 6–10", "Tweens and teens 10–16", "General audience", "Young adults"];
const COMPLEXITIES = ["Simple — one clear gag or problem", "Medium — setup, escalation, twist", "Layered — A-plot and B-plot"];

const SECTION_ROWS: Record<ScriptSectionKey, number> = { title: 1, hook: 3, concept: 4, characterRoles: 4, script: 18, dialogue: 10, sceneBreakdown: 10, ending: 4, thumbnailConcept: 3 };
const SECTION_HELP: Partial<Record<ScriptSectionKey, string>> = {
  hook: "What viewers see and hear in the first 5–10 seconds.",
  script: "The complete episode. NAME: for dialogue, [brackets] for action.",
  dialogue: "Spoken lines only — this is what Audio Studio and voice actors work from.",
  sceneBreakdown: "Storyboard Studio can turn this into scene cards.",
};

type SaveState = "saved" | "dirty" | "saving" | "error";

export function StoryWorkspace({
  episode,
  script,
  cast,
  episodeCastIds,
  ai,
}: {
  episode: { id: string; title: string; logline: string; targetDurationSec: number };
  script: { sections: ScriptSections; inputs: StoryInputs | null; review: ScriptReview | null } | null;
  cast: CastOption[];
  episodeCastIds: string[];
  ai: { ready: boolean; providerName: string | null; model: string | null };
}) {
  const toast = useToast();
  const { run } = useRun();
  const [sections, setSections] = useState<ScriptSections>(script?.sections ?? { title: episode.title });
  const [review, setReview] = useState<ScriptReview | null>(script?.review ?? null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [busy, setBusy] = useState<null | "ideas" | "story" | "review" | ScriptSectionKey>(null);
  const [ideas, setIdeas] = useState<StoryIdea[] | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [rewrite, setRewrite] = useState<ScriptSectionKey | null>(null);
  const [instruction, setInstruction] = useState("");
  const [progress, setProgress] = useState("");

  const prev = script?.inputs;
  const [inputs, setInputs] = useState<StoryInputs>({
    storyType: prev?.storyType ?? STORY_TYPES[0],
    genre: prev?.genre ?? GENRES[0],
    targetDurationSec: prev?.targetDurationSec ?? episode.targetDurationSec,
    characterIds: (prev?.characterIds ?? episodeCastIds).filter((id) => cast.some((c) => c.id === id)),
    tone: prev?.tone ?? TONES[0],
    audience: prev?.audience ?? AUDIENCES[1],
    setting: prev?.setting ?? "",
    complexity: prev?.complexity ?? COMPLEXITIES[1],
    idea: prev?.idea ?? episode.logline,
  });
  const setInput = <K extends keyof StoryInputs>(k: K, v: StoryInputs[K]) => setInputs((s) => ({ ...s, [k]: v }));

  /* ---------- autosave: debounce edits, flush on blur / tab hide ---------- */
  const pending = useRef<ScriptSections>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const batch = pending.current;
    if (!Object.keys(batch).length) return;
    pending.current = {};
    setSaveState("saving");
    const res = await saveScriptSections({ episodeId: episode.id, sections: batch }).catch(() => null);
    if (res?.ok) {
      setSaveState(Object.keys(pending.current).length ? "dirty" : "saved");
    } else {
      pending.current = { ...batch, ...pending.current };
      setSaveState("error");
    }
  }, [episode.id]);

  const edit = (key: ScriptSectionKey, value: string) => {
    setSections((s) => ({ ...s, [key]: value }));
    pending.current[key] = value;
    setSaveState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 900);
  };

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      void flush();
    };
  }, [flush]);

  /* ---------- AI actions ---------- */
  const hasScript = SCRIPT_SECTIONS.some((k) => k !== "title" && (sections[k] ?? "").trim());

  const doIdeas = async () => {
    setBusy("ideas");
    const res = await run(suggestIdeas({ episodeId: episode.id, inputs }));
    setBusy(null);
    if (res) setIdeas(res);
  };

  const doStory = async () => {
    setConfirmOverwrite(false);
    await flush();
    setBusy("story");
    setProgress("Planning the story…");
    // Written in stages (outline, then the script in parts) so every request is short.
    const outline = await run(writeStoryOutline({ episodeId: episode.id, inputs }));
    if (!outline) {
      setBusy(null);
      setProgress("");
      return;
    }
    setSections(outline.sections);
    setReview(null);
    document.getElementById("script-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
    for (let part = 1; part <= outline.parts; part++) {
      setProgress(outline.parts > 1 ? `Writing the script — part ${part} of ${outline.parts}…` : "Writing the script…");
      const res = await run(writeStoryScriptPart({ episodeId: episode.id, part, parts: outline.parts }));
      if (!res) {
        toast.info(part > 1 ? `The script stopped after part ${part - 1} of ${outline.parts}. What was written is saved — use Regenerate on “Full script” to finish it.` : "The outline is saved. Use Regenerate on “Full script” to write the script.");
        setBusy(null);
        setProgress("");
        return;
      }
      setSections(res.sections);
    }
    setBusy(null);
    setProgress("");
    toast.success("Story written");
  };

  const doRewrite = async () => {
    const key = rewrite;
    if (!key) return;
    setRewrite(null);
    await flush();
    setBusy(key);
    const res = await run(rewriteSection({ episodeId: episode.id, section: key, instruction }), `${SCRIPT_SECTION_LABELS[key]} rewritten`);
    setBusy(null);
    setInstruction("");
    if (res) setSections((s) => ({ ...s, [key]: res.text }));
  };

  const doReview = async () => {
    await flush();
    setBusy("review");
    const res = await run(runScriptReview({ episodeId: episode.id }));
    setBusy(null);
    if (res) setReview(res);
  };

  const scriptWords = (sections.script ?? "").trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="flex flex-col gap-5">
      {!ai.ready ? (
        <Notice
          tone="lav"
          icon={<Sparkles />}
          title="AI writing is not connected yet"
          action={
            <LinkButton href="/settings" size="sm" variant="navy">
              Connect in Settings
            </LinkButton>
          }
        >
          You can write and autosave the script by hand right now. To generate ideas, full stories and reviews, add and verify a text provider key in Settings.
        </Notice>
      ) : null}

      {/* Generator */}
      <Card className="p-4 sm:p-5">
        <SectionTitle>
          <span className="flex items-center gap-2">
            <Wand2 className="size-[18px] text-brand-600" /> Story generator
          </span>
        </SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SelectField label="What to create" value={inputs.storyType} onChange={(e) => setInput("storyType", e.target.value)}>
            {STORY_TYPES.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </SelectField>
          <SelectField label="Genre" value={inputs.genre} onChange={(e) => setInput("genre", e.target.value)}>
            {GENRES.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </SelectField>
          <SelectField label="Target video duration" value={inputs.targetDurationSec} onChange={(e) => setInput("targetDurationSec", Number(e.target.value))}>
            {(DURATION_OPTIONS.some((d) => d.value === inputs.targetDurationSec) ? DURATION_OPTIONS : [...DURATION_OPTIONS, { label: formatDuration(inputs.targetDurationSec), value: inputs.targetDurationSec }]).map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </SelectField>
          <SelectField label="Story tone" value={inputs.tone} onChange={(e) => setInput("tone", e.target.value)}>
            {TONES.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </SelectField>
          <SelectField label="Audience" value={inputs.audience} onChange={(e) => setInput("audience", e.target.value)}>
            {AUDIENCES.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </SelectField>
          <SelectField label="Story complexity" value={inputs.complexity} onChange={(e) => setInput("complexity", e.target.value)}>
            {COMPLEXITIES.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </SelectField>
          <TextField label="Setting" value={inputs.setting} onChange={(e) => setInput("setting", e.target.value)} placeholder="e.g. School cafeteria, Zash's backyard" maxLength={300} className="sm:col-span-2 lg:col-span-3" />
          <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-3">
            <span className="text-[13px] font-semibold text-navy-800">
              Characters <span className="font-medium text-muted">({inputs.characterIds.length} selected)</span>
            </span>
            <CastPicker options={cast} value={inputs.characterIds} onChange={(ids) => setInput("characterIds", ids)} />
          </div>
          <TextAreaField
            label="Your idea"
            value={inputs.idea}
            onChange={(e) => setInput("idea", e.target.value)}
            placeholder="Anything from one line to a rough outline. Leave empty to get pitches."
            className="sm:col-span-2 lg:col-span-3"
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button icon={<Sparkles className="size-4" />} loading={busy === "story"} disabled={!ai.ready || (busy !== null && busy !== "story")} onClick={() => (hasScript ? setConfirmOverwrite(true) : doStory())}>
            {busy === "story" ? "Writing…" : "Generate full story"}
          </Button>
          <Button variant="secondary" icon={<Lightbulb className="size-4" />} loading={busy === "ideas"} disabled={!ai.ready || (busy !== null && busy !== "ideas")} onClick={doIdeas}>
            Suggest 5 ideas
          </Button>
          {ai.ready ? <span className="text-xs text-muted">Uses {ai.providerName} · {ai.model}. Each generation is billed to your provider account.</span> : null}
        </div>
        {busy === "story" ? (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-brand-100 px-3 py-2.5 text-[13px] font-medium text-navy-800" role="status">
            <Loader2 className="size-4 animate-spin text-brand-600" /> {progress || "Writing…"} Keep this page open — the story appears below as each stage finishes.
          </p>
        ) : null}

        {ideas ? (
          <div className="mt-5 border-t border-line pt-4">
            <p className="mb-2.5 text-sm font-bold text-navy-900">Pick an idea to develop</p>
            <ul className="grid gap-3 md:grid-cols-2">
              {ideas.map((idea, i) => (
                <li key={i} className="flex flex-col rounded-2xl bg-brand-50 p-3.5 ring-1 ring-line/70">
                  <p className="text-sm font-bold text-navy-900">{idea.title}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-navy-800">{idea.premise}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted">
                    <strong className="text-navy-700">Hook:</strong> {idea.hook}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    <strong className="text-navy-700">Twist:</strong> {idea.twist}
                  </p>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-3 self-start"
                    onClick={() => {
                      setInput("idea", `${idea.title}\n${idea.premise}\nHook: ${idea.hook}\nTwist: ${idea.twist}`);
                      setIdeas(null);
                      toast.success("Idea added — tap Generate full story when ready");
                    }}
                  >
                    Use this idea
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>

      {/* Script editor */}
      <section id="script-editor" className="scroll-mt-20">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-[17px] font-bold text-navy-900">
            <PenLine className="size-[18px] text-brand-600" /> Script editor
          </h2>
          <span
            role="status"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
              saveState === "saved" && "bg-ok-100 text-ok-700",
              (saveState === "dirty" || saveState === "saving") && "bg-brand-100 text-brand-700",
              saveState === "error" && "bg-bad-100 text-bad-700",
            )}
          >
            {saveState === "saved" ? <Check className="size-3.5" /> : saveState === "saving" ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {saveState === "saved" ? "All changes saved" : saveState === "saving" ? "Saving…" : saveState === "dirty" ? "Unsaved changes…" : "Could not save"}
            {saveState === "error" ? (
              <button type="button" className="underline" onClick={() => void flush()}>
                Retry
              </button>
            ) : null}
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {SCRIPT_SECTIONS.map((key) => (
            <Card key={key} className="p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <label htmlFor={`section-${key}`} className="text-sm font-bold text-navy-900">
                  {SCRIPT_SECTION_LABELS[key]}
                  {key === "script" && scriptWords ? <span className="ml-2 text-xs font-medium text-muted">{scriptWords} words · ≈ {formatDuration((scriptWords / 140) * 60)} spoken</span> : null}
                </label>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<RefreshCw className="size-3.5" />}
                  loading={busy === key}
                  disabled={!ai.ready || (busy !== null && busy !== key)}
                  title={ai.ready ? "Rewrite only this section" : "Connect a text provider in Settings"}
                  onClick={() => setRewrite(key)}
                >
                  Regenerate
                </Button>
              </div>
              {key === "title" ? (
                <input
                  id={`section-${key}`}
                  value={sections[key] ?? ""}
                  maxLength={160}
                  onChange={(e) => edit(key, e.target.value)}
                  onBlur={() => void flush()}
                  placeholder="Episode title"
                  className="font-display h-12 w-full rounded-xl bg-white px-3.5 text-lg font-bold text-navy-900 ring-1 ring-inset ring-line focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              ) : (
                <Textarea
                  id={`section-${key}`}
                  rows={SECTION_ROWS[key]}
                  value={sections[key] ?? ""}
                  onChange={(e) => edit(key, e.target.value)}
                  onBlur={() => void flush()}
                  disabled={busy === key}
                  placeholder={SECTION_HELP[key] ?? `Write the ${SCRIPT_SECTION_LABELS[key].toLowerCase()}…`}
                  className={cn(key === "script" || key === "dialogue" ? "font-mono text-[13.5px] md:text-[13px]" : "")}
                />
              )}
              {SECTION_HELP[key] && (sections[key] ?? "").trim() ? <p className="mt-1.5 text-xs text-muted">{SECTION_HELP[key]}</p> : null}
            </Card>
          ))}
        </div>
      </section>

      {/* Review */}
      <Card className="p-4 sm:p-5">
        <SectionTitle
          action={
            <Button size="sm" variant="secondary" icon={<ClipboardCheck className="size-4" />} loading={busy === "review"} disabled={!ai.ready || !(sections.script ?? "").trim() || (busy !== null && busy !== "review")} onClick={doReview}>
              {review ? "Review again" : "Review script"}
            </Button>
          }
        >
          Script quality review
        </SectionTitle>
        {review ? (
          <>
            <p className="text-sm leading-relaxed text-navy-800">{review.summary}</p>
            <ul className="mt-4 grid gap-3 md:grid-cols-2">
              {review.checks.map((c) => (
                <li key={c.key} className="rounded-2xl bg-brand-50 p-3.5 ring-1 ring-line/70">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-navy-900">{c.label}</p>
                    <span className="flex items-center gap-1" aria-label={`${c.score} out of 5`}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span key={n} className={cn("h-2 w-5 rounded-full", n <= c.score ? (c.score >= 4 ? "bg-ok-700" : c.score === 3 ? "bg-brand-500" : "bg-warn-700") : "bg-brand-200")} />
                      ))}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-navy-800">{c.notes}</p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">
              Reviewed {new Date(review.reviewedAt).toLocaleString()} by {review.model}. This is craft feedback on the writing — it is not a prediction of views, and no review can guarantee a video will perform.
            </p>
          </>
        ) : (
          <p className="text-sm leading-relaxed text-muted">
            Checks opening engagement, story clarity, pacing, character consistency, dialogue quality and ending strength, with specific fixes. It is craft feedback, not a prediction — no tool can guarantee a
            video goes viral.
          </p>
        )}
      </Card>

      <Card className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
        <div className="min-w-0 flex-1 basis-56">
          <p className="text-sm font-bold text-navy-900">Next: turn the script into a storyboard</p>
          <p className="text-[13px] text-muted">Storyboard Studio can break this script into scene cards with dialogue, characters and camera notes.</p>
        </div>
        <Link href={`/storyboard?episode=${episode.id}`} onClick={() => void flush()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700">
          Open Storyboard <ArrowRight className="size-4" />
        </Link>
      </Card>

      <ConfirmDialog
        open={confirmOverwrite}
        onClose={() => setConfirmOverwrite(false)}
        title="Replace the current script?"
        message="Generating a full story overwrites every section of the script editor for this episode. To change just one part, use Regenerate on that section instead."
        confirmLabel="Replace and generate"
        danger={false}
        onConfirm={doStory}
      />

      <Modal
        open={rewrite !== null}
        onClose={() => setRewrite(null)}
        title={rewrite ? `Regenerate: ${SCRIPT_SECTION_LABELS[rewrite]}` : ""}
        description="Only this section is rewritten. Everything else in the script stays exactly as it is."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRewrite(null)}>
              Cancel
            </Button>
            <Button icon={<RefreshCw className="size-4" />} onClick={doRewrite}>
              Regenerate section
            </Button>
          </>
        }
      >
        <TextAreaField label="What should change? (optional)" value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="e.g. Make it funnier, give Potato the last line, cut it to half the length." autoFocus />
      </Modal>
    </div>
  );
}
