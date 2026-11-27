/**
 * Builds the reference sample: "What Would Five AIs Do If They Were Trapped In A Flooding Elevator?"
 *
 * The script below was written by Claude (the scriptwriting engine) and the voices were produced
 * with ElevenLabs using each character's assigned voice; the background was generated from the
 * environment prompt. Those source files live in samples/flooding-elevator/source so the sample is
 * reproducible without API keys. Everything after that — character library, audio processing,
 * timing, animation, captions, music/SFX, assembly, QC and export — runs through the real pipeline.
 *
 *   npm run sample
 */
import fs from "node:fs";
import path from "node:path";
import { stripTags } from "../src/lib/audio/voice";
import { newProject, runPipeline } from "../src/lib/pipeline/run";
import { APP_ROOT, getStore, loadSettings, saveProject, saveSettings } from "../src/lib/store";
import { AUDIO_ROLES, type Script } from "../src/lib/types";

const SRC = path.join(APP_ROOT, "samples", "flooding-elevator", "source");

const script: Script = {
  title: "Flooding Elevator",
  hookTop: "What would 5 AIs do",
  hookBottom: "if they were trapped in a flooding elevator?",
  narratorIntro: "[excited] Five AIs are trapped in an elevator... and the water is rising! What would each one do?",
  narratorOutro: "[curious] So... which AI had the best answer?",
  endingCaption: "Which AI had the best answer?",
  environment: {
    prompt:
      "interior of a cramped stuck elevator cabin, brushed steel walls, closed doors, glowing control panel, flickering red emergency light, murky blue-green flood water filling the bottom third with ripples, water trickling through the door seam, a floating rubber duck, ceiling emergency hatch",
    hazard: "water",
    palette: "steel grey, emergency red, teal water",
  },
  disclaimer: "Fictional parody · not real AI outputs",
  lines: [
    {
      characterId: "chatgpt",
      text: "[confident, friendly] Okay team, stay calm! Step one: press the alarm. Step two: climb onto the handrail. Step three... I've drafted a fourteen-point escape plan!",
      emphasis: ["calm!", "alarm.", "fourteen-point"],
      mood: "cheerful",
      listenerReaction: "surprised",
    },
    {
      characterId: "claude",
      text: "[calm, gentle] Before anyone panics, is everyone okay? Good. The ceiling hatch is our way out. Let's lift the smallest of us up... together.",
      emphasis: ["okay?", "hatch", "together."],
      mood: "calm",
      listenerReaction: "happy",
    },
    {
      characterId: "gemini",
      text: "[fast, excited] Ooh, I just looked it up! Door seals, water pressure, hatch specs... the hatch opens outward! Quick, somebody lift me up!",
      emphasis: ["outward!", "Quick,"],
      mood: "excited",
      listenerReaction: "surprised",
    },
    {
      characterId: "grok",
      text: "[smug, sarcastic] Relax. I already pressed every button. Twice. Worst case? We become the world's first AI submarine.",
      emphasis: ["Twice.", "submarine."],
      mood: "smug",
      listenerReaction: "confused",
    },
    {
      characterId: "meta",
      text: "[cheerful] Wait, wait, let me post this first! Hashtag elevator pool party! [laughs] Okay, okay... I'm helping!",
      emphasis: ["post", "pool", "party!"],
      mood: "cheerful",
      listenerReaction: "surprised",
    },
  ].map((l) => ({ ...l, caption: stripTags(l.text) })) as Script["lines"],
};

const VOICE_IDS: Record<string, string> = {
  narrator_intro: "TX3LPaxmHKxFdv7VOQHJ",
  narrator_outro: "TX3LPaxmHKxFdv7VOQHJ",
  chatgpt: "iP95p4xoKVk53GoZ742B",
  claude: "SAz9YHcvj6GT2YYXdXww",
  gemini: "FGY2WhTYpPnrIDTdsKH5",
  grok: "N2lVS1w4EtoT3dr4eOWO",
  meta: "cgSgspJ2msm6clMCkdW9",
};

async function main() {
  const s = await loadSettings();
  await saveSettings(s);
  const store = getStore();
  const p = newProject("What Would Five AIs Do If They Were Trapped In A Flooding Elevator?");
  p.script = script;
  p.stages.script = { status: "done", log: ["script written by Claude (imported sample)"] };

  const bgKey = `projects/${p.id}/background.png`;
  await store.putFile(bgKey, path.join(SRC, "background.png"));
  p.background = { key: bgKey, source: "import" };

  for (const role of AUDIO_ROLES) {
    const rawKey = `projects/${p.id}/audio/${role}.raw.mp3`;
    await store.putFile(rawKey, path.join(SRC, `${role}.mp3`));
    const text = role === "narrator_intro" ? script.narratorIntro : role === "narrator_outro" ? script.narratorOutro : script.lines.find((l) => l.characterId === role)!.text;
    p.audio[role] = {
      role,
      key: "",
      rawKey,
      source: "import",
      duration: 0,
      words: [],
      envelope: [],
      alignment: "estimated",
      text,
      voiceId: VOICE_IDS[role],
      tempo: 1,
    };
  }
  await saveProject(p);
  console.log(`project ${p.id}`);

  const t0 = Date.now();
  const done = await runPipeline({ projectId: p.id });
  console.log(`pipeline finished in ${((Date.now() - t0) / 1000).toFixed(1)}s → status ${done.status}`);

  const outDir = path.join(APP_ROOT, "samples", "flooding-elevator");
  fs.copyFileSync(await store.localPath(done.outputKey!), path.join(outDir, "flooding-elevator.mp4"));
  fs.writeFileSync(
    path.join(outDir, "report.json"),
    JSON.stringify({ projectId: done.id, script: done.script, timeline: done.timeline, qc: done.qc, stages: done.stages }, null, 2),
  );
  const failed = done.qc?.checks.filter((c) => !c.ok) ?? [];
  console.log(`QC ${done.qc?.ok ? "PASSED" : "FAILED"} (${(done.qc?.checks.length ?? 0) - failed.length}/${done.qc?.checks.length})`);
  for (const c of failed) console.log(`  ✗ ${c.name}: ${c.detail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
