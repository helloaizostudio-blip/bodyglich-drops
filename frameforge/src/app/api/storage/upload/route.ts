import fs from "node:fs";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { NextRequest } from "next/server";
import { getCtx } from "@/server/auth";
import { verifySignature } from "@/server/secret";
import { localDriver } from "@/server/storage";

export const runtime = "nodejs";

/** Receives file bytes for the local storage driver. Streams straight to disk. */
export async function PUT(req: NextRequest) {
  const ctx = await getCtx();
  if (!ctx) return Response.json({ error: "Signed out" }, { status: 401 });
  const driver = localDriver();
  if (!driver) return Response.json({ error: "Local uploads are disabled" }, { status: 400 });

  const p = req.nextUrl.searchParams;
  const key = p.get("key") ?? "";
  const size = Number(p.get("size"));
  const exp = Number(p.get("exp"));
  const sig = p.get("sig") ?? "";
  if (!key.startsWith(`${ctx.project.id}/`) || !verifySignature(`upload:${key}:${size}:${exp}`, sig) || exp < Date.now()) {
    return Response.json({ error: "Upload link is invalid or expired" }, { status: 403 });
  }
  if (!req.body) return Response.json({ error: "Empty upload" }, { status: 400 });

  const file = await driver.prepareWrite(key);
  let received = 0;
  const limiter = new Transform({
    transform(chunk: Buffer, _enc, cb) {
      received += chunk.length;
      if (received > size) cb(new Error("Upload is larger than declared"));
      else cb(null, chunk);
    },
  });
  try {
    await pipeline(Readable.fromWeb(req.body as import("node:stream/web").ReadableStream), limiter, fs.createWriteStream(file));
  } catch (err) {
    await fs.promises.rm(file, { force: true });
    console.error("[upload failed]", err);
    return Response.json({ error: "Upload failed" }, { status: 400 });
  }
  if (received !== size) {
    await fs.promises.rm(file, { force: true });
    return Response.json({ error: "Upload was incomplete" }, { status: 400 });
  }
  return Response.json({ ok: true });
}
