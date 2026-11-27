import { handler, ok } from "@/lib/api";
import { ensureCharacterLibrary, getCharacters } from "@/lib/pipeline/library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const GET = handler(async () => {
  let chars = await getCharacters();
  // first visit: import the bundled permanent reference sheets so the library is never empty
  if (Object.values(chars).some((c) => !c.sprites.neutral)) chars = await ensureCharacterLibrary(null, null, () => {});
  return ok({ characters: chars });
});
