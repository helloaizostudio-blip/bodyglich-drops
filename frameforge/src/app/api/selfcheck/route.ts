import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { getDb, databaseMode } from "@/db";
import { getCtx, hasAnyUser } from "@/server/auth";
import { storage, storageMode } from "@/server/storage";
import { ffmpegStatus } from "@/server/services/render";
import { secretSource } from "@/server/secret";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * System self-check: proves on the real host that the database accepts writes and that file
 * storage can store, range-read and delete a multi-part object. Nothing it creates is kept.
 *
 * Allowed for the signed-in owner, or — before the studio has an owner — with the one-time setup code.
 * `?stream=<MB>` instead returns that many megabytes, to verify large streamed responses on this host.
 */
export async function GET(req: NextRequest) {
  const ctx = await getCtx();
  if (!ctx) {
    const code = process.env.SETUP_CODE?.trim();
    const given = req.nextUrl.searchParams.get("code") ?? "";
    const ok = !!code && given.length === code.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(code));
    if (!ok || (await hasAnyUser())) return Response.json({ error: "Not allowed" }, { status: 403 });
  }

  const streamMb = Math.min(18, Math.max(0, Number(req.nextUrl.searchParams.get("stream")) || 0));
  if (streamMb > 0) {
    const chunk = new Uint8Array(1024 * 1024).fill(65);
    let sent = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent >= streamMb) return controller.close();
        sent++;
        controller.enqueue(chunk);
      },
    });
    return new Response(body, { headers: { "Content-Type": "application/octet-stream", "Content-Length": String(streamMb * 1024 * 1024), "Cache-Control": "no-store" } });
  }

  const checks: { name: string; ok: boolean; ms: number; detail: string }[] = [];
  const run = async (name: string, fn: () => Promise<string>) => {
    const t = Date.now();
    try {
      checks.push({ name, ok: true, ms: Date.now() - t, detail: await fn() });
      checks[checks.length - 1].ms = Date.now() - t;
    } catch (err) {
      checks.push({ name, ok: false, ms: Date.now() - t, detail: err instanceof Error ? err.message : String(err) });
    }
  };

  await run("database read", async () => {
    const db = await getDb();
    const res = await db.execute(sql`select count(*)::int as n from information_schema.tables where table_schema = 'public'`);
    const rows = (res as unknown as { rows?: { n: number }[] }).rows ?? (res as unknown as { n: number }[]);
    return `${rows[0]?.n ?? "?"} tables`;
  });

  await run("database write (rolled back)", async () => {
    const db = await getDb();
    let seen = 0;
    await db
      .transaction(async (tx) => {
        await tx.execute(sql`insert into users (id, email, name, password_hash) values (${`selfcheck-${crypto.randomUUID()}`}, ${`selfcheck-${Date.now()}@invalid.example`}, 'selfcheck', 'x')`);
        const res = await tx.execute(sql`select count(*)::int as n from users where name = 'selfcheck'`);
        const rows = (res as unknown as { rows?: { n: number }[] }).rows ?? (res as unknown as { n: number }[]);
        seen = rows[0]?.n ?? 0;
        throw new Error("__rollback__");
      })
      .catch((err) => {
        if (!(err instanceof Error) || err.message !== "__rollback__") throw err;
      });
    if (seen < 1) throw new Error("Inserted row was not visible inside the transaction");
    return "insert + rollback ok";
  });

  await run("file storage round trip", async () => {
    const driver = storage();
    // 5 MB + 123 bytes: spans two parts on chunked storage.
    const size = 5 * 1024 * 1024 + 123;
    const data = crypto.randomBytes(size);
    const key = `selfcheck/${crypto.randomUUID()}.bin`;
    try {
      await driver.put(key, data, "application/octet-stream");
      const stat = await driver.stat(key);
      if (stat?.size !== size) throw new Error(`Stored size is ${stat?.size}, expected ${size}`);
      const start = 4 * 1024 * 1024 - 500;
      const end = 4 * 1024 * 1024 + 499;
      const chunks: Buffer[] = [];
      for await (const c of await driver.read(key, { start, end })) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c as Uint8Array));
      const got = Buffer.concat(chunks);
      if (!got.equals(data.subarray(start, end + 1))) throw new Error("Range read returned different bytes");
    } finally {
      await driver.delete(key).catch(() => {});
    }
    if (await driver.stat(key)) throw new Error("Object still exists after delete");
    return `${size} bytes stored, range-read across a part boundary, deleted`;
  });

  const ffmpeg = await ffmpegStatus();
  return Response.json(
    {
      ok: checks.every((c) => c.ok),
      database: databaseMode(),
      storage: storageMode(),
      secret: secretSource(),
      ffmpeg: ffmpeg.available,
      checks,
    },
    { status: checks.every((c) => c.ok) ? 200 : 500, headers: { "Cache-Control": "no-store" } },
  );
}
