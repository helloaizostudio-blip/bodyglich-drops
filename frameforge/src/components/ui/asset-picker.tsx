"use client";

import { useEffect, useState } from "react";
import { Check, FolderOpen, Search, X } from "lucide-react";
import type { Asset, AssetCategory, AssetKind } from "@/db/schema";
import { searchAssets } from "@/server/actions/assets";
import { ASSET_CATEGORY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Modal } from "./modal";
import { Button } from "./button";
import { Input } from "./field";
import { AssetThumb } from "./media";
import { EmptyState, Spinner } from "./misc";
import { UploadButton } from "./upload";

/** Modal for choosing an asset from the library, or uploading a new one straight into it. */
export function AssetPicker({
  open,
  onClose,
  onPick,
  kind,
  categories,
  uploadCategory,
  title = "Choose from Asset Library",
  episodeId,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (asset: Asset) => void;
  kind: AssetKind;
  /** Restrict the list to these categories (optional). */
  categories?: AssetCategory[];
  /** Category new uploads from this picker are filed under. */
  uploadCategory: AssetCategory;
  title?: string;
  episodeId?: string;
}) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Asset[] | null>(null);
  const [error, setError] = useState("");
  const [allCategories, setAllCategories] = useState(false);
  const catKey = (categories ?? []).join(",");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setItems(null);
    const t = setTimeout(async () => {
      const res = await searchAssets({ q: q || undefined, kind, categories: allCategories || !catKey ? undefined : (catKey.split(",") as AssetCategory[]) });
      if (cancelled) return;
      if (res.ok) setItems(res.data);
      else {
        setItems([]);
        setError(res.error);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, q, kind, catKey, allCategories]);

  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-40 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name…" className="pl-9" aria-label="Search assets" />
        </div>
        <UploadButton category={uploadCategory} multiple={false} episodeId={episodeId} variant="secondary" onUploaded={(a) => a[0] && onPick(a[0])}>
          Upload new
        </UploadButton>
      </div>
      {categories?.length ? (
        <label className="mt-3 flex items-center gap-2 text-[13px] text-muted">
          <input type="checkbox" className="size-4 accent-brand-600" checked={allCategories} onChange={(e) => setAllCategories(e.target.checked)} />
          Show all {kind} assets (not only {categories.map((c) => ASSET_CATEGORY_LABELS[c]).join(", ")})
        </label>
      ) : null}
      <div className="mt-4">
        {items === null ? (
          <div className="grid place-items-center py-14">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={<FolderOpen />} title={error || "Nothing here yet"}>
            {error ? null : "Upload a file with the button above and it will be saved to your Asset Library."}
          </EmptyState>
        ) : (
          <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
            {items.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => onPick(a)}
                  className="group block w-full overflow-hidden rounded-2xl bg-white text-left ring-1 ring-line transition hover:ring-2 hover:ring-brand-500"
                >
                  <AssetThumb asset={a} className="aspect-square w-full" />
                  <span className="block truncate px-2 py-1.5 text-[11px] font-semibold text-navy-800">{a.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

/** Form control: shows the chosen asset with Change / Remove, and opens the picker. */
export function AssetField({
  label,
  asset,
  onChange,
  kind,
  categories,
  uploadCategory,
  episodeId,
  hint,
  aspect = "aspect-video",
}: {
  label: string;
  asset: Asset | null;
  onChange: (asset: Asset | null) => void;
  kind: AssetKind;
  categories?: AssetCategory[];
  uploadCategory: AssetCategory;
  episodeId?: string;
  hint?: string;
  aspect?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-navy-800">{label}</span>
      {asset ? (
        <div className="flex items-center gap-3 rounded-2xl bg-white p-2 ring-1 ring-line">
          <AssetThumb asset={asset} className={cn("w-24 shrink-0 rounded-xl", kind === "audio" ? "aspect-square w-14" : aspect)} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 truncate text-sm font-semibold text-navy-900">
              <Check className="size-3.5 shrink-0 text-ok-700" />
              <span className="truncate">{asset.name}</span>
            </p>
            <div className="mt-1 flex gap-1">
              <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
                Change
              </Button>
              <Button size="sm" variant="ghost" icon={<X className="size-3.5" />} onClick={() => onChange(null)}>
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-16 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-200 bg-white/70 text-sm font-semibold text-brand-700 transition-colors hover:border-brand-400 hover:bg-brand-50"
        >
          <FolderOpen className="size-4" /> Choose or upload
        </button>
      )}
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
      <AssetPicker
        open={open}
        onClose={() => setOpen(false)}
        onPick={(a) => {
          onChange(a);
          setOpen(false);
        }}
        kind={kind}
        categories={categories}
        uploadCategory={uploadCategory}
        episodeId={episodeId}
      />
    </div>
  );
}
