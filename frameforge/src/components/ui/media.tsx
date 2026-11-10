"use client";

import { AudioLines, Film, ImageOff, Play } from "lucide-react";
import type { Asset } from "@/db/schema";
import { cn, colorFromString, fileUrl, formatDuration, initials } from "@/lib/utils";

type ThumbAsset = Pick<Asset, "id" | "kind" | "name" | "durationSec">;

/** Square/any-ratio preview tile for an asset. Videos show their first frame; audio shows a glyph. */
export function AssetThumb({ asset, className, fit = "cover" }: { asset: ThumbAsset | null | undefined; className?: string; fit?: "cover" | "contain" }) {
  if (!asset) {
    return (
      <div className={cn("grid place-items-center bg-brand-100 text-brand-300", className)}>
        <ImageOff className="size-6" aria-hidden />
      </div>
    );
  }
  if (asset.kind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={fileUrl(asset.id)}
        alt={asset.name}
        loading="lazy"
        decoding="async"
        className={cn("bg-brand-100", fit === "cover" ? "object-cover" : "object-contain", className)}
      />
    );
  }
  if (asset.kind === "video") {
    return (
      <div className={cn("relative overflow-hidden bg-navy-900", className)}>
        <video src={`${fileUrl(asset.id)}#t=0.1`} preload="metadata" muted playsInline className={cn("size-full", fit === "cover" ? "object-cover" : "object-contain")} />
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid size-9 place-items-center rounded-full bg-white/90 text-navy-900 shadow">
            <Play className="size-4 translate-x-px fill-current" aria-hidden />
          </span>
        </span>
        {asset.durationSec ? (
          <span className="absolute bottom-1.5 right-1.5 rounded-md bg-navy-950/75 px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums">
            {formatDuration(asset.durationSec)}
          </span>
        ) : null}
      </div>
    );
  }
  return (
    <div className={cn("relative grid place-items-center bg-gradient-to-br from-lav-100 to-brand-100 text-lav-600", className)}>
      {asset.kind === "audio" ? <AudioLines className="size-8" aria-hidden /> : <Film className="size-8" aria-hidden />}
      {asset.durationSec ? (
        <span className="absolute bottom-1.5 right-1.5 rounded-md bg-navy-950/75 px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums">
          {formatDuration(asset.durationSec)}
        </span>
      ) : null}
    </div>
  );
}

/** Full preview with native controls. */
export function AssetPlayer({ asset, className }: { asset: Pick<Asset, "id" | "kind" | "name" | "mimeType">; className?: string }) {
  if (asset.kind === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={fileUrl(asset.id)} alt={asset.name} className={cn("max-h-[60dvh] w-full rounded-2xl bg-brand-100 object-contain", className)} />;
  }
  if (asset.kind === "video") {
    return <video src={fileUrl(asset.id)} controls playsInline preload="metadata" className={cn("max-h-[60dvh] w-full rounded-2xl bg-navy-950", className)} />;
  }
  if (asset.kind === "audio") {
    return (
      <div className={cn("rounded-2xl bg-gradient-to-br from-lav-100 to-brand-100 p-5", className)}>
        <AudioLines className="mx-auto mb-3 size-10 text-lav-600" aria-hidden />
        <audio src={fileUrl(asset.id)} controls preload="metadata" className="w-full" />
      </div>
    );
  }
  return <div className="rounded-2xl bg-brand-100 p-6 text-center text-sm text-muted">No preview available for this file type.</div>;
}

/** Character portrait: the user's own image when present, otherwise a neutral initials placeholder. */
export function CharacterAvatar({
  name,
  assetId,
  className,
  rounded = "rounded-2xl",
}: {
  name: string;
  assetId?: string | null;
  className?: string;
  rounded?: string;
}) {
  if (assetId) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={fileUrl(assetId)} alt={name} loading="lazy" className={cn("bg-brand-100 object-cover", rounded, className)} />;
  }
  return (
    <div
      className={cn("font-display grid place-items-center font-extrabold text-white", rounded, className)}
      style={{ background: `linear-gradient(135deg, ${colorFromString(name)}, var(--color-brand-400))`, containerType: "size" }}
      aria-label={name}
    >
      <span style={{ fontSize: "38cqmin" }}>{initials(name)}</span>
    </div>
  );
}
