import { ffmpeg, probe } from "../audio/ffmpeg";
import { tokenize } from "../audio/voice";
import { containsBannedContent } from "../providers/anthropic";
import { CHARACTER_ORDER, CORE_EXPRESSIONS, type CharacterId, type CharacterProfile, type Project, type QcCheck, type QcReport, type Settings } from "../types";

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/** Black-frame intervals (start,end) longer than 0.1 s. */
export async function detectBlack(file: string): Promise<[number, number][]> {
  const { stderr } = await ffmpeg(["-i", file, "-vf", "blackdetect=d=0.1:pix_th=0.08", "-an", "-f", "null", "-"]);
  const out: [number, number][] = [];
  for (const m of stderr.matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)) out.push([parseFloat(m[1]), parseFloat(m[2])]);
  return out;
}

/** Decode the whole file; any decoder error means a corrupted clip. */
export async function decodeErrors(file: string): Promise<string> {
  const { stderr } = await ffmpeg(["-v", "error", "-i", file, "-f", "null", "-"]);
  return stderr.trim();
}

export interface QcInputs {
  project: Project;
  characters: Record<CharacterId, CharacterProfile>;
  /** sprite keys used at render time, per character */
  renderedSprites: Record<string, string[]>;
  sceneFiles: Record<number, string>;
  finalFile: string;
  dialogIntervals: [number, number][];
  audioPeak: number;
  spriteScores: Record<string, number>;
}

export async function runQc(q: QcInputs, s: Settings): Promise<QcReport> {
  const checks: QcCheck[] = [];
  const failedScenes = new Set<number>();
  const add = (name: string, ok: boolean, detail: string, scene?: number) => {
    checks.push({ name, ok, detail, scene });
    if (!ok && scene !== undefined) failedScenes.add(scene);
  };
  const p = q.project;
  const sc = p.script!;
  const tl = p.timeline!;

  // --- content ---
  const ids = sc.lines.map((l) => l.characterId);
  add("all five AI characters included", CHARACTER_ORDER.every((id) => ids.includes(id) && tl.scenes.some((x) => x.characterId === id)), ids.join(", "));
  add("all five answers present", sc.lines.length === 5 && sc.lines.every((l) => tokenize(l.caption).length >= 4), `${sc.lines.length} lines`);
  add("narrator introduces the situation", tl.scenes[0]?.kind === "intro" && !!p.audio.narrator_intro && tokenize(sc.narratorIntro).length >= 5, sc.narratorIntro);
  const allText = [sc.title, sc.hookTop, sc.hookBottom, sc.narratorIntro, sc.narratorOutro, sc.endingCaption, ...sc.lines.map((l) => l.text)].join(" ");
  const banned = containsBannedContent(allText);
  add("no superhero / movie content in script", !banned, banned ? `found "${banned}"` : "clean");

  // --- per character line: correct voice, correct words, captions ---
  tl.scenes.forEach((scene) => {
    const clip = p.audio[scene.audioRole];
    if (!clip) {
      add(`audio present (${scene.audioRole})`, false, "missing", scene.index);
      return;
    }
    const expected =
      scene.kind === "intro" ? sc.narratorIntro : scene.kind === "ending" ? sc.narratorOutro : sc.lines.find((l) => l.characterId === scene.characterId)!.text;
    add(`${scene.audioRole}: speaks the scripted answer`, norm(clip.text) === norm(expected), clip.alignment === "elevenlabs" ? "TTS input matches script (aligned)" : "TTS input matches script", scene.index);
    const capWords = scene.words.map((w) => norm(w.text)).join(" ");
    const scriptWords = tokenize(expected).map(norm).join(" ");
    add(`${scene.audioRole}: captions match the line`, capWords === scriptWords, capWords === scriptWords ? `${scene.words.length} words` : `captions "${capWords.slice(0, 60)}" vs "${scriptWords.slice(0, 60)}"`, scene.index);
    const inWindow = scene.words.every((w) => w.start >= scene.voiceStart - 0.05 && w.end <= scene.voiceEnd + 0.1 && w.end >= w.start);
    add(`${scene.audioRole}: captions inside the voice window`, inWindow, `${scene.voiceStart.toFixed(2)}–${scene.voiceEnd.toFixed(2)}s`, scene.index);
    const envFrames = clip.envelope.length;
    const expFrames = Math.round(clip.duration * tl.fps);
    const voiced = clip.envelope.filter((v) => v > 0.16).length / Math.max(1, envFrames);
    add(
      `${scene.audioRole}: mouth driven by the voice`,
      Math.abs(envFrames - expFrames) <= 2 && voiced > 0.3,
      `${envFrames}/${expFrames} envelope frames, ${(voiced * 100).toFixed(0)}% mouth-active`,
      scene.index,
    );
  });

  // --- overlapping voices ---
  const iv = [...q.dialogIntervals].sort((a, b) => a[0] - b[0]);
  const overlap = iv.some((x, i) => i > 0 && x[0] < iv[i - 1][1] - 0.01);
  add("no overlapping voices", !overlap, iv.map(([a, b]) => `${a.toFixed(2)}–${b.toFixed(2)}`).join(" | "));
  add("audio not clipping", q.audioPeak < 0.999, `peak ${q.audioPeak.toFixed(3)}`);

  // --- character consistency ---
  for (const id of CHARACTER_ORDER) {
    const c = q.characters[id];
    const current = Object.values(c.sprites).map((r) => r!.key).sort().join(",");
    const hasCore = CORE_EXPRESSIONS.every((e) => c.sprites[e]);
    const used = [...(q.renderedSprites[id] ?? [])].sort().join(",");
    add(`${c.displayName}: rendered with library sprites`, hasCore && current === used, current === used ? "matches character library" : "sprites changed since render");
    const score = q.spriteScores[id];
    if (score !== undefined) add(`${c.displayName}: expression sprites aligned`, score >= 0.95, `body overlap ${(score * 100).toFixed(1)}%`);
  }

  // --- scene clips ---
  for (const scene of tl.scenes) {
    const f = q.sceneFiles[scene.index];
    if (!f) {
      add(`scene ${scene.index} rendered`, false, "missing", scene.index);
      continue;
    }
    const j = await probe(f);
    const v = j.streams.find((x: any) => x.codec_type === "video");
    const dur = parseFloat(j.format.duration);
    const expect = scene.end - scene.start;
    add(
      `scene ${scene.index} clip valid`,
      v?.codec_name === "h264" && v.width === tl.width && v.height === tl.height && Math.abs(dur - expect) < 0.1,
      `${v?.codec_name} ${v?.width}x${v?.height} ${dur.toFixed(2)}s (expected ${expect.toFixed(2)}s)`,
      scene.index,
    );
    const errs = await decodeErrors(f);
    add(`scene ${scene.index} decodes cleanly`, !errs, errs ? errs.slice(0, 200) : "ok", scene.index);
    const black = await detectBlack(f);
    add(`scene ${scene.index} has no black frames`, black.length === 0, black.length ? JSON.stringify(black) : "none", scene.index);
  }

  // --- final export ---
  const j = await probe(q.finalFile);
  const v = j.streams.find((x: any) => x.codec_type === "video");
  const a = j.streams.find((x: any) => x.codec_type === "audio");
  const dur = parseFloat(j.format.duration);
  const [fn, fd] = String(v?.r_frame_rate ?? "0/1").split("/").map(Number);
  add("final: H.264 1080x1920", v?.codec_name === "h264" && v.width === s.video.width && v.height === s.video.height, `${v?.codec_name} ${v?.width}x${v?.height} ${v?.pix_fmt}`);
  add("final: 30 FPS", Math.abs(fn / fd - s.video.fps) < 0.01, `${v?.r_frame_rate}`);
  add("final: AAC audio", a?.codec_name === "aac", `${a?.codec_name} ${a?.sample_rate}Hz ${a?.channels}ch`);
  add("final: duration within target", dur >= s.video.minDurationSec - 0.5 && dur <= s.video.maxDurationSec + 0.5, `${dur.toFixed(2)}s (target ${s.video.minDurationSec}–${s.video.maxDurationSec}s)`);
  add(
    "final: ends right after the comparison ending (no extra footage)",
    Math.abs(dur - tl.duration) < 0.1 && tl.scenes[tl.scenes.length - 1].kind === "ending",
    `video ${dur.toFixed(2)}s vs timeline ${tl.duration.toFixed(2)}s; scenes: ${tl.scenes.map((x) => x.kind).join(" → ")}`,
  );
  add("final: only generated scenes (no inserted clips)", Object.keys(q.sceneFiles).length === tl.scenes.length, `${tl.scenes.length} scenes, all rendered by the character renderer`);
  const black = await detectBlack(q.finalFile);
  add("final: no black frames", black.length === 0, black.length ? JSON.stringify(black) : "none");

  return { ok: checks.every((c) => c.ok), checks, failedScenes: [...failedScenes].sort(), checkedAt: new Date().toISOString() };
}
