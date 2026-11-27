/**
 * Produce an episode from local source files (no API keys needed):
 *
 *   npm run episode -- samples/black-hole
 *
 * <dir>/episode.json holds the topic, script, voice ids and background
 * ({ "file": "source/background.png" } or { "procedural": "blackhole-cockpit" }).
 * <dir>/source/<role>.mp3 holds the voice lines (narrator_intro, chatgpt, …, narrator_outro).
 * Output: <dir>/<name>.mp4 + <dir>/report.json
 */
import fs from "node:fs";
import path from "node:path";
import { stripTags } from "../src/lib/audio/voice";
import { newProject, runPipeline } from "../src/lib/pipeline/run";
import { PROCEDURAL_SCENES } from "../src/lib/render/procedural";
import { APP_ROOT, getStore, saveProject } from "../src/lib/store";
import { AUDIO_ROLES, type Script } from "../src/lib/types";

async function main() {
  const dir = path.resolve(APP_ROOT, process.argv[2] ?? "");
  const ep = JSON.parse(fs.readFileSync(path.join(dir, "episode.json"), "utf8"));
  const script: Script = { ...ep.script, lines: ep.script.lines.map((l: any) => ({ ...l, caption: stripTags(l.text) })) };
  const store = getStore();
  const p = newProject(ep.topic);
  p.script = script;
  p.stages.script = { status: "done", log: ["script imported from episode.json"] };

  if (ep.background?.procedural) {
    if (!PROCEDURAL_SCENES.includes(ep.background.procedural)) throw new Error(`unknown procedural scene ${ep.background.procedural}`);
    p.background = { key: `procedural:${ep.background.procedural}`, source: "procedural", procedural: ep.background.procedural };
  } else {
    const key = `projects/${p.id}/background.png`;
    await store.putFile(key, path.join(dir, ep.background.file));
    p.background = { key, source: "import" };
  }

  for (const role of AUDIO_ROLES) {
    const rawKey = `projects/${p.id}/audio/${role}.raw.mp3`;
    await store.putFile(rawKey, path.join(dir, "source", `${role}.mp3`));
    const text = role === "narrator_intro" ? script.narratorIntro : role === "narrator_outro" ? script.narratorOutro : script.lines.find((l) => l.characterId === role)!.text;
    p.audio[role] = { role, key: "", rawKey, source: "import", duration: 0, words: [], envelope: [], alignment: "estimated", text, voiceId: ep.voiceIds?.[role] ?? "", tempo: 1 };
  }
  await saveProject(p);
  console.log(`project ${p.id}`);

  const done = await runPipeline({ projectId: p.id });
  const name = path.basename(dir);
  fs.copyFileSync(await store.localPath(done.outputKey!), path.join(dir, `${name}.mp4`));
  fs.writeFileSync(path.join(dir, "report.json"), JSON.stringify({ projectId: done.id, script: done.script, timeline: done.timeline, qc: done.qc }, null, 2));
  const failed = done.qc?.checks.filter((c) => !c.ok) ?? [];
  console.log(`QC ${done.qc?.ok ? "PASSED" : "FAILED"} (${(done.qc?.checks.length ?? 0) - failed.length}/${done.qc?.checks.length}) → ${path.join(dir, `${name}.mp4`)}`);
  for (const c of failed) console.log(`  ✗ ${c.name}: ${c.detail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
