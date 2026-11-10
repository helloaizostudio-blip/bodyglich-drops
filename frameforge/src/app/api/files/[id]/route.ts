import { Readable } from "node:stream";
import type { NextRequest } from "next/server";
import { getCtx } from "@/server/auth";
import { getAsset } from "@/server/services/assets";
import { storage } from "@/server/storage";

export const runtime = "nodejs";

/** Serves a library asset to the signed-in studio. Supports HTTP range requests for video/audio seeking. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCtx();
  if (!ctx) return new Response("Signed out", { status: 401 });
  const { id } = await params;
  const asset = await getAsset(ctx, id);
  if (!asset) return new Response("Not found", { status: 404 });

  const download = req.nextUrl.searchParams.get("download") === "1";
  const safeName = asset.name.replace(/[^\w.\- ]/g, "_");
  const driver = storage();

  const direct = await driver.directUrl(asset.storageKey, { mimeType: asset.mimeType, downloadName: download ? safeName : undefined });
  if (direct) return Response.redirect(direct, 302);

  const stat = await driver.stat(asset.storageKey);
  if (!stat) return new Response("File is missing from storage", { status: 404 });

  const headers = new Headers({
    "Content-Type": asset.mimeType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  });
  if (download) headers.set("Content-Disposition", `attachment; filename="${safeName}"`);

  const range = req.headers.get("range");
  const match = range ? /^bytes=(\d*)-(\d*)$/.exec(range) : null;
  if (match && (match[1] || match[2])) {
    let start = match[1] ? Number(match[1]) : Math.max(0, stat.size - Number(match[2]));
    let end = match[1] && match[2] ? Number(match[2]) : stat.size - 1;
    end = Math.min(end, stat.size - 1);
    if (start > end || start >= stat.size) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${stat.size}` } });
    }
    start = Math.max(0, start);
    headers.set("Content-Range", `bytes ${start}-${end}/${stat.size}`);
    headers.set("Content-Length", String(end - start + 1));
    const stream = await driver.read(asset.storageKey, { start, end });
    return new Response(Readable.toWeb(stream) as ReadableStream, { status: 206, headers });
  }

  headers.set("Content-Length", String(stat.size));
  const stream = await driver.read(asset.storageKey);
  return new Response(Readable.toWeb(stream) as ReadableStream, { status: 200, headers });
}
