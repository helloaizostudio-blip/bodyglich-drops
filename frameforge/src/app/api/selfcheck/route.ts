import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { getDb, databaseMode } from "@/db";
import { getCtx, hasAnyUser } from "@/server/auth";
import { chunkedDriver, storage, storageMode } from "@/server/storage";
import { ffmpegStatus } from "@/server/services/render";
import { secretSource } from "@/server/secret";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * System self-check: proves on the real host that the database accepts writes and that file
 * storage can store, range-read and delete a multi-part object. Nothing it creates is kept.
 *
 * Allowed for the signed-in owner, or — before the studio has an owner — with the one-time setup code.
 * `?stream=<MB>` instead returns that many megabytes, to verify large streamed responses on this host.
 */
async function allowed(req: NextRequest): Promise<boolean> {
  if (await getCtx()) return true;
  const code = process.env.SETUP_CODE?.trim();
  const given = req.nextUrl.searchParams.get("code") ?? "";
  const ok = !!code && given.length === code.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(code));
  return ok && !(await hasAnyUser());
}

/** Upload-size probe: accepts a request body and reports how many bytes arrived intact (nothing is stored). */
export async function PUT(req: NextRequest) {
  if (!(await allowed(req))) return Response.json({ error: "Not allowed" }, { status: 403 });
  const data = Buffer.from(await req.arrayBuffer());
  return Response.json({ bytes: data.length, sha256: crypto.createHash("sha256").update(data).digest("hex") }, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(req: NextRequest) {
  if (!(await allowed(req))) return Response.json({ error: "Not allowed" }, { status: 403 });

  // `?sleep=<seconds>` waits that long before answering, to measure this host's request time limit.
  const sleep = Math.min(120, Math.max(0, Number(req.nextUrl.searchParams.get("sleep")) || 0));
  if (sleep > 0) {
    await new Promise((r) => setTimeout(r, sleep * 1000));
    return Response.json({ sleptSeconds: sleep }, { headers: { "Cache-Control": "no-store" } });
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
  // `?only=db-read,db-write,storage,ffmpeg` limits the run; every check has its own time limit so a
  // hanging dependency is reported instead of taking the whole request down.
  const only = (req.nextUrl.searchParams.get("only") ?? "").split(",").filter(Boolean);
  const run = async (id: string, name: string, fn: () => Promise<string>, limitMs = 12_000) => {
    if (only.length && !only.includes(id)) return;
    const t = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const detail = await Promise.race([
        fn(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error(`Timed out after ${limitMs / 1000}s`)), limitMs);
        }),
      ]);
      checks.push({ name, ok: true, ms: Date.now() - t, detail });
    } catch (err) {
      checks.push({ name, ok: false, ms: Date.now() - t, detail: err instanceof Error ? err.message : String(err) });
    } finally {
      clearTimeout(timer);
    }
  };

  await run("db-read", "database read", async () => {
    const db = await getDb();
    const res = await db.execute(sql`select count(*)::int as n from information_schema.tables where table_schema = 'public'`);
    const rows = (res as unknown as { rows?: { n: number }[] }).rows ?? (res as unknown as { n: number }[]);
    return `${rows[0]?.n ?? "?"} tables`;
  });

  await run("db-write", "database write (rolled back)", async () => {
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

  // File storage round trip, one step at a time so a failure names the exact operation.
  {
    const driver = storage();
    // 5 MB + 123 bytes: spans two parts on chunked storage.
    const size = 5 * 1024 * 1024 + 123;
    const data = crypto.randomBytes(size);
    const key = `selfcheck/${crypto.randomUUID()}.bin`;
    const start = 4 * 1024 * 1024 - 500;
    const end = 4 * 1024 * 1024 + 499;
    await run("storage", "storage: write 5 MB object", async () => (await driver.put(key, data, "application/octet-stream"), "ok"), 20_000);
    await run("storage", "storage: stat", async () => {
      const stat = await driver.stat(key);
      if (stat?.size !== size) throw new Error(`Stored size is ${stat?.size}, expected ${size}`);
      return `${stat.size} bytes`;
    });
    await run("storage", "storage: range read across a part boundary", async () => {
      const chunks: Buffer[] = [];
      for await (const c of await driver.read(key, { start, end })) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c as Uint8Array));
      if (!Buffer.concat(chunks).equals(data.subarray(start, end + 1))) throw new Error("Range read returned different bytes");
      return "bytes identical";
    });
    await run("storage", "storage: delete", async () => {
      await driver.delete(key);
      if (await driver.stat(key)) throw new Error("Object still exists after delete");
      return "ok";
    });
  }

  // Step-by-step probe of the raw blob store (diagnostics for hosts with chunked storage).
  const blobs = chunkedDriver();
  if (blobs && only.includes("blob-steps")) {
    const store = blobs.rawStore();
    const key = `selfcheck/steps-${crypto.randomUUID()}`;
    const small = new TextEncoder().encode("hello");
    const big = crypto.randomBytes(Number(req.nextUrl.searchParams.get("kb") ?? 512) * 1024);
    await run("blob-steps", "blob: set 5 bytes", async () => (await store.set(`${key}/a`, small), "ok"), 8_000);
    await run("blob-steps", "blob: get 5 bytes", async () => `${(await store.get(`${key}/a`))?.byteLength ?? "null"} bytes`, 8_000);
    await run("blob-steps", "blob: list prefix", async () => `${(await store.list(`${key}/`)).length} keys`, 8_000);
    await run("blob-steps", `blob: set ${big.byteLength} bytes`, async () => (await store.set(`${key}/b`, big), "ok"), 20_000);
    await run("blob-steps", `blob: get ${big.byteLength} bytes`, async () => `${(await store.get(`${key}/b`))?.byteLength ?? "null"} bytes`, 20_000);
    await run("blob-steps", "blob: delete", async () => (await store.delete(`${key}/a`), await store.delete(`${key}/b`), "ok"), 8_000);
    await run("blob-steps", "blob: list after delete", async () => `${(await store.list(`${key}/`)).length} keys`, 8_000);
    await run("blob-steps", "blob: list dotted prefix", async () => `${(await store.list(`selfcheck/x.bin/`)).length} keys`, 8_000);
  }

  let ffmpeg: boolean | null = null;
  await run("ffmpeg", "ffmpeg probe (optional)", async () => {
    ffmpeg = (await ffmpegStatus()).available;
    return ffmpeg ? "available" : "not installed on this host — video rendering is unavailable";
  }, 6_000);
  return Response.json(
    {
      ok: checks.every((c) => c.ok),
      database: databaseMode(),
      storage: storageMode(),
      secret: secretSource(),
      ffmpeg,
      checks,
    },
    { status: checks.every((c) => c.ok) ? 200 : 500, headers: { "Cache-Control": "no-store" } },
  );
}
