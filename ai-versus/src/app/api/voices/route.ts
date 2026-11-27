import { handler, ok } from "@/lib/api";
import { listVoices } from "@/lib/providers/elevenlabs";
import { loadSettings } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handler(async () => ok({ voices: await listVoices(await loadSettings()) }));
