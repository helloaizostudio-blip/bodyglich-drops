import { handler, ok } from "@/lib/api";
import { generateIdeas, scoreManualIdea } from "@/lib/providers/anthropic";
import { listIdeas, listProjects, loadSettings, saveIdea } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const GET = handler(async () => ok({ ideas: await listIdeas() }));

/** body: { theme?: string } → 10 Claude ideas;  { manual: { question, setting? } } → one scored manual idea */
export const POST = handler(async (req: Request) => {
  const body = await req.json().catch(() => ({}));
  const s = await loadSettings();
  if (body.manual?.question) {
    const idea = await scoreManualIdea(s, String(body.manual.question), body.manual.setting ? String(body.manual.setting) : undefined);
    await saveIdea(idea);
    return ok({ ideas: [idea] });
  }
  const existing = [...(await listIdeas()).map((i) => i.question), ...(await listProjects()).map((p) => p.topic)];
  const { ideas } = await generateIdeas(s, { count: 10, theme: body.theme, avoid: existing.slice(0, 40) });
  for (const i of ideas) await saveIdea(i);
  return ok({ ideas });
});
