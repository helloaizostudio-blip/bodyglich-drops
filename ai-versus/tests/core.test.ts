import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import sharp from "sharp";
import { encodeWav } from "../src/lib/audio/ffmpeg";
import { estimateWordTimings, stripTags, tokenize, wordsFromAlignment } from "../src/lib/audio/voice";
import { containsBannedContent, validateScript } from "../src/lib/providers/anthropic";
import { sliceSheet } from "../src/lib/pipeline/sheets";
import { buildTimeline, fitTempo } from "../src/lib/pipeline/timeline";
import { chunkWords, upper } from "../src/lib/render/renderer";
import { DEFAULT_SETTINGS, mergeSettings, redactSettings } from "../src/lib/settings";
import { AUDIO_ROLES, CHARACTER_ORDER, type AudioClip, type AudioRole, type Script } from "../src/lib/types";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aiv-test-"));

const script: Script = {
  title: "t",
  hookTop: "What would 5 AIs do",
  hookBottom: "if x?",
  narratorIntro: "[excited] Five AIs are stuck in a test. What would each one do?",
  narratorOutro: "Which AI had the best answer?",
  endingCaption: "Which AI won?",
  environment: { prompt: "p", hazard: "water", palette: "x" },
  disclaimer: "d",
  lines: CHARACTER_ORDER.map((id) => ({
    characterId: id,
    text: `[calm] I am ${id} and this is my clearly different answer to the problem.`,
    caption: `I am ${id} and this is my clearly different answer to the problem.`,
    emphasis: ["different"],
    mood: "calm" as const,
    listenerReaction: "none" as const,
  })),
};

function fakeClip(role: AudioRole, duration: number): AudioClip {
  const words = tokenize(script.lines.find((l) => l.characterId === role)?.caption ?? "a b c");
  return {
    role,
    key: "k",
    rawKey: "r",
    source: "import",
    duration,
    words: words.map((w, i) => ({ text: w, start: (i * duration) / words.length, end: ((i + 1) * duration) / words.length })),
    envelope: [],
    alignment: "estimated",
    text: "",
    voiceId: "v",
    tempo: 1,
  };
}

test("tags are stripped and tokenised", () => {
  assert.equal(stripTags("[excited] Hello [laughs] there!"), "Hello there!");
  assert.deepEqual(tokenize("[x] One, two... three!"), ["One,", "two...", "three!"]);
});

test("ElevenLabs alignment → words, skipping audio tags and remapping time", () => {
  const text = "[calm] Hi you";
  const chars = [...text];
  const starts = chars.map((_, i) => i * 0.1);
  const words = wordsFromAlignment(
    { characters: chars, character_start_times_seconds: starts, character_end_times_seconds: starts.map((s) => s + 0.1) },
    (t) => (t - 0.2) / 2,
  );
  assert.deepEqual(
    words.map((w) => w.text),
    ["Hi", "you"],
  );
  assert.ok(Math.abs(words[0].start - (0.7 - 0.2) / 2) < 1e-9);
});

test("estimated word timings follow pauses in the audio", async () => {
  // 0.8 s tone, 0.4 s silence, 0.8 s tone
  const sr = 16000;
  const seg = (sec: number, on: boolean) => Float32Array.from({ length: sec * sr }, (_, i) => (on ? 0.4 * Math.sin((2 * Math.PI * 220 * i) / sr) : 0));
  const pcm = new Float32Array([...seg(0.2, false), ...seg(0.8, true), ...seg(0.4, false), ...seg(0.8, true), ...seg(0.2, false)]);
  const file = path.join(tmp, "tone.wav");
  fs.writeFileSync(file, encodeWav([pcm], sr));
  const w = await estimateWordTimings(file, "Hello there. How are you?");
  assert.equal(w.length, 5);
  assert.ok(w[0].start >= 0.15 && w[0].start <= 0.3, `first word starts at voice onset (${w[0].start})`);
  assert.ok(w[2].start >= 1.35 && w[2].start <= 1.5, `"How" starts after the pause (${w[2].start})`);
  assert.ok(w[4].end <= 2.25);
});

test("caption chunks are short and break on punctuation", () => {
  const words = tokenize("Okay team, stay calm! Step one: press the big red alarm button now").map((t, i) => ({ text: t, start: i, end: i + 0.5 }));
  const chunks = chunkWords(words);
  assert.ok(chunks.every((c) => c.length <= 3));
  assert.equal(chunks[0].map((w) => w.text).join(" "), "Okay team,");
  assert.equal(upper("What would 5 AIs do"), "WHAT WOULD 5 AIs DO");
});

test("timeline: intro → five answers in order → ending, contiguous, words shifted", () => {
  const audio: Partial<Record<AudioRole, AudioClip>> = {};
  for (const r of AUDIO_ROLES) audio[r] = fakeClip(r, 6);
  const tl = buildTimeline(script, audio, DEFAULT_SETTINGS);
  assert.deepEqual(
    tl.scenes.map((s) => s.kind),
    ["intro", "response", "response", "response", "response", "response", "ending"],
  );
  assert.deepEqual(
    tl.scenes.filter((s) => s.kind === "response").map((s) => s.characterId),
    [...CHARACTER_ORDER],
  );
  for (let i = 1; i < tl.scenes.length; i++) assert.equal(tl.scenes[i].start, tl.scenes[i - 1].end);
  for (const s of tl.scenes) {
    assert.ok(s.voiceStart >= s.start && s.voiceEnd <= s.end);
    assert.ok(s.words.every((w) => w.start >= s.voiceStart - 1e-9));
  }
  assert.equal(tl.duration, tl.scenes[6].end);
  assert.ok(tl.duration >= DEFAULT_SETTINGS.video.minDurationSec);
});

test("tempo fitting keeps long scripts under the max duration", () => {
  assert.equal(fitTempo(30, DEFAULT_SETTINGS), 1);
  const t = fitTempo(48, DEFAULT_SETTINGS);
  assert.ok(t > 1 && t <= 1.2);
});

test("script validation catches banned content and wrong order", () => {
  assert.deepEqual(validateScript(script), []);
  assert.ok(containsBannedContent("then Superman flies in"));
  const bad = { ...script, lines: [...script.lines].reverse() };
  assert.ok(validateScript(bad).some((p) => p.includes("must be chatgpt")));
});

test("settings merge defaults and never expose secrets", () => {
  const s = mergeSettings({ video: { crf: 20 } } as never);
  assert.equal(s.video.crf, 20);
  assert.equal(s.video.fps, 30);
  const r = redactSettings({ ...s, credentials: { anthropicApiKey: "sk-secret-1234", elevenLabsApiKey: "", falKey: "" } });
  assert.equal(r.credentials.anthropicApiKey, "••••1234");
  assert.equal(r.credentialStatus.anthropic, "dashboard");
});

test("sheet slicer removes grid lines and registers offset panels", async () => {
  // 2x2 sheet; each panel has a "body" (rect) + "head" (circle); right column drawn 30 px to the right
  const panel = (dx: number, mouth: boolean) =>
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
        <rect x="${150 + dx}" y="200" width="100" height="150" fill="#2a8"/>
        <circle cx="${200 + dx}" cy="150" r="70" fill="#eee" stroke="#000" stroke-width="6"/>
        ${mouth ? `<ellipse cx="${200 + dx}" cy="175" rx="20" ry="14" fill="#000"/>` : ""}
      </svg>`,
    );
  const sheet = await sharp({ create: { width: 800, height: 800, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: panel(0, false), left: 0, top: 0 },
      { input: panel(30, true), left: 400, top: 0 },
      { input: panel(0, false), left: 0, top: 400 },
      { input: panel(30, true), left: 400, top: 400 },
      // grid lines like some image models draw
      { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect x="398" y="0" width="4" height="800"/><rect x="0" y="398" width="800" height="4"/></svg>`), left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
  const r = await sliceSheet(sheet, { rows: 2, cols: 2, names: ["neutral", "talking", "blink", "surprised"] });
  assert.equal(r.sprites.length, 4);
  assert.ok(Math.abs(r.shifts.talking.dx + 30) <= 2, `talking dx ${r.shifts.talking.dx}`);
  assert.ok(r.shifts.talking.score > 0.97);
  const sizes = new Set(r.sprites.map((s) => `${s.width}x${s.height}`));
  assert.equal(sizes.size, 1, "all sprites share one canvas");
});
