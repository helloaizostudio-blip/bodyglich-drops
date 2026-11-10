"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import type { Asset, AssetCategory, AssetKind } from "@/db/schema";
import { beginUpload, completeUpload } from "@/server/actions/assets";
import { ACCEPT_BY_KIND, ASSET_CATEGORY_KINDS } from "@/lib/constants";
import { cn, kindFromMime } from "@/lib/utils";
import { useToast } from "./toast";
import { Button } from "./button";

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  flac: "audio/flac",
  weba: "audio/webm",
};

function resolveMime(file: File): string {
  if (file.type && file.type !== "application/octet-stream") return file.type === "audio/mp3" ? "audio/mpeg" : file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? "";
}

/** Reads dimensions / duration in the browser so the library can show them without server-side probing. */
async function probe(file: File, kind: AssetKind): Promise<{ width?: number; height?: number; durationSec?: number }> {
  const url = URL.createObjectURL(file);
  try {
    if (kind === "image") {
      return await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth || undefined, height: img.naturalHeight || undefined });
        img.onerror = () => resolve({});
        img.src = url;
      });
    }
    if (kind === "video" || kind === "audio") {
      return await new Promise((resolve) => {
        const el = document.createElement(kind);
        const done = (v: { width?: number; height?: number; durationSec?: number }) => resolve(v);
        const timer = setTimeout(() => done({}), 6000);
        el.preload = "metadata";
        el.onloadedmetadata = () => {
          clearTimeout(timer);
          const d = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : undefined;
          const v = el as HTMLVideoElement;
          done({ durationSec: d, width: v.videoWidth || undefined, height: v.videoHeight || undefined });
        };
        el.onerror = () => {
          clearTimeout(timer);
          done({});
        };
        el.src = url;
      });
    }
    return {};
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

function putWithProgress(url: string, headers: Record<string, string>, file: Blob, onProgress: (f: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });
}

/** Uploads a file as numbered parts (hosts that limit request size). Each part is retried a few times. */
async function putInParts(url: string, headers: Record<string, string>, file: File, chunkSize: number, onProgress: (f: number) => void): Promise<void> {
  const parts = Math.max(1, Math.ceil(file.size / chunkSize));
  for (let i = 0; i < parts; i++) {
    const blob = file.slice(i * chunkSize, Math.min(file.size, (i + 1) * chunkSize));
    let attempt = 0;
    for (;;) {
      try {
        await putWithProgress(`${url}&part=${i}`, headers, blob, (f) => onProgress((i * chunkSize + f * blob.size) / Math.max(file.size, 1)));
        break;
      } catch (err) {
        if (++attempt >= 3) throw err;
        await new Promise((r) => setTimeout(r, 800 * attempt));
      }
    }
  }
  onProgress(1);
}

export type UploadOptions = { category: AssetCategory; episodeId?: string; sceneId?: string; name?: string };

export async function uploadFile(file: File, opts: UploadOptions, onProgress: (fraction: number) => void = () => {}): Promise<Asset> {
  const mimeType = resolveMime(file);
  if (!mimeType) throw new Error(`“${file.name}” is not a supported image, video or audio file.`);
  const kind = kindFromMime(mimeType);
  const name = (opts.name ?? file.name.replace(/\.[^.]+$/, "")).slice(0, 120) || "Untitled";
  const begin = await beginUpload({ name, mimeType, sizeBytes: file.size, category: opts.category });
  if (!begin.ok) throw new Error(begin.error);
  const { ticket } = begin.data;
  const send = ticket.chunkSize ? putInParts(ticket.url, ticket.headers, file, ticket.chunkSize, onProgress) : putWithProgress(ticket.url, ticket.headers, file, onProgress);
  const [meta] = await Promise.all([probe(file, kind), send]);
  const done = await completeUpload({
    key: begin.data.key,
    name,
    mimeType,
    sizeBytes: file.size,
    category: opts.category,
    width: meta.width,
    height: meta.height,
    durationSec: meta.durationSec,
    episodeId: opts.episodeId,
    sceneId: opts.sceneId,
  });
  if (!done.ok) throw new Error(done.error);
  return done.data;
}

export type UploadState = { active: boolean; fileName: string; index: number; total: number; fraction: number };

/** Hook that uploads one or more files sequentially with progress + error toasts. */
export function useUploader() {
  const toast = useToast();
  const [state, setState] = useState<UploadState>({ active: false, fileName: "", index: 0, total: 0, fraction: 0 });

  const upload = useCallback(
    async (files: File[], opts: UploadOptions): Promise<Asset[]> => {
      const out: Asset[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setState({ active: true, fileName: file.name, index: i + 1, total: files.length, fraction: 0 });
        try {
          out.push(await uploadFile(file, opts, (fraction) => setState((s) => ({ ...s, fraction }))));
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Upload failed");
        }
      }
      setState((s) => ({ ...s, active: false }));
      return out;
    },
    [toast],
  );
  return { upload, state };
}

export function acceptFor(category: AssetCategory): string {
  return ASSET_CATEGORY_KINDS[category].map((k) => ACCEPT_BY_KIND[k]).join(",");
}

export function UploadProgress({ state }: { state: UploadState }) {
  if (!state.active) return null;
  return (
    <div className="rounded-2xl bg-brand-100 px-4 py-3" role="status">
      <div className="flex items-center justify-between gap-3 text-[13px] font-semibold text-navy-800">
        <span className="truncate">
          Uploading {state.total > 1 ? `${state.index}/${state.total}: ` : ""}
          {state.fileName}
        </span>
        <span className="tabular-nums">{Math.round(state.fraction * 100)}%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
        <div className="h-full rounded-full bg-brand-500 transition-[width]" style={{ width: `${Math.round(state.fraction * 100)}%` }} />
      </div>
    </div>
  );
}

/** Button that opens the device file picker (camera roll / files on Android) and uploads the selection. */
export function UploadButton({
  category,
  onUploaded,
  multiple = true,
  episodeId,
  sceneId,
  children = "Upload",
  variant = "primary",
  size = "md",
  className,
  accept,
}: {
  category: AssetCategory;
  onUploaded?: (assets: Asset[]) => void;
  multiple?: boolean;
  episodeId?: string;
  sceneId?: string;
  children?: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "navy";
  size?: "sm" | "md" | "lg";
  className?: string;
  accept?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const { upload, state } = useUploader();
  const toast = useToast();
  return (
    <>
      <input
        ref={input}
        type="file"
        hidden
        multiple={multiple}
        accept={accept ?? acceptFor(category)}
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (!files.length) return;
          const done = await upload(files, { category, episodeId, sceneId });
          if (done.length) {
            toast.success(done.length === 1 ? `Uploaded “${done[0].name}”` : `Uploaded ${done.length} files`);
            onUploaded?.(done);
          }
        }}
      />
      <Button
        variant={variant}
        size={size}
        className={className}
        loading={state.active}
        icon={<UploadCloud className="size-4" />}
        onClick={() => input.current?.click()}
      >
        {state.active ? `${Math.round(state.fraction * 100)}%` : children}
      </Button>
    </>
  );
}

/** Large drop target (drag & drop on desktop, tap to browse on phones). */
export function Dropzone({
  category,
  onUploaded,
  title = "Upload files",
  hint,
  className,
  episodeId,
  sceneId,
  multiple = true,
}: {
  category: AssetCategory;
  onUploaded?: (assets: Asset[]) => void;
  title?: string;
  hint?: string;
  className?: string;
  episodeId?: string;
  sceneId?: string;
  multiple?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const { upload, state } = useUploader();
  const toast = useToast();

  const handle = async (files: File[]) => {
    if (!files.length) return;
    const done = await upload(multiple ? files : files.slice(0, 1), { category, episodeId, sceneId });
    if (done.length) {
      toast.success(done.length === 1 ? `Uploaded “${done[0].name}”` : `Uploaded ${done.length} files`);
      onUploaded?.(done);
    }
  };

  return (
    <div className={className}>
      <input
        ref={input}
        type="file"
        hidden
        multiple={multiple}
        accept={acceptFor(category)}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          void handle(files);
        }}
      />
      <button
        type="button"
        disabled={state.active}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void handle(Array.from(e.dataTransfer.files));
        }}
        className={cn(
          "flex h-full min-h-36 w-full flex-col items-center justify-center gap-1.5 rounded-3xl border-2 border-dashed px-4 py-6 text-center transition-colors",
          over ? "border-brand-500 bg-brand-100" : "border-brand-200 bg-white/70 hover:border-brand-400 hover:bg-brand-50",
        )}
      >
        <UploadCloud className="size-8 text-brand-500" aria-hidden />
        <span className="text-sm font-bold text-navy-900">{title}</span>
        <span className="text-xs text-muted">{hint ?? "Tap to browse, or drag and drop"}</span>
      </button>
      {state.active ? (
        <div className="mt-2">
          <UploadProgress state={state} />
        </div>
      ) : null}
    </div>
  );
}
