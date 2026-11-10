import Link from "next/link";
import { ArrowRight, Clapperboard, FolderOpen, LayoutPanelLeft, PenLine, Rocket, Sparkles, UploadCloud, UserPlus, Users } from "lucide-react";
import { requireCtx } from "@/server/auth";
import { listEpisodes } from "@/server/services/episodes";
import { listCharacters } from "@/server/services/characters";
import { listAssets } from "@/server/services/assets";
import { recentActivity } from "@/server/services/activity";
import { EPISODE_STAGES } from "@/db/schema";
import { Card, EmptyState, ProgressRing, SectionTitle } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";
import { AssetThumb } from "@/components/ui/media";
import { EpisodeCard, PipelineTrack, ProgressChecklist, StageBadge } from "@/components/episodes/episode-bits";
import { NewEpisodeButton } from "@/components/episodes/episode-form";
import { timeAgo } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const ctx = await requireCtx();
  const [episodes, characters, recentAssets, activity] = await Promise.all([
    listEpisodes(ctx),
    listCharacters(ctx),
    listAssets(ctx, { limit: 8 }),
    recentActivity(ctx, 8),
  ]);
  const cast = characters.map((c) => ({ id: c.id, name: c.name, profileAssetId: c.profileAssetId }));

  const inProduction = episodes.filter((e) => e.stage !== "idea" && e.stage !== "published");
  const completed = episodes.filter((e) => e.stage === "published");
  const focus = inProduction[0] ?? episodes.find((e) => e.stage !== "published") ?? episodes[0] ?? null;
  const stageCounts = Object.fromEntries(EPISODE_STAGES.map((s) => [s, episodes.filter((e) => e.stage === s).length]));
  const firstName = ctx.user.name.split(/\s+/)[0];

  const stats = [
    { label: "Total episodes", value: episodes.length, icon: Clapperboard, href: "/episodes" },
    { label: "In production", value: inProduction.length, icon: Rocket, href: "/episodes" },
    { label: "Completed", value: completed.length, icon: Sparkles, href: "/episodes" },
    { label: "Characters", value: characters.length, icon: Users, href: "/characters" },
  ];

  const quick = [
    { label: "Create Character", href: "/characters?new=1", icon: UserPlus },
    { label: "Generate Story", href: "/story", icon: PenLine },
    { label: "Open Storyboard", href: "/storyboard", icon: LayoutPanelLeft },
    { label: "Import Assets", href: "/assets?upload=1", icon: UploadCloud },
  ];

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <header>
        <h1 className="text-[26px] font-extrabold leading-tight text-navy-900 sm:text-[32px]">Welcome back, {firstName}!</h1>
        <p className="mt-0.5 text-sm text-muted sm:text-[15px]">Let&apos;s create something amazing for {ctx.project.channelName}.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
        {/* Hero: the episode to continue */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-900 via-navy-800 to-brand-600 p-5 text-white shadow-card sm:p-7 lg:col-span-2">
          <span aria-hidden className="absolute -right-10 -top-14 size-56 rounded-full bg-brand-400/25 blur-2xl" />
          <span aria-hidden className="absolute -bottom-20 right-24 size-48 rounded-full bg-lav-600/30 blur-2xl" />
          <div className="relative flex h-full flex-col">
            {focus ? (
              <>
                <p className="text-[13px] font-semibold text-brand-200">Episode {focus.number} · continue where you left off</p>
                <h2 className="mt-1.5 max-w-xl text-2xl font-extrabold leading-tight sm:text-[28px]">{focus.title}</h2>
                {focus.logline ? <p className="mt-2 line-clamp-2 max-w-xl text-sm text-brand-100/90">{focus.logline}</p> : null}
                <div className="mt-3 flex items-center gap-2">
                  <StageBadge stage={focus.stage} />
                  <span className="text-xs font-semibold text-brand-200">{focus.progress.percent}% complete</span>
                </div>
                <div className="mt-auto flex flex-wrap gap-2 pt-5">
                  <LinkButton href={`/episodes/${focus.id}`} variant="secondary" icon={<ArrowRight className="size-4" />} className="!ring-0">
                    Continue Project
                  </LinkButton>
                  <NewEpisodeButton cast={cast} label="New Episode" variant="navy" className="!bg-white/15 hover:!bg-white/25" />
                </div>
              </>
            ) : (
              <>
                <p className="text-[13px] font-semibold text-brand-200">Your studio is ready</p>
                <h2 className="mt-1.5 max-w-xl text-2xl font-extrabold leading-tight sm:text-[28px]">Start your first {ctx.project.channelName} episode</h2>
                <p className="mt-2 max-w-xl text-sm text-brand-100/90">
                  Create an episode, then take it from idea to script, storyboard, animation and publishing — all in one place.
                </p>
                <div className="mt-auto flex flex-wrap gap-2 pt-5">
                  <NewEpisodeButton cast={cast} variant="secondary" className="!ring-0" />
                  {characters.length === 0 ? (
                    <LinkButton href="/characters" variant="navy" className="!bg-white/15 hover:!bg-white/25" icon={<Users className="size-4" />}>
                      Add your cast
                    </LinkButton>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </section>

        {/* Production progress of the focused episode */}
        <Card className="p-5">
          <SectionTitle>Production Progress</SectionTitle>
          {focus ? (
            <>
              <div className="mb-4 flex items-center gap-4">
                <ProgressRing value={focus.progress.percent} size={96} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-navy-900">{focus.title}</p>
                  <p className="text-xs text-muted">Calculated from the real work done on this episode.</p>
                </div>
              </div>
              <ProgressChecklist progress={focus.progress} />
            </>
          ) : (
            <p className="text-sm leading-relaxed text-muted">Progress appears here once you create an episode. It is calculated from your script, scenes, visuals, clips and audio.</p>
          )}
        </Card>
      </div>

      {/* Stats */}
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:gap-4">
        {stats.map((s) => (
          <li key={s.label}>
            <Link href={s.href} className="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-card ring-1 ring-line/70 transition hover:-translate-y-0.5">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-600">
                <s.icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="font-display block text-2xl font-extrabold leading-none text-navy-900 tabular-nums">{s.value}</span>
                <span className="mt-1 block truncate text-xs font-semibold text-muted">{s.label}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {/* Quick actions */}
      <section>
        <SectionTitle>Quick actions</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <NewEpisodeButton cast={cast} size="lg" className="!h-14 !justify-start !rounded-2xl" />
          {quick.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="flex h-14 items-center gap-2.5 rounded-2xl bg-white px-4 text-sm font-semibold text-navy-900 shadow-card ring-1 ring-line/70 transition hover:bg-brand-100"
            >
              <q.icon className="size-[18px] shrink-0 text-brand-600" aria-hidden />
              <span className="truncate">{q.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Pipeline */}
      <Card className="p-5">
        <SectionTitle>
          Production pipeline <span className="ml-1 text-xs font-medium text-muted">episodes at each stage</span>
        </SectionTitle>
        <PipelineTrack counts={stageCounts} />
      </Card>

      {/* Recent projects */}
      <section>
        <SectionTitle
          action={
            episodes.length ? (
              <Link href="/episodes" className="flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
                View all <ArrowRight className="size-4" />
              </Link>
            ) : null
          }
        >
          Your Projects
        </SectionTitle>
        {episodes.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {episodes.slice(0, 4).map((e) => (
              <EpisodeCard key={e.id} episode={e} progress={e.progress} />
            ))}
          </div>
        ) : (
          <EmptyState icon={<Clapperboard />} title="No episodes yet" action={<NewEpisodeButton cast={cast} />}>
            Every video starts as an episode. Create one to unlock the script, storyboard and production tools.
          </EmptyState>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <Card className="p-5">
          <SectionTitle
            action={
              <Link href="/assets" className="flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
                Library <ArrowRight className="size-4" />
              </Link>
            }
          >
            Recent assets
          </SectionTitle>
          {recentAssets.length ? (
            <ul className="grid grid-cols-4 gap-2">
              {recentAssets.map((a) => (
                <li key={a.id}>
                  <Link href={`/assets?asset=${a.id}`} className="block overflow-hidden rounded-2xl ring-1 ring-line transition hover:ring-2 hover:ring-brand-500" title={a.name}>
                    <AssetThumb asset={a} className="aspect-square w-full" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-start gap-3 text-sm text-muted">
              <p className="flex items-center gap-2">
                <FolderOpen className="size-4 text-brand-500" /> Uploaded and generated files will show up here.
              </p>
              <LinkButton href="/assets?upload=1" variant="secondary" size="sm" icon={<UploadCloud className="size-4" />}>
                Import assets
              </LinkButton>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <SectionTitle>Recent activity</SectionTitle>
          {activity.length ? (
            <ul className="flex flex-col divide-y divide-line/70">
              {activity.map((a) => (
                <li key={a.id} className="flex items-baseline gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-400" aria-hidden />
                  {a.href ? (
                    <Link href={a.href} className="min-w-0 flex-1 text-sm text-navy-800 hover:text-brand-700">
                      {a.message}
                    </Link>
                  ) : (
                    <span className="min-w-0 flex-1 text-sm text-navy-800">{a.message}</span>
                  )}
                  <time className="shrink-0 text-[11px] text-faint">{timeAgo(a.createdAt)}</time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Your studio&apos;s history will appear here as you work.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
