import { handler, ok } from "@/lib/api";
import { getCharacter } from "@/lib/pipeline/library";
import { saveCharacter } from "@/lib/store";
import { CHARACTER_ORDER, type CharacterId } from "@/lib/types";

export const runtime = "nodejs";

/** Update voice profile, lock flag or design notes. */
export const PATCH = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!CHARACTER_ORDER.includes(id as CharacterId)) throw new Error("character not found");
  const c = await getCharacter(id as CharacterId);
  const b = await req.json();
  if (b.voice) {
    const v = b.voice;
    const num = (x: unknown, lo: number, hi: number, d: number) => (typeof x === "number" && x >= lo && x <= hi ? x : d);
    c.voice = {
      voiceId: typeof v.voiceId === "string" && v.voiceId ? v.voiceId : c.voice.voiceId,
      voiceName: typeof v.voiceName === "string" ? v.voiceName : c.voice.voiceName,
      stability: num(v.stability, 0, 1, c.voice.stability),
      similarityBoost: num(v.similarityBoost, 0, 1, c.voice.similarityBoost),
      style: num(v.style, 0, 1, c.voice.style),
      speed: num(v.speed, 0.7, 1.2, c.voice.speed),
    };
  }
  if (typeof b.locked === "boolean") c.locked = b.locked;
  if (typeof b.designPrompt === "string" && !c.locked) c.designPrompt = b.designPrompt.slice(0, 2000);
  await saveCharacter(c);
  return ok({ character: c });
});
