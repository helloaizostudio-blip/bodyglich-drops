import Link from "next/link";
import { notFound } from "next/navigation";
import { AudioLines, ChevronLeft, Clapperboard, Film, LayoutPanelLeft, PenLine, Send } from "lucide-react";
import { requireCtx } from "@/server/auth";
import { episodeCharacterIds, getEpisode, progressFor } from "@/server/services/episodes";
import { listCharacters } from "@/server/services/characters";
import { getAsset } from "@/server/services/assets";
import { Card, ProgressRing, SectionTitle } from "@/components/ui/misc";
import { ProgressChecklist } from "@/components/episodes/episode-bits";
import { EpisodeEditor } from "./episode-editor";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireCtx();
  const ep = await getEpisode(ctx, (await params).id);
  return { title: ep?.title ?? "Episode" };
}

export default async function EpisodePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireCtx();
  const { id } = await params;
  const episode = await getEpisode(ctx, id);
  if (!episode) notFound();
  const [progressMap, characters, castIds, cover] = await Promise.all([
    progressFor(ctx, [id]),
    listCharacters(ctx),
    episodeCharacterIds(ctx, id),
    episode.coverAssetId ? getAsset(ctx, episode.coverAssetId) : null,
  ]);
  const progress = progressMap.get(id)!;
  const cast = characters.map((c) => ({ id: c.id, name: c.name, profileAssetId: c.profileAssetId }));

  const studios = [
    { href: `/story?episode=${id}`, label: "Story Engine", detail: "Write and review the script", icon: PenLine },
    { href: `/storyboard?episode=${id}`, label: "Storyboard Studio", detail: "Plan scenes and shots", icon: LayoutPanelLeft },
    { href: `/animation?episode=${id}`, label: "Animation Studio", detail: "Produce a clip per scene", icon: Clapperboard },
    { href: `/audio?episode=${id}`, label: "Audio Studio", detail: "Voices, music and effects", icon: AudioLines },
    { href: `/editor?episode=${id}`, label: "Video Editor", detail: "Assemble the timeline", icon: Film },
    { href: `/publishing?episode=${id}`, label: "Publishing Center", detail: "Prepare the YouTube package", icon: Send },
  ];

  return (
    <div className="flex flex-col gap-5">
      <Link href="/episodes" className="-mb-2 flex w-fit items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
        <ChevronLeft className="size-4" /> All episodes
      </Link>

      <EpisodeEditor episode={episode} cast={cast} castIds={castIds} cover={cover} />

      <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
        <Card className="p-5">
          <SectionTitle>Production progress</SectionTitle>
          <div className="mb-4 flex items-center gap-4">
            <ProgressRing value={progress.percent} size={96} />
            <p className="text-xs leading-relaxed text-muted">Calculated automatically from the script, scenes, visuals, clips, voiceovers and final video of this episode.</p>
          </div>
          <ProgressChecklist progress={progress} />
        </Card>

        <Card className="p-5 lg:col-span-2">
          <SectionTitle>Work on this episode</SectionTitle>
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {studios.map((s) => (
              <li key={s.href}>
                <Link href={s.href} className="flex items-center gap-3 rounded-2xl bg-brand-50 p-3.5 ring-1 ring-line/70 transition hover:bg-brand-100">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-brand-600 shadow-card">
                    <s.icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-navy-900">{s.label}</span>
                    <span className="block truncate text-xs text-muted">{s.detail}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
