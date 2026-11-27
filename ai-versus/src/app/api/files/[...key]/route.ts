import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { fail } from "@/lib/api";
import { getStore, guessType } from "@/lib/store";

export const runtime = "nodejs";

/** Serve stored media (with HTTP range support so videos can seek). ?download=1 forces a download. */
export async function GET(req: Request, ctx: { params: Promise<{ key: string[] }> }) {
  try {
    const { key } = await ctx.params;
    const k = key.map(decodeURIComponent).join("/");
    if (!/^(projects|characters)\//.test(k)) return fail("forbidden", 403);
    const file = await getStore().localPath(k);
    const stat = fs.statSync(file);
    const type = guessType(k);
    const url = new URL(req.url);
    const headers: Record<string, string> = { "content-type": type, "accept-ranges": "bytes", "cache-control": "private, max-age=60" };
    if (url.searchParams.get("download")) headers["content-disposition"] = `attachment; filename="${url.searchParams.get("name") || path.basename(k)}"`;
    const range = req.headers.get("range");
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      const start = m?.[1] ? parseInt(m[1]) : 0;
      const end = m?.[2] ? parseInt(m[2]) : stat.size - 1;
      if (start >= stat.size || end >= stat.size || start > end) return new Response(null, { status: 416, headers: { "content-range": `bytes */${stat.size}` } });
      const stream = fs.createReadStream(file, { start, end });
      return new Response(Readable.toWeb(stream) as ReadableStream, {
        status: 206,
        headers: { ...headers, "content-range": `bytes ${start}-${end}/${stat.size}`, "content-length": String(end - start + 1) },
      });
    }
    return new Response(Readable.toWeb(fs.createReadStream(file)) as ReadableStream, { headers: { ...headers, "content-length": String(stat.size) } });
  } catch (e) {
    return fail(e, 404);
  }
}
