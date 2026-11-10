"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import type { Asset } from "@/db/schema";
import { cn, fileUrl } from "@/lib/utils";
import { useToast } from "./toast";

const EXT: Record<string, string> = {
  "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "image/gif": ".gif", "image/avif": ".avif",
  "video/mp4": ".mp4", "video/webm": ".webm", "video/quicktime": ".mov", "video/x-matroska": ".mkv",
  "audio/mpeg": ".mp3", "audio/wav": ".wav", "audio/x-wav": ".wav", "audio/ogg": ".ogg", "audio/mp4": ".m4a", "audio/x-m4a": ".m4a", "audio/aac": ".aac", "audio/flac": ".flac", "audio/webm": ".weba",
};
const SMALL = 12 * 1024 * 1024;
const STEP = 6 * 1024 * 1024;

/**
 * Saves an asset to the device. Small files use a normal download link. Large files are fetched in
 * byte ranges and stitched together in the browser, because some hosts cannot send a big file in one response.
 */
export async function downloadAsset(asset: Pick<Asset, "id" | "name" | "mimeType" | "sizeBytes">, onProgress?: (fraction: number) => void): Promise<void> {
  const url = fileUrl(asset.id);
  const filename = `${asset.name.replace(/[\\/:*?"<>|]/g, "_")}${EXT[asset.mimeType] ?? ""}`;
  const save = (href: string) => {
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  if (asset.sizeBytes <= SMALL) return save(`${url}?download=1`);
  try {
    const parts: Blob[] = [];
    for (let start = 0; start < asset.sizeBytes; ) {
      const end = Math.min(asset.sizeBytes, start + STEP) - 1;
      const res = await fetch(url, { headers: { Range: `bytes=${start}-${end}` } });
      if (res.status !== 206 && res.status !== 200) throw new Error(`Download failed (${res.status})`);
      const blob = await res.blob();
      if (res.status === 200) {
        parts.length = 0;
        parts.push(blob);
        break;
      }
      if (!blob.size) throw new Error("Download returned no data");
      parts.push(blob);
      start += blob.size; // the server may return fewer bytes than asked; continue from what arrived
      onProgress?.(Math.min(1, start / asset.sizeBytes));
    }
    const objectUrl = URL.createObjectURL(new Blob(parts, { type: asset.mimeType }));
    save(objectUrl);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch (err) {
    // Storage that redirects to another origin (S3) cannot be range-fetched from the page; fall back to a plain link.
    if (err instanceof TypeError) return save(`${url}?download=1`);
    throw err;
  }
}

export function DownloadButton({ asset, className, label = "Download" }: { asset: Pick<Asset, "id" | "name" | "mimeType" | "sizeBytes">; className?: string; label?: string }) {
  const toast = useToast();
  const [progress, setProgress] = useState<number | null>(null);
  return (
    <button
      type="button"
      disabled={progress !== null}
      onClick={async () => {
        setProgress(0);
        try {
          await downloadAsset(asset, setProgress);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Download failed");
        } finally {
          setProgress(null);
        }
      }}
      className={cn("inline-flex h-10 items-center gap-2 rounded-xl bg-white px-3 text-[13px] font-semibold text-navy-900 ring-1 ring-inset ring-line hover:bg-brand-100 disabled:opacity-60 md:h-9", className)}
    >
      <Download className="size-3.5" /> {progress !== null && asset.sizeBytes > SMALL ? `${Math.round(progress * 100)}%` : label}
    </button>
  );
}
