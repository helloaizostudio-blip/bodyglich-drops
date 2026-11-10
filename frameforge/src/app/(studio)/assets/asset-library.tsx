"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, FolderOpen, Link2, Search, Sparkles, Trash2, UploadCloud, X } from "lucide-react";
import type { Asset, AssetCategory } from "@/db/schema";
import { ASSET_CATEGORIES } from "@/db/schema";
import type { AssetUsage } from "@/server/services/assets";
import { attachAsset, deleteAsset, episodeScenesBrief, getAssetUsage, updateAsset } from "@/server/actions/assets";
import { ASSET_CATEGORY_KINDS, ASSET_CATEGORY_LABELS } from "@/lib/constants";
import { fileUrl, formatBytes, formatDuration, timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, SelectField, TextField } from "@/components/ui/field";
import { Badge, Chip, ChipRow, EmptyState, PageHeader, Spinner } from "@/components/ui/misc";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { AssetPlayer, AssetThumb } from "@/components/ui/media";
import { Dropzone } from "@/components/ui/upload";
import { useRun } from "@/components/ui/use-run";
import Link from "next/link";

type EpisodeOption = { id: string; title: string; number: number };

export function AssetLibrary({
  assets,
  counts,
  q,
  category,
  selected,
  openUpload,
  episodes,
}: {
  assets: Asset[];
  counts: Record<string, number>;
  q: string;
  category: AssetCategory | null;
  selected: Asset | null;
  openUpload: boolean;
  episodes: EpisodeOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [search, setSearch] = useState(q);
  const [uploadOpen, setUploadOpen] = useState(openUpload);
  const [uploadCategory, setUploadCategory] = useState<AssetCategory>(category ?? "character");
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const setParam = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    next.delete("upload");
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Debounced search → URL (so results are filtered on the server and are shareable/back-able).
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => setParam({ q: search.trim() || null }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <>
      <PageHeader
        title="Asset Library"
        subtitle="Every image, clip and sound for your episodes, in one place."
        actions={
          <>
            <Link href="/assets/generate" className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-navy-900 ring-1 ring-inset ring-line hover:bg-brand-100">
              <Sparkles className="size-4 text-brand-600" /> Generate
            </Link>
            <Button icon={<UploadCloud className="size-4" />} onClick={() => setUploadOpen(true)}>
              Upload
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search assets by name…" className="pl-10 pr-10" aria-label="Search assets" />
            {search ? (
              <button type="button" aria-label="Clear search" onClick={() => setSearch("")} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-brand-100">
                <X className="size-4" />
              </button>
            ) : null}
          </div>
          <ChipRow>
            <Chip active={!category} onClick={() => setParam({ category: null })}>
              All ({total})
            </Chip>
            {ASSET_CATEGORIES.map((c) => (
              <Chip key={c} active={category === c} onClick={() => setParam({ category: c })}>
                {ASSET_CATEGORY_LABELS[c]} ({counts[c] ?? 0})
              </Chip>
            ))}
          </ChipRow>
        </div>
      </PageHeader>

      {assets.length === 0 ? (
        total === 0 ? (
          <EmptyState
            icon={<FolderOpen />}
            title="Your library is empty"
            action={
              <Button icon={<UploadCloud className="size-4" />} onClick={() => setUploadOpen(true)}>
                Upload your first files
              </Button>
            }
          >
            Upload character art, backgrounds, props, clips, voiceovers and music. Files are stored on the server, so they are still here after a refresh or on another device.
          </EmptyState>
        ) : (
          <EmptyState icon={<Search />} title="No assets match">
            Try another search or category.
          </EmptyState>
        )
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {assets.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => setParam({ asset: a.id })}
                className="group block w-full overflow-hidden rounded-2xl bg-white text-left shadow-card ring-1 ring-line/70 transition hover:-translate-y-0.5 hover:ring-2 hover:ring-brand-500"
              >
                <AssetThumb asset={a} className="aspect-square w-full" />
                <span className="block px-2.5 pb-2.5 pt-2">
                  <span className="block truncate text-[13px] font-semibold text-navy-900">{a.name}</span>
                  <span className="block truncate text-[11px] text-muted">
                    {ASSET_CATEGORY_LABELS[a.category]} · {formatBytes(a.sizeBytes)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload to Asset Library" description="Choose where the files belong, then pick them from your phone or computer.">
        <div className="flex flex-col gap-4">
          <SelectField label="Category" value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value as AssetCategory)} hint={`Accepts ${ASSET_CATEGORY_KINDS[uploadCategory].join(" / ")} files.`}>
            {ASSET_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {ASSET_CATEGORY_LABELS[c]}
              </option>
            ))}
          </SelectField>
          <Dropzone
            category={uploadCategory}
            title={`Upload ${ASSET_CATEGORY_LABELS[uploadCategory].toLowerCase()}`}
            hint="Tap to browse — you can select several files"
            onUploaded={() => {
              setUploadOpen(false);
              setParam({ category: uploadCategory, q: null });
            }}
          />
        </div>
      </Modal>

      {selected ? <AssetDetail key={selected.id} asset={selected} episodes={episodes} onClose={() => setParam({ asset: null })} /> : null}
    </>
  );
}

function AssetDetail({ asset, episodes, onClose }: { asset: Asset; episodes: EpisodeOption[]; onClose: () => void }) {
  const { run, pending } = useRun();
  const [name, setName] = useState(asset.name);
  const [usage, setUsage] = useState<AssetUsage[] | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [episodeId, setEpisodeId] = useState(episodes[0]?.id ?? "");
  const [sceneId, setSceneId] = useState("");
  const [sceneOptions, setSceneOptions] = useState<{ id: string; position: number; title: string }[]>([]);

  useEffect(() => {
    let live = true;
    getAssetUsage({ id: asset.id }).then((res) => live && setUsage(res.ok ? res.data : []));
    return () => {
      live = false;
    };
  }, [asset.id]);

  useEffect(() => {
    if (!episodeId) return;
    let live = true;
    setSceneId("");
    episodeScenesBrief({ episodeId }).then((res) => live && setSceneOptions(res.ok ? res.data : []));
    return () => {
      live = false;
    };
  }, [episodeId]);

  const compatible = ASSET_CATEGORIES.filter((c) => ASSET_CATEGORY_KINDS[c].includes(asset.kind));
  const facts = [
    { label: "Type", value: asset.mimeType },
    { label: "Size", value: formatBytes(asset.sizeBytes) },
    asset.width && asset.height ? { label: "Dimensions", value: `${asset.width} × ${asset.height}` } : null,
    asset.durationSec ? { label: "Duration", value: formatDuration(asset.durationSec) } : null,
    { label: "Source", value: asset.source === "upload" ? "Uploaded" : asset.source === "generated" ? "AI generated" : "Rendered" },
    { label: "Added", value: timeAgo(asset.createdAt) },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <>
      <Modal open onClose={onClose} title={asset.name} description={ASSET_CATEGORY_LABELS[asset.category]} size="lg">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <AssetPlayer asset={asset} />
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
              {facts.map((f) => (
                <div key={f.label}>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-faint">{f.label}</dt>
                  <dd className="truncate text-[13px] font-medium text-navy-800">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex flex-col gap-4">
            <TextField
              label="Name"
              value={name}
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => name.trim() && name !== asset.name && run(updateAsset({ id: asset.id, name }), "Renamed")}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            />
            <SelectField label="Category" value={asset.category} disabled={pending} onChange={(e) => run(updateAsset({ id: asset.id, category: e.target.value as AssetCategory }), "Category updated")}>
              {compatible.map((c) => (
                <option key={c} value={c}>
                  {ASSET_CATEGORY_LABELS[c]}
                </option>
              ))}
            </SelectField>

            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-navy-800">Used in</p>
              {usage === null ? (
                <Spinner className="size-4" />
              ) : usage.length ? (
                <ul className="flex flex-col gap-1.5">
                  {usage.map((u, i) => (
                    <li key={i}>
                      <Link href={u.href} className="flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-[13px] font-medium text-navy-800 ring-1 ring-line/70 hover:bg-brand-100">
                        <Link2 className="size-3.5 shrink-0 text-brand-600" />
                        <span className="min-w-0 flex-1 truncate">{u.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-muted">Not used anywhere yet.</p>
              )}
            </div>

            {episodes.length ? (
              <div className="rounded-2xl bg-brand-50 p-3 ring-1 ring-line/70">
                <p className="mb-2 text-[13px] font-semibold text-navy-800">Attach to an episode or scene</p>
                <div className="flex flex-col gap-2">
                  <SelectField label="Episode" value={episodeId} onChange={(e) => setEpisodeId(e.target.value)}>
                    {episodes.map((e) => (
                      <option key={e.id} value={e.id}>
                        EP {e.number} · {e.title}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField label="Scene (optional)" value={sceneId} onChange={(e) => setSceneId(e.target.value)} disabled={!sceneOptions.length}>
                    <option value="">{sceneOptions.length ? "Whole episode" : "No scenes yet"}</option>
                    {sceneOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        Scene {s.position + 1}
                        {s.title ? ` · ${s.title}` : ""}
                      </option>
                    ))}
                  </SelectField>
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={pending}
                    icon={<Link2 className="size-3.5" />}
                    onClick={async () => {
                      const next = await run(attachAsset({ assetId: asset.id, episodeId: sceneId ? undefined : episodeId, sceneId: sceneId || undefined }), "Attached");
                      if (next) setUsage(next);
                    }}
                  >
                    Attach
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2 border-t border-line pt-4">
              <a href={`${fileUrl(asset.id)}?download=1`} className="inline-flex h-9 items-center gap-2 rounded-xl bg-white px-3 text-[13px] font-semibold text-navy-900 ring-1 ring-inset ring-line hover:bg-brand-100">
                <Download className="size-3.5" /> Download
              </a>
              <Button variant="ghost" size="sm" className="!text-bad-700 hover:!bg-bad-100" icon={<Trash2 className="size-3.5" />} onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
              {asset.source !== "upload" ? <Badge tone="lav">{asset.source === "generated" ? "AI generated" : "Rendered"}</Badge> : null}
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this asset?"
        message={
          <>
            <strong>{asset.name}</strong> will be permanently deleted from storage.
            {usage?.length ? ` It is currently used in ${usage.length} place${usage.length === 1 ? "" : "s"}, which will lose this file.` : ""} This cannot be undone.
          </>
        }
        confirmLabel="Delete permanently"
        onConfirm={async () => {
          const ok = await run(deleteAsset({ id: asset.id }), "Asset deleted");
          setConfirmDelete(false);
          if (ok) onClose();
        }}
      />
    </>
  );
}
