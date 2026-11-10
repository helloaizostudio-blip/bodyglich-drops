import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCtx } from "@/server/auth";
import { resolveCurrentEpisode } from "@/server/services/episodes";
import { listScenes } from "@/server/services/scenes";
import { listCharacters } from "@/server/services/characters";
import { SCENE_STATUS_LABELS } from "@/lib/constants";
import { fileUrl, formatDuration } from "@/lib/utils";
import { PrintButton } from "./print-button";

export const metadata = { title: "Storyboard export" };

/** Print-ready storyboard: open on any device and use "Print / Save as PDF". */
export default async function StoryboardPrintPage({ searchParams }: { searchParams: Promise<{ episode?: string }> }) {
  const ctx = await requireCtx();
  const sp = await searchParams;
  const { current } = await resolveCurrentEpisode(ctx, sp.episode);
  if (!current) notFound();
  const [scenes, characters] = await Promise.all([listScenes(ctx, current.id), listCharacters(ctx)]);
  const name = (id: string | null) => characters.find((c) => c.id === id)?.name;
  const total = scenes.reduce((s, x) => s + x.durationSec, 0);

  return (
    <div className="mx-auto max-w-5xl bg-white px-4 py-6 text-navy-900 sm:px-8 print:max-w-none print:p-0">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/storyboard?episode=${current.id}`} className="text-sm font-semibold text-brand-700 hover:underline">
          ← Back to Storyboard Studio
        </Link>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/export/storyboard?episode=${current.id}`}
            className="inline-flex h-11 items-center rounded-xl bg-white px-4 text-sm font-semibold text-navy-900 ring-1 ring-inset ring-line hover:bg-brand-100"
          >
            Download JSON
          </a>
          <PrintButton />
        </div>
      </div>

      <header className="mb-5 border-b-2 border-navy-900 pb-3">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-700">
          {ctx.project.channelName} · Episode {current.number} · Storyboard
        </p>
        <h1 className="text-3xl font-extrabold">{current.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {scenes.length} scene{scenes.length === 1 ? "" : "s"} · {formatDuration(total)} total · exported {new Date().toLocaleDateString()}
        </p>
      </header>

      {scenes.length === 0 ? <p className="text-sm text-muted">This episode has no scenes yet.</p> : null}

      <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 print:grid-cols-2">
        {scenes.map((s, i) => (
          <li key={s.id} className="break-inside-avoid overflow-hidden rounded-2xl border border-line">
            {s.visual ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fileUrl(s.visual.id)} alt="" className="aspect-video w-full bg-brand-100 object-contain" />
            ) : (
              <div className="grid aspect-video w-full place-items-center bg-brand-50 text-xs font-semibold text-faint">No visual reference</div>
            )}
            <div className="p-3 text-[13px] leading-snug">
              <p className="flex items-baseline justify-between gap-2">
                <span className="font-display text-base font-extrabold">
                  {i + 1}. {s.title || "Untitled scene"}
                </span>
                <span className="shrink-0 text-xs font-semibold text-muted">
                  {formatDuration(s.durationSec)} · {SCENE_STATUS_LABELS[s.status]}
                </span>
              </p>
              <dl className="mt-1.5 space-y-1">
                {s.locationName || s.locationText ? (
                  <div>
                    <dt className="inline font-bold">Location: </dt>
                    <dd className="inline">{s.locationName ?? s.locationText}</dd>
                  </div>
                ) : null}
                {s.characterIds.length ? (
                  <div>
                    <dt className="inline font-bold">Characters: </dt>
                    <dd className="inline">{s.characterIds.map((id) => name(id)).filter(Boolean).join(", ")}</dd>
                  </div>
                ) : null}
                {s.action ? (
                  <div>
                    <dt className="inline font-bold">Action: </dt>
                    <dd className="inline">{s.action}</dd>
                  </div>
                ) : null}
                {s.camera ? (
                  <div>
                    <dt className="inline font-bold">Camera: </dt>
                    <dd className="inline">{s.camera}</dd>
                  </div>
                ) : null}
              </dl>
              {s.lines.length ? (
                <ul className="mt-2 space-y-0.5 border-t border-line pt-2">
                  {s.lines.map((l) => (
                    <li key={l.id}>
                      <span className="font-bold">{name(l.characterId) ?? (l.speaker || "Narrator")}:</span> {l.text}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
