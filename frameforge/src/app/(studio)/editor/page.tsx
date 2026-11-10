import { requireCtx } from "@/server/auth";
import { resolveCurrentEpisode } from "@/server/services/episodes";
import { listCharacters } from "@/server/services/characters";
import { getEditorData } from "@/server/services/editor";
import { PageHeader } from "@/components/ui/misc";
import { NoEpisodeState } from "@/components/episodes/episode-switcher";
import { VideoEditor } from "./video-editor";

export const metadata = { title: "Video Editor" };

export default async function EditorPage({ searchParams }: { searchParams: Promise<{ episode?: string; scene?: string }> }) {
  const ctx = await requireCtx();
  const sp = await searchParams;
  const { current, all } = await resolveCurrentEpisode(ctx, sp.episode);
  if (!current) {
    return (
      <>
        <PageHeader title="Video Editor" subtitle="Assemble the episode timeline and render the final video." />
        <NoEpisodeState what="A video timeline" />
      </>
    );
  }

  const [data, characters] = await Promise.all([getEditorData(ctx, current), listCharacters(ctx)]);

  return (
    <VideoEditor
      key={current.id}
      episode={{ id: current.id, title: current.title }}
      episodes={all.map((e) => ({ id: e.id, number: e.number, title: e.title, stage: e.stage }))}
      data={data}
      characterNames={Object.fromEntries(characters.map((c) => [c.id, c.name]))}
      initialSceneId={sp.scene ?? null}
    />
  );
}
