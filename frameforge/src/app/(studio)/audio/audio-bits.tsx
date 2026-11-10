"use client";

import { cn, fileUrl } from "@/lib/utils";

/** Compact native audio player. Nothing is downloaded until the user presses play. */
export function MiniAudio({ assetId, label, className }: { assetId: string; label: string; className?: string }) {
  return <audio src={fileUrl(assetId)} controls preload="none" aria-label={label} className={cn("h-10 w-full min-w-0", className)} />;
}
