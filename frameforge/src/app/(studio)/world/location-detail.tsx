"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, FolderOpen, Link2, Pencil, Star, Trash2 } from "lucide-react";
import type { LocationDetail, LocationImageView } from "@/server/services/locations";
import { addLocationImages, deleteLocation, removeLocationImage, setLocationCover, updateLocation } from "@/server/actions/locations";
import { LOCATION_CATEGORY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button, IconButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { AssetThumb, CharacterAvatar } from "@/components/ui/media";
import { AssetPicker } from "@/components/ui/asset-picker";
import { UploadButton } from "@/components/ui/upload";
import { PaletteSwatches } from "@/components/ui/palette-input";
import { useRun } from "@/components/ui/use-run";
import { useToast } from "@/components/ui/toast";
import type { CastOption } from "@/components/episodes/episode-form";
import { LocationCover } from "./location-cover";
import { LocationFields, useLocationForm, type LocationFormValues } from "./location-form";

function Heading({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-2 flex min-h-9 flex-wrap items-center justify-between gap-2">
      <h3 className="text-[15px] font-bold text-navy-900">{children}</h3>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function LocationDetailModal({ detail, cast, onClose }: { detail: LocationDetail; cast: CastOption[]; onClose: () => void }) {
  const { location, images, usage, promptText } = detail;
  const { run, pending } = useRun();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [removing, setRemoving] = useState<LocationImageView | null>(null);
  const [picking, setPicking] = useState(false);

  const saved: LocationFormValues = {
    name: location.name,
    category: location.category,
    description: location.description,
    lighting: location.lighting,
    timeOfDay: location.timeOfDay,
    palette: location.palette,
    consistencyNotes: location.consistencyNotes,
    characterIds: detail.characterIds,
  };
  const form = useLocationForm(saved);

  const members = cast.filter((c) => detail.characterIds.includes(c.id));
  const facts = [
    { label: "Description", value: location.description },
    { label: "Lighting", value: location.lighting },
    { label: "Time of day", value: location.timeOfDay },
    { label: "Visual consistency notes", value: location.consistencyNotes },
  ];

  const addImages = async (assetIds: string[]) => {
    const res = await run(addLocationImages({ locationId: location.id, assetIds }));
    if (!res) return;
    if (res.added) toast.success(res.added === 1 ? "Background image added" : `${res.added} background images added`);
    else toast.info("That image is already part of this location.");
  };

  const save = async () => {
    const ok = await run(updateLocation({ id: location.id, ...form.values }), "Location saved");
    if (ok) setEditing(false);
  };

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={editing ? `Edit ${location.name}` : location.name}
        description={editing ? undefined : LOCATION_CATEGORY_LABELS[location.category]}
        size="lg"
        footer={
          editing ? (
            <>
              <Button variant="secondary" onClick={() => setEditing(false)} disabled={pending}>
                Cancel
              </Button>
              <Button onClick={save} loading={pending} disabled={!form.values.name.trim()}>
                Save changes
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" className="mr-auto !text-bad-700 hover:!bg-bad-100" icon={<Trash2 className="size-4" />} onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
              <Button
                variant="secondary"
                icon={<Pencil className="size-4" />}
                onClick={() => {
                  form.reset(saved);
                  setEditing(true);
                }}
              >
                Edit
              </Button>
            </>
          )
        }
      >
        {editing ? (
          <LocationFields values={form.values} set={form.set} cast={cast} />
        ) : (
          <div className="flex flex-col gap-6">
            <LocationCover name={location.name} category={location.category} coverAssetId={location.coverAssetId} className="aspect-video max-h-72 w-full rounded-2xl" />

            <section>
              <Heading
                action={
                  <>
                    <Button size="md" variant="secondary" icon={<FolderOpen className="size-4" />} onClick={() => setPicking(true)}>
                      From library
                    </Button>
                    <UploadButton category="background" onUploaded={(uploaded) => addImages(uploaded.map((a) => a.id))}>
                      Upload
                    </UploadButton>
                  </>
                }
              >
                Background images ({images.length})
              </Heading>
              {images.length ? (
                <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                  {images.map((img) => {
                    const isCover = img.asset.id === location.coverAssetId;
                    return (
                      <li key={img.id} className={cn("overflow-hidden rounded-2xl bg-white", isCover ? "ring-2 ring-brand-500" : "ring-1 ring-line")}>
                        <Link href={`/assets?asset=${img.asset.id}`} className="relative block" title="Open in Asset Library">
                          <AssetThumb asset={img.asset} className="aspect-video w-full" />
                          {isCover ? (
                            <Badge tone="navy" className="absolute left-1.5 top-1.5">
                              <Star className="size-3 fill-current" aria-hidden /> Cover
                            </Badge>
                          ) : null}
                        </Link>
                        <div className="flex items-center gap-1 px-1.5 py-1">
                          <span className="min-w-0 flex-1 truncate pl-1 text-[12px] font-semibold text-navy-800">{img.asset.name}</span>
                          {isCover ? null : (
                            <IconButton
                              label="Use as cover image"
                              disabled={pending}
                              onClick={() => run(setLocationCover({ locationId: location.id, assetId: img.asset.id }), "Cover image changed")}
                            >
                              <Star className="size-4" />
                            </IconButton>
                          )}
                          <IconButton label="Remove from this location" className="!text-bad-700 hover:!bg-bad-100" disabled={pending} onClick={() => setRemoving(img)}>
                            <Trash2 className="size-4" />
                          </IconButton>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="rounded-2xl border-2 border-dashed border-brand-200 bg-white/70 px-4 py-6 text-center text-[13px] leading-relaxed text-muted">
                  No background images yet. Upload your own art or pick images from the Asset Library — the first one becomes the cover.
                </p>
              )}
            </section>

            <section>
              <Heading>Details</Heading>
              <dl className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
                {facts.map((f) => (
                  <div key={f.label} className={f.label === "Description" || f.label === "Visual consistency notes" ? "sm:col-span-2" : undefined}>
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-faint">{f.label}</dt>
                    <dd className={cn("mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed", f.value ? "text-navy-800" : "italic text-faint")}>{f.value || "Not set"}</dd>
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-faint">Colour palette</dt>
                  <dd className="mt-1">
                    {location.palette.length ? (
                      <div className="flex flex-wrap items-center gap-2.5">
                        <PaletteSwatches colors={location.palette} size="size-7" />
                        <span className="font-mono text-[11.5px] uppercase text-muted">{location.palette.join("  ")}</span>
                      </div>
                    ) : (
                      <span className="text-sm italic text-faint">Not set</span>
                    )}
                  </dd>
                </div>
              </dl>
            </section>

            <section>
              <Heading>Characters usually found here</Heading>
              {members.length ? (
                <ul className="flex flex-wrap gap-2">
                  {members.map((m) => (
                    <li key={m.id}>
                      <Link
                        href={`/characters/${m.id}`}
                        className="flex h-11 items-center gap-2 rounded-full bg-brand-50 pl-1 pr-3.5 text-[13px] font-semibold text-navy-800 ring-1 ring-line/70 hover:bg-brand-100"
                      >
                        <CharacterAvatar name={m.name} assetId={m.profileAssetId} className="size-9" rounded="rounded-full" />
                        {m.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-muted">No characters linked yet. Use Edit to choose who belongs here.</p>
              )}
            </section>

            <section>
              <Heading>Used in</Heading>
              {usage.length ? (
                <ul className="flex flex-col gap-1.5">
                  {usage.map((u) => (
                    <li key={u.sceneId}>
                      <Link
                        href={`/storyboard?episode=${u.episodeId}&scene=${u.sceneId}`}
                        className="flex min-h-11 items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-[13px] font-medium text-navy-800 ring-1 ring-line/70 hover:bg-brand-100"
                      >
                        <Link2 className="size-3.5 shrink-0 text-brand-600" aria-hidden />
                        <span className="min-w-0 flex-1 truncate">
                          EP {u.episodeNumber} · {u.episodeTitle} — Scene {u.position + 1}
                          {u.sceneTitle ? ` “${u.sceneTitle}”` : ""}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-muted">No scene is set in this location yet.</p>
              )}
            </section>

            <section>
              <Heading
                action={
                  <Button
                    variant="secondary"
                    icon={<Copy className="size-4" />}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(promptText);
                        toast.success("Location prompt copied");
                      } catch {
                        toast.error("Could not copy — select the text manually.");
                      }
                    }}
                  >
                    Copy
                  </Button>
                }
              >
                Prompt block
              </Heading>
              <p className="mb-2.5 text-xs leading-relaxed text-muted">Built from the details above. Paste it into any image or animation prompt set in this location to keep the environment consistent.</p>
              <pre className="whitespace-pre-wrap break-words rounded-2xl bg-navy-900 p-3.5 font-mono text-[11.5px] leading-relaxed text-brand-100">{promptText}</pre>
            </section>
          </div>
        )}
      </Modal>

      <AssetPicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(asset) => {
          setPicking(false);
          void addImages([asset.id]);
        }}
        kind="image"
        categories={["background"]}
        uploadCategory="background"
        title="Choose a background image"
      />

      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title="Remove this image?"
        message={
          <>
            <strong>{removing?.asset.name}</strong> will be removed from {location.name}. The file itself stays in your Asset Library.
          </>
        }
        confirmLabel="Remove image"
        onConfirm={async () => {
          if (removing) await run(removeLocationImage({ id: removing.id }), "Image removed");
          setRemoving(null);
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this location?"
        message={
          <>
            <strong>{location.name}</strong> will be deleted.
            {usage.length ? ` ${usage.length} scene${usage.length === 1 ? " is" : "s are"} set here and will lose the link to it.` : ""} Its background images stay in your Asset Library.
          </>
        }
        confirmLabel="Delete location"
        onConfirm={async () => {
          const ok = await run(deleteLocation({ id: location.id }), "Location deleted");
          setConfirmDelete(false);
          if (ok) onClose();
        }}
      />
    </>
  );
}
