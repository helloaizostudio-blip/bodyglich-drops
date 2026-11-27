import { handler, ok } from "@/lib/api";
import { run, FFMPEG } from "@/lib/audio/ffmpeg";
import { queueHealth } from "@/lib/queue";
import { redactSettings } from "@/lib/settings";
import { getStore, loadSettings } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const s = redactSettings(await loadSettings());
  let ffmpeg = "missing";
  try {
    ffmpeg = (await run(FFMPEG, ["-version"])).stdout.toString().split("\n")[0];
  } catch {}
  return ok({ queue: await queueHealth(), storage: getStore().kind, ffmpeg, credentials: s.credentialStatus });
});
