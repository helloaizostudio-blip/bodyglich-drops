import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { NARRATOR_VOICE, STYLE_PROMPT } from "../characters";
import { envelope, estimateWordTimings, processVoice, stripTags, tokenize, voicedSpan, wordsFromAlignment } from "../audio/voice";
import { assertBudget, recordCost } from "../costs";
import { generateScript, regenerateLine } from "../providers/anthropic";
import { synthesize } from "../providers/elevenlabs";
import { generateImage, imageToVideo } from "../providers/fal";
import { loadRenderAssets, renderSceneToFile, SceneRenderer } from "../render/renderer";
import { assembleVideo, mixSoundtrack } from "../render/mix";
import { APP_ROOT, DATA_DIR, getIdea, getProject, getStore, loadSettings, saveProject } from "../store";
import {
  AUDIO_ROLES,
  CHARACTER_ORDER,
  STAGES,
  type AudioClip,
  type AudioRole,
  type CharacterId,
  type Project,
  type Settings,
  type StageName,
} from "../types";
import { ensureCharacterLibrary, getCharacters } from "./library";
import { runQc } from "./qc";
import { buildTimeline, fitTempo } from "./timeline";

export type Logger = (msg: string) => void;

export function newProject(topic: string, ideaId?: string): Project {
  const now = new Date().toISOString();
  const slug = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return {
    id: crypto.randomUUID(),
    ideaId,
    topic,
    slug: slug || "episode",
    status: "queued",
    stages: Object.fromEntries(STAGES.map((s) => [s, { status: "pending", log: [] }])) as unknown as Project["stages"],
    audio: {},
    sceneRenders: {},
    costs: [],
    attempts: {},
    createdAt: now,
    updatedAt: now,
  };
}

/** What the pipeline should (re)do. */
export interface RunRequest {
  projectId: string;
  /** start from this stage (everything after it re-runs) */
  from?: StageName;
  /** rewrite one AI's answer with Claude (then re-voice + re-render) */
  rewriteLine?: { characterId: CharacterId; note?: string };
  /** re-synthesise these voices only */
  revoice?: AudioRole[];
  /** regenerate the background image */
  newBackground?: boolean;
}

const workDir = (p: Project) => {
  const d = path.join(DATA_DIR, "work", p.id);
  fs.mkdirSync(d, { recursive: true });
  return d;
};

function expectedText(p: Project, role: AudioRole): string {
  const sc = p.script!;
  if (role === "narrator_intro") return sc.narratorIntro;
  if (role === "narrator_outro") return sc.narratorOutro;
  return sc.lines.find((l) => l.characterId === role)!.text;
}

function hashOf(v: unknown) {
  return crypto.createHash("sha1").update(JSON.stringify(v)).digest("hex").slice(0, 16);
}

export async function runPipeline(req: RunRequest, log: Logger = console.log): Promise<Project> {
  const s = await loadSettings();
  let p = await getProject(req.projectId);
  if (!p) throw new Error(`project ${req.projectId} not found`);
  const store = getStore();
  p.status = "running";

  // targeted regeneration requests invalidate only what they touch
  if (req.rewriteLine && p.script) {
    const line = await regenerateLine(s, p, req.rewriteLine.characterId, req.rewriteLine.note);
    p.script.lines = p.script.lines.map((l) => (l.characterId === line.characterId ? line : l));
    delete p.audio[line.characterId];
    log(`rewrote ${line.characterId}: ${line.caption}`);
  }
  for (const r of req.revoice ?? []) delete p.audio[r];
  if (req.newBackground) p.background = undefined;
  if (req.from) {
    const i = STAGES.indexOf(req.from);
    for (const st of STAGES.slice(i)) p.stages[st] = { status: "pending", log: [] };
    if (req.from === "script") p.script = undefined;
  }
  await saveProject(p);

  const stage = async (name: StageName, fn: (l: Logger) => Promise<void>) => {
    const st = p!.stages[name];
    st.status = "running";
    st.startedAt = new Date().toISOString();
    st.error = undefined;
    st.log = [];
    await saveProject(p!);
    const l: Logger = (m) => {
      st.log.push(`${new Date().toISOString().slice(11, 19)} ${m}`);
      log(`[${name}] ${m}`);
    };
    try {
      await fn(l);
      st.status = "done";
    } catch (e: any) {
      st.status = "failed";
      st.error = e?.message ?? String(e);
      p!.status = "failed";
      l(`FAILED: ${st.error}`);
      await saveProject(p!);
      throw e;
    } finally {
      st.finishedAt = new Date().toISOString();
      await saveProject(p!);
    }
  };

  // ---------------- 1. script ----------------
  await stage("script", async (l) => {
    if (p!.script) return l("script already present");
    const idea = p!.ideaId ? await getIdea(p!.ideaId) : null;
    l("Claude is writing the script and all five answers");
    p!.script = await generateScript(s, p!, idea ?? { question: p!.topic, setting: p!.topic });
    l(`script: "${p!.script.title}"`);
  });

  // ---------------- 2. characters ----------------
  let characters = await getCharacters();
  await stage("characters", async (l) => {
    characters = await ensureCharacterLibrary(s, p!, l);
    for (const id of CHARACTER_ORDER) l(`${characters[id].displayName}: ${Object.keys(characters[id].sprites).length} expressions ready`);
  });

  // ---------------- 3. background ----------------
  await stage("background", async (l) => {
    const sc = p!.script!;
    if (!p!.background || !(await store.hasFile(p!.background.key))) {
      await assertBudget(p!, s, s.costLimits.falImageUsd, "background");
      l("generating environment with fal.ai");
      const prompt = `High-quality 2D cartoon anime background illustration, vertical 9:16, ${sc.environment.prompt}. Palette: ${sc.environment.palette}. NO characters, NO people, NO text. Clean cel-shaded style matching: ${STYLE_PROMPT}.`;
      const file = await generateImage(s, prompt, path.join(workDir(p!), "background.png"), { aspectRatio: "9:16" });
      recordCost(p!, { provider: "fal", what: "background", usd: s.costLimits.falImageUsd });
      const key = `projects/${p!.id}/background.png`;
      await store.putFile(key, file);
      p!.background = { key, source: "fal" };
    } else l("background already present");
    if (s.providers.useImageToVideoBackground && !p!.background.videoKey) {
      await assertBudget(p!, s, s.costLimits.falVideoUsd, "ambient background video");
      l("animating background ambience (image-to-video)");
      const vid = await imageToVideo(s, await store.localPath(p!.background.key), sc.environment.prompt, path.join(workDir(p!), "background.mp4"));
      recordCost(p!, { provider: "fal", what: "background video", usd: s.costLimits.falVideoUsd });
      const key = `projects/${p!.id}/background.mp4`;
      await store.putFile(key, vid);
      p!.background.videoKey = key;
    }
  });

  // ---------------- 4. voices ----------------
  const voicesFn = async (l: Logger) => {
    const wd = workDir(p!);
    // synthesise missing / outdated raw clips
    for (const role of AUDIO_ROLES) {
      const text = expectedText(p!, role);
      const clip = p!.audio[role];
      if (clip && clip.text === text && (await store.hasFile(clip.rawKey))) continue;
      const voice = role === "narrator_intro" || role === "narrator_outro" ? NARRATOR_VOICE : characters[role as CharacterId].voice;
      const est = (text.length / 1000) * s.costLimits.elevenLabsUsdPer1kChars;
      await assertBudget(p!, s, est, `voice ${role}`);
      l(`ElevenLabs: ${role} (${voice.voiceName})`);
      const r = await synthesize(s, text, voice);
      recordCost(p!, { provider: "elevenlabs", what: `voice ${role}`, usd: (r.chars / 1000) * s.costLimits.elevenLabsUsdPer1kChars });
      const rawKey = `projects/${p!.id}/audio/${role}.raw.mp3`;
      await store.putFile(rawKey, r.audio, "audio/mpeg");
      let alignmentKey: string | undefined;
      if (r.alignment) {
        alignmentKey = `projects/${p!.id}/audio/${role}.alignment.json`;
        await store.putFile(alignmentKey, Buffer.from(JSON.stringify(r.alignment)), "application/json");
      }
      p!.audio[role] = {
        role,
        key: "",
        rawKey,
        alignmentKey,
        source: "elevenlabs",
        duration: 0,
        words: [],
        envelope: [],
        alignment: r.alignment ? "elevenlabs" : "estimated",
        text,
        voiceId: voice.voiceId,
        tempo: 1,
      };
      await saveProject(p!);
    }
    // fit total length: one shared tempo so every voice keeps its relative pace
    let speech = 0;
    const spans: Partial<Record<AudioRole, number>> = {};
    for (const role of AUDIO_ROLES) {
      // measure what will remain after silence trimming (same rule processVoice applies)
      const v = await voicedSpan(await store.localPath(p!.audio[role]!.rawKey));
      const d = Math.min(v.total, v.end + 0.08) - Math.max(0, v.start - 0.04);
      spans[role] = d;
      speech += d;
    }
    const tempo = fitTempo(speech, s);
    l(`raw speech ${speech.toFixed(1)}s → tempo ×${tempo.toFixed(3)}`);
    for (const role of AUDIO_ROLES) {
      const clip = p!.audio[role]! as AudioClip;
      const raw = await store.localPath(clip.rawKey);
      const out = path.join(wd, `${role}.wav`);
      const pr = await processVoice(raw, out, tempo);
      const key = `projects/${p!.id}/audio/${role}.wav`;
      await store.putFile(key, out);
      clip.key = key;
      clip.duration = pr.duration;
      clip.tempo = pr.tempo;
      clip.envelope = await envelope(out, s.video.fps);
      const caption = stripTags(clip.text);
      if (clip.alignmentKey) {
        const al = JSON.parse(fs.readFileSync(await store.localPath(clip.alignmentKey), "utf8"));
        clip.words = wordsFromAlignment(al, (t) => (t - pr.trimStart) / pr.tempo).map((w) => ({
          ...w,
          end: Math.min(w.end, pr.duration),
        }));
        // fall back if alignment tokens do not match the caption words
        if (clip.words.length !== tokenize(caption).length) {
          clip.words = await estimateWordTimings(out, caption);
          clip.alignment = "estimated";
        } else {
          const toks = tokenize(caption);
          clip.words = clip.words.map((w, i) => ({ ...w, text: toks[i] }));
          clip.alignment = "elevenlabs";
        }
      } else {
        clip.words = await estimateWordTimings(out, caption);
        clip.alignment = "estimated";
      }
      l(`${role}: ${clip.duration.toFixed(2)}s, ${clip.words.length} words (${clip.alignment} timing)`);
    }
  };
  await stage("voices", voicesFn);

  // ---------------- 5. timeline ----------------
  const timelineFn = async (l: Logger) => {
    p!.timeline = buildTimeline(p!.script!, p!.audio, s, p!.timeline?.seed ?? 7);
    l(`${p!.timeline.scenes.length} scenes, ${p!.timeline.duration.toFixed(2)}s`);
  };
  await stage("timeline", timelineFn);

  // ---------------- 6–7. render + QC (with targeted retries) ----------------
  const sceneFiles: Record<number, string> = {};
  let finalFile = "";
  const renderAll = async (l: Logger, force: Set<number>) => {
    const tl = p!.timeline!;
    const wd = workDir(p!);
    const envelopes: Record<string, number[]> = {};
    for (const r of AUDIO_ROLES) envelopes[r] = p!.audio[r]!.envelope;
    const assets = await loadRenderAssets({
      backgroundPath: await store.localPath(p!.background!.key),
      backgroundVideoPath: p!.background!.videoKey ? await store.localPath(p!.background!.videoKey) : undefined,
      characters,
      spritePath: (k) => store.localPath(k),
      envelopes,
      script: p!.script!,
    });
    const renderer = new SceneRenderer(assets, tl, s);
    const spriteKeys = (id: CharacterId) => Object.values(characters[id].sprites).map((r) => r!.key).sort();
    const spriteSig = CHARACTER_ORDER.map(spriteKeys).flat();
    for (const scene of tl.scenes) {
      const hash = hashOf({ scene, next: tl.scenes[scene.index + 1]?.characterId, spriteSig, bg: p!.background, script: p!.script, video: s.video, v: 3 });
      const prev = p!.sceneRenders[scene.index];
      const file = path.join(wd, "scenes", `scene-${String(scene.index).padStart(2, "0")}.mp4`);
      if (!force.has(scene.index) && prev?.hash === hash && (await store.hasFile(prev.key))) {
        sceneFiles[scene.index] = await store.localPath(prev.key);
        l(`scene ${scene.index}: unchanged, reusing render`);
        continue;
      }
      const t0 = Date.now();
      const frames = await renderSceneToFile(renderer, tl, scene.index, file, s, assets.backgroundVideo);
      const key = `projects/${p!.id}/scenes/scene-${String(scene.index).padStart(2, "0")}.mp4`;
      await store.putFile(key, file);
      p!.sceneRenders[scene.index] = { key, frames, renderedAt: new Date().toISOString(), hash };
      sceneFiles[scene.index] = file;
      l(`scene ${scene.index} (${scene.kind}${scene.characterId ? ` ${scene.characterId}` : ""}): ${frames} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      await saveProject(p!);
    }
    p!.renderedSprites = Object.fromEntries(CHARACTER_ORDER.map((id) => [id, spriteKeys(id)]));
    // soundtrack + assembly
    const clips: Partial<Record<AudioRole, string>> = {};
    for (const r of AUDIO_ROLES) clips[r] = await store.localPath(p!.audio[r]!.key);
    const wav = path.join(wd, "soundtrack.wav");
    p!.mix = await mixSoundtrack(tl, clips, s, p!.script!.environment.hazard, wav);
    l(`soundtrack mixed (peak ${p!.mix.peak.toFixed(3)})`);
    finalFile = path.join(wd, "final.mp4");
    await assembleVideo(tl.scenes.map((x) => sceneFiles[x.index]), wav, tl.duration, finalFile, wd);
    p!.outputKey = `projects/${p!.id}/final.mp4`;
    await store.putFile(p!.outputKey, finalFile, "video/mp4");
    l(`assembled final video (${tl.duration.toFixed(2)}s)`);
  };

  await stage("render", async (l) => renderAll(l, new Set()));

  await stage("qc", async (l) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const report = await runQc(
        {
          project: p!,
          characters,
          renderedSprites: p!.renderedSprites ?? {},
          sceneFiles,
          finalFile,
          dialogIntervals: p!.mix!.dialogIntervals,
          audioPeak: p!.mix!.peak,
          spriteScores: Object.fromEntries(CHARACTER_ORDER.map((id) => [id, characters[id].alignmentScore ?? 1])),
        },
        s,
      );
      p!.qc = report;
      const failed = report.checks.filter((c) => !c.ok);
      l(`QC: ${report.checks.length - failed.length}/${report.checks.length} checks passed`);
      if (report.ok) return;
      failed.forEach((c) => l(`  ✗ ${c.name}: ${c.detail}`));
      if (attempt === 2 || !report.failedScenes.length) break;
      // regenerate only the failing scenes: re-voice when the audio/sync was the problem, then re-render
      for (const idx of report.failedScenes) {
        const sc = p!.timeline!.scenes[idx];
        const audioIssue = failed.some((c) => c.scene === idx && /speaks|captions|mouth|audio/.test(c.name));
        if (audioIssue && p!.audio[sc.audioRole]?.source === "elevenlabs") {
          l(`regenerating voice for scene ${idx} (${sc.audioRole})`);
          delete p!.audio[sc.audioRole];
        }
      }
      if (report.failedScenes.some((i) => !p!.audio[p!.timeline!.scenes[i].audioRole])) {
        // re-voice only the cleared clips (others are reused), then rebuild the timeline
        await voicesFn(l);
        await timelineFn(l);
      }
      l(`re-rendering scenes ${report.failedScenes.join(", ")}`);
      await renderAll(l, new Set(report.failedScenes));
    }
    throw new Error("quality control failed; see the report in Video Preview");
  });
  // ---------------- 8. export ----------------
  await stage("export", async (l) => {
    const dir = path.join(APP_ROOT, "outputs");
    fs.mkdirSync(dir, { recursive: true });
    const name = `${p!.slug}-${p!.id.slice(0, 8)}.mp4`;
    fs.copyFileSync(finalFile || (await store.localPath(p!.outputKey!)), path.join(dir, name));
    fs.writeFileSync(path.join(dir, name.replace(/\.mp4$/, ".json")), JSON.stringify({ script: p!.script, qc: p!.qc, timeline: p!.timeline }, null, 2));
    l(`exported outputs/${name}`);
  });
  p.status = "done";
  await saveProject(p);
  return p;
}
