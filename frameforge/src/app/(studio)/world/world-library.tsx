"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe2, Images, LayoutPanelLeft, Plus, Search, X } from "lucide-react";
import type { LocationCategory } from "@/db/schema";
import { LOCATION_CATEGORIES } from "@/db/schema";
import type { LocationCard, LocationDetail } from "@/server/services/locations";
import { createLocation } from "@/server/actions/locations";
import { LOCATION_CATEGORY_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Chip, ChipRow, EmptyState, Notice, PageHeader, Spinner } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { PaletteSwatches } from "@/components/ui/palette-input";
import { useRun } from "@/components/ui/use-run";
import type { CastOption } from "@/components/episodes/episode-form";
import { LocationCover } from "./location-cover";
import { LocationDetailModal } from "./location-detail";
import { LocationFields, emptyLocation, useLocationForm } from "./location-form";

export function WorldLibrary({
  locations,
  cast,
  locationId,
  detail,
  openNew,
}: {
  locations: LocationCard[];
  cast: CastOption[];
  /** The location named in the URL (?location=<id>), if any. */
  locationId: string | null;
  /** Its details, or null when that location does not exist (any more). */
  detail: LocationDetail | null;
  openNew: boolean;
}) {
  const router = useRouter();
  const { run, pending } = useRun();
  const [navigating, startNavigation] = useTransition();
  const [openingId, setOpeningId] = useState<string | null>(null);
  // Closing hides the detail view straight away, without waiting for the URL to update.
  const [closedId, setClosedId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<LocationCategory | "all">("all");
  const [creating, setCreating] = useState(openNew);
  const form = useLocationForm(emptyLocation);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return locations.filter(
      (l) =>
        (filter === "all" || l.category === filter) &&
        (!needle || [l.name, l.description, l.lighting, l.timeOfDay, l.consistencyNotes, LOCATION_CATEGORY_LABELS[l.category]].some((f) => f.toLowerCase().includes(needle))),
    );
  }, [locations, q, filter]);

  // The detail view lives in the URL (?location=<id>) so other pages can link straight to it.
  const openLocation = (id: string) => {
    setOpeningId(id);
    setClosedId(null);
    startNavigation(() => router.replace(`/world?location=${id}`, { scroll: false }));
  };
  const closeLocation = () => {
    setClosedId(locationId);
    setOpeningId(null);
    startNavigation(() => router.replace("/world", { scroll: false }));
  };

  const shown = locationId !== null && locationId !== closedId;

  const create = async () => {
    const created = await run(createLocation(form.values), "Location added — now add its background images");
    if (created) {
      setCreating(false);
      form.reset(emptyLocation);
      openLocation(created.id);
    }
  };

  const addButton = (
    <Button icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
      Add Location
    </Button>
  );

  return (
    <>
      <PageHeader title="World Builder" subtitle="Reusable locations that keep every episode's environments consistent." actions={addButton}>
        {locations.length ? (
          <div className="flex flex-col gap-3">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search locations…" className="pl-10 pr-11" aria-label="Search locations" />
              {q ? (
                <button type="button" aria-label="Clear search" onClick={() => setQ("")} className="absolute right-0.5 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-brand-100">
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
            <ChipRow>
              <Chip active={filter === "all"} onClick={() => setFilter("all")} className="!h-10">
                All ({locations.length})
              </Chip>
              {LOCATION_CATEGORIES.map((c) => (
                <Chip key={c} active={filter === c} onClick={() => setFilter(c)} className="!h-10">
                  {LOCATION_CATEGORY_LABELS[c]} ({locations.filter((l) => l.category === c).length})
                </Chip>
              ))}
            </ChipRow>
          </div>
        ) : null}
      </PageHeader>

      {shown && !detail ? (
        <Notice
          tone="warn"
          title="That location no longer exists"
          className="mb-4"
          action={
            <Button size="md" variant="secondary" onClick={closeLocation}>
              Dismiss
            </Button>
          }
        >
          It may have been deleted. Pick another location below.
        </Notice>
      ) : null}

      {locations.length === 0 ? (
        <EmptyState icon={<Globe2 />} title="Build your world" action={addButton}>
          Add the places your stories happen in — a bedroom, the school corridor, the corner shop. Give each one background images, lighting, a colour palette and consistency
          notes, then reuse it in any scene.
        </EmptyState>
      ) : visible.length === 0 ? (
        <EmptyState icon={<Search />} title="No locations match">
          Try a different search or category.
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:gap-4 xl:grid-cols-4">
          {visible.map((l) => {
            const opening = navigating && openingId === l.id;
            return (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => openLocation(l.id)}
                  aria-busy={opening}
                  className="group flex h-full w-full flex-col overflow-hidden rounded-3xl bg-white text-left shadow-card ring-1 ring-line/70 transition hover:-translate-y-0.5 hover:shadow-pop"
                >
                  <span className="relative block w-full">
                    <LocationCover name={l.name} category={l.category} coverAssetId={l.coverAssetId} className="aspect-video w-full" />
                    {opening ? (
                      <span className="absolute inset-0 grid place-items-center bg-white/60">
                        <Spinner />
                      </span>
                    ) : null}
                  </span>
                  <span className="flex w-full flex-1 flex-col p-3">
                    <span className="font-display block truncate text-[15px] font-bold text-navy-900">{l.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {LOCATION_CATEGORY_LABELS[l.category]}
                      {l.timeOfDay ? ` · ${l.timeOfDay}` : ""}
                    </span>
                    <span className="mt-auto flex items-center justify-between gap-2 pt-2.5">
                      <span className="flex min-w-0 items-center gap-2.5 text-[11px] font-semibold text-faint">
                        <span className="flex items-center gap-1" title={`${l.imageCount} background image${l.imageCount === 1 ? "" : "s"}`}>
                          <Images className="size-3.5" aria-hidden />
                          {l.imageCount}
                          <span className="sr-only"> background image{l.imageCount === 1 ? "" : "s"}</span>
                        </span>
                        <span className="flex items-center gap-1" title={`Used in ${l.sceneCount} scene${l.sceneCount === 1 ? "" : "s"}`}>
                          <LayoutPanelLeft className="size-3.5" aria-hidden />
                          {l.sceneCount}
                          <span className="sr-only"> scene{l.sceneCount === 1 ? "" : "s"}</span>
                        </span>
                      </span>
                      <PaletteSwatches colors={l.palette.slice(0, 4)} size="size-4" />
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Add location"
        description="Describe the place. You can add its background images right after."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button onClick={create} loading={pending} disabled={!form.values.name.trim()}>
              Add location
            </Button>
          </>
        }
      >
        <LocationFields values={form.values} set={form.set} cast={cast} />
      </Modal>

      {shown && detail ? <LocationDetailModal key={detail.location.id} detail={detail} cast={cast} onClose={closeLocation} /> : null}
    </>
  );
}
