import { CHARACTER_ORDER, type AudioClip, type AudioRole, type Scene, type Script, type Settings, type Timeline } from "../types";

/** Fixed (non-speech) time in the edit, in seconds. */
export const PACING = {
  introLead: 0.3, // title on screen before narrator speaks
  introTail: 0.3,
  responseLead: 0.5, // transition + character card pop before the line
  responseTail: 0.3,
  endingLead: 0.35,
  endingHold: 1.0, // final card stays a moment, then the video ends cleanly
};

export const fixedOverhead = () =>
  PACING.introLead + PACING.introTail + 5 * (PACING.responseLead + PACING.responseTail) + PACING.endingLead + PACING.endingHold;

/** Tempo needed so the whole video fits `maxDurationSec` (pitch-preserving, capped). */
export function fitTempo(speechSeconds: number, s: Settings): number {
  const budget = s.video.maxDurationSec - fixedOverhead() - 1.0; // ~1 s safety margin
  if (speechSeconds <= budget) return 1;
  return Math.min(1.2, speechSeconds / budget);
}

export function buildTimeline(script: Script, audio: Partial<Record<AudioRole, AudioClip>>, s: Settings, seed = 7): Timeline {
  const need = (r: AudioRole) => {
    const c = audio[r];
    if (!c) throw new Error(`missing audio for ${r}`);
    return c;
  };
  const scenes: Scene[] = [];
  const shift = (c: AudioClip, t0: number) => c.words.map((w) => ({ text: w.text, start: w.start + t0, end: w.end + t0 }));

  let t = 0;
  const intro = need("narrator_intro");
  const iv = t + PACING.introLead;
  scenes.push({
    index: 0,
    kind: "intro",
    audioRole: "narrator_intro",
    start: t,
    end: iv + intro.duration + PACING.introTail,
    voiceStart: iv,
    voiceEnd: iv + intro.duration,
    words: shift(intro, iv),
    emphasis: [],
    mood: "worried",
    listenerReaction: "surprised",
  });
  t = scenes[0].end;

  CHARACTER_ORDER.forEach((id, i) => {
    const line = script.lines.find((l) => l.characterId === id);
    if (!line) throw new Error(`script has no line for ${id}`);
    const c = need(id);
    const vs = t + PACING.responseLead;
    scenes.push({
      index: i + 1,
      kind: "response",
      characterId: id,
      audioRole: id,
      start: t,
      end: vs + c.duration + PACING.responseTail,
      voiceStart: vs,
      voiceEnd: vs + c.duration,
      words: shift(c, vs),
      emphasis: line.emphasis,
      mood: line.mood,
      listenerReaction: line.listenerReaction,
    });
    t = scenes[scenes.length - 1].end;
  });

  const outro = need("narrator_outro");
  const ov = t + PACING.endingLead;
  let end = ov + outro.duration + PACING.endingHold;
  if (end < s.video.minDurationSec) end = s.video.minDurationSec; // hold the ending card a little longer
  scenes.push({
    index: 6,
    kind: "ending",
    audioRole: "narrator_outro",
    start: t,
    end,
    voiceStart: ov,
    voiceEnd: ov + outro.duration,
    words: shift(outro, ov),
    emphasis: [],
    mood: "cheerful",
    listenerReaction: "happy",
  });

  // snap scene boundaries to whole frames so per-scene renders concatenate exactly
  const fps = s.video.fps;
  for (const sc of scenes) {
    sc.start = Math.round(sc.start * fps) / fps;
    sc.end = Math.round(sc.end * fps) / fps;
  }
  for (let i = 1; i < scenes.length; i++) scenes[i].start = scenes[i - 1].end;

  return { fps, width: s.video.width, height: s.video.height, duration: scenes[scenes.length - 1].end, scenes, seed };
}
