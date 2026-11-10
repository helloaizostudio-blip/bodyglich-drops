import "server-only";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { dataDir } from "@/db";
import { sign } from "@/server/secret";
import { ChunkedStorage, type BlobStore } from "./chunked";
import { netlifyBlobStore } from "./netlify";

/**
 * File storage adapter. Media never lives in the database or in browser storage:
 *  - "local": files on the server disk under DATA_DIR/storage (dev, or any host with a persistent volume)
 *  - "s3": any S3-compatible bucket (AWS S3, Cloudflare R2, Supabase Storage, Backblaze B2, MinIO)
 *  - "netlify": Netlify Blobs, with files stored and uploaded in small parts (serverless size limits)
 */
export type UploadTicket = {
  url: string;
  method: "PUT";
  headers: Record<string, string>;
  /** When set, the browser must upload the file in parts of this many bytes (`&part=<n>` on the URL). */
  chunkSize?: number;
};

export interface StorageDriver {
  readonly id: "local" | "s3" | "netlify";
  /** Largest body this driver can send in one HTTP response (serverless hosts), if limited. */
  readonly maxResponseBytes?: number;
  /** Where the browser should PUT the file bytes. */
  createUpload(key: string, mimeType: string, sizeBytes: number): Promise<UploadTicket>;
  put(key: string, data: Buffer, mimeType: string): Promise<void>;
  stat(key: string): Promise<{ size: number } | null>;
  delete(key: string): Promise<void>;
  /** A short-lived direct URL, or null when the app must stream the file itself. */
  directUrl(key: string, opts: { mimeType: string; downloadName?: string }): Promise<string | null>;
  /** Stream (optionally a byte range) of the object. */
  read(key: string, range?: { start: number; end: number }): Promise<Readable>;
  /** Copies the object to a local file (used by the renderer and by provider uploads). */
  downloadTo(key: string, filePath: string): Promise<void>;
}

const safeKey = (key: string) => {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9/_.-]*$/.test(key) || key.includes("..")) throw new Error("Invalid storage key");
  return key;
};

export function localStorageRoot(): string {
  return path.resolve(/*turbopackIgnore: true*/ process.env.STORAGE_DIR || path.join(dataDir(), "storage"));
}

class LocalDriver implements StorageDriver {
  readonly id = "local" as const;
  private file(key: string) {
    return path.join(localStorageRoot(), safeKey(key));
  }
  async createUpload(key: string, _mime: string, sizeBytes: number): Promise<UploadTicket> {
    const exp = Date.now() + 60 * 60_000;
    const sig = sign(`upload:${key}:${sizeBytes}:${exp}`);
    const qs = new URLSearchParams({ key, size: String(sizeBytes), exp: String(exp), sig });
    return { url: `/api/storage/upload?${qs}`, method: "PUT", headers: {} };
  }
  async put(key: string, data: Buffer) {
    const file = this.file(key);
    await fsp.mkdir(path.dirname(file), { recursive: true });
    await fsp.writeFile(file, data);
  }
  async stat(key: string) {
    try {
      const s = await fsp.stat(this.file(key));
      return { size: s.size };
    } catch {
      return null;
    }
  }
  async delete(key: string) {
    await fsp.rm(this.file(key), { force: true });
  }
  async directUrl() {
    return null;
  }
  async read(key: string, range?: { start: number; end: number }) {
    return fs.createReadStream(this.file(key), range);
  }
  async downloadTo(key: string, filePath: string) {
    await fsp.copyFile(this.file(key), filePath);
  }
  /** Local-only: target path for streamed uploads. */
  async prepareWrite(key: string) {
    const file = this.file(key);
    await fsp.mkdir(path.dirname(file), { recursive: true });
    return file;
  }
}

class S3Driver implements StorageDriver {
  readonly id = "s3" as const;
  private bucket = process.env.S3_BUCKET!;
  private clientPromise?: Promise<import("@aws-sdk/client-s3").S3Client>;
  private client() {
    this.clientPromise ??= import("@aws-sdk/client-s3").then(
      ({ S3Client }) =>
        new S3Client({
          region: process.env.S3_REGION || "auto",
          endpoint: process.env.S3_ENDPOINT || undefined,
          forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "1",
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID!,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
          },
        }),
    );
    return this.clientPromise;
  }
  async createUpload(key: string, mimeType: string): Promise<UploadTicket> {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    const url = await getSignedUrl(
      await this.client(),
      new PutObjectCommand({ Bucket: this.bucket, Key: safeKey(key), ContentType: mimeType }),
      { expiresIn: 3600 },
    );
    return { url, method: "PUT", headers: { "Content-Type": mimeType } };
  }
  async put(key: string, data: Buffer, mimeType: string) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    await (await this.client()).send(
      new PutObjectCommand({ Bucket: this.bucket, Key: safeKey(key), Body: data, ContentType: mimeType }),
    );
  }
  async stat(key: string) {
    const { HeadObjectCommand } = await import("@aws-sdk/client-s3");
    try {
      const head = await (await this.client()).send(new HeadObjectCommand({ Bucket: this.bucket, Key: safeKey(key) }));
      return { size: head.ContentLength ?? 0 };
    } catch {
      return null;
    }
  }
  async delete(key: string) {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    await (await this.client()).send(new DeleteObjectCommand({ Bucket: this.bucket, Key: safeKey(key) }));
  }
  async directUrl(key: string, opts: { mimeType: string; downloadName?: string }) {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    return getSignedUrl(
      await this.client(),
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: safeKey(key),
        ResponseContentType: opts.mimeType,
        ResponseContentDisposition: opts.downloadName
          ? `attachment; filename="${opts.downloadName.replace(/[^\w.\- ]/g, "_")}"`
          : undefined,
      }),
      { expiresIn: 3600 },
    );
  }
  async read(key: string, range?: { start: number; end: number }) {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const res = await (await this.client()).send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: safeKey(key),
        Range: range ? `bytes=${range.start}-${range.end}` : undefined,
      }),
    );
    return res.Body as Readable;
  }
  async downloadTo(key: string, filePath: string) {
    const stream = await this.read(key);
    await fsp.writeFile(filePath, stream);
  }
}

/** Parts of 4 MB stay under Netlify's ~4.5 MB limit for binary request bodies. */
const NETLIFY_CHUNK_BYTES = 4 * 1024 * 1024;

/** Filesystem-backed blob store. Only used to exercise the chunked code path in local tests. */
function diskBlobStore(): BlobStore {
  const root = path.join(dataDir(), "chunked-storage");
  const file = (key: string) => path.join(root, safeKey(key));
  return {
    async set(key, data) {
      await fsp.mkdir(path.dirname(file(key)), { recursive: true });
      await fsp.writeFile(file(key), data);
    },
    async get(key) {
      try {
        return new Uint8Array(await fsp.readFile(file(key)));
      } catch {
        return null;
      }
    },
    async delete(key) {
      await fsp.rm(file(key), { force: true });
    },
    async list(prefix) {
      const dir = path.dirname(file(`${prefix}x`));
      try {
        return (await fsp.readdir(dir)).map((name) => `${prefix}${name}`);
      } catch {
        return [];
      }
    },
  };
}

/**
 * Chunked driver: every object is stored in parts so uploads and playback fit serverless limits.
 * Backed by Netlify Blobs in production ("netlify"); "chunked-test" backs it with local files.
 */
class NetlifyDriver implements StorageDriver {
  readonly id = "netlify" as const;
  /** Netlify streams at most 20 MB per response; stay well below it. */
  readonly maxResponseBytes = 8 * 1024 * 1024;
  readonly chunks: ChunkedStorage;
  constructor(store: BlobStore) {
    this.chunks = new ChunkedStorage(store, NETLIFY_CHUNK_BYTES);
  }

  async createUpload(key: string, _mime: string, sizeBytes: number): Promise<UploadTicket> {
    const exp = Date.now() + 6 * 60 * 60_000;
    const sig = sign(`upload:${safeKey(key)}:${sizeBytes}:${exp}`);
    const qs = new URLSearchParams({ key, size: String(sizeBytes), exp: String(exp), sig });
    return { url: `/api/storage/upload?${qs}`, method: "PUT", headers: {}, chunkSize: NETLIFY_CHUNK_BYTES };
  }
  async put(key: string, data: Buffer) {
    await this.chunks.put(safeKey(key), data);
  }
  async stat(key: string) {
    const m = await this.chunks.manifest(safeKey(key));
    return m ? { size: m.size } : null;
  }
  async delete(key: string) {
    await this.chunks.delete(safeKey(key));
  }
  async directUrl() {
    return null;
  }
  async read(key: string, range?: { start: number; end: number }) {
    return this.chunks.read(safeKey(key), range);
  }
  async downloadTo(key: string, filePath: string) {
    await this.chunks.downloadTo(safeKey(key), filePath);
  }
}

export function storageMode(): "local" | "s3" | "netlify" {
  const explicit = process.env.STORAGE_DRIVER;
  if (explicit === "chunked-test") return "netlify";
  if (explicit === "s3" || explicit === "local" || explicit === "netlify") return explicit;
  if (process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY) return "s3";
  // On Netlify there is no persistent disk, so Netlify Blobs is the default there.
  return process.env.NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT || process.env.NETLIFY_DB_URL ? "netlify" : "local";
}

let driver: StorageDriver | undefined;
export function storage(): StorageDriver {
  if (!driver) {
    const mode = storageMode();
    const blobs = process.env.STORAGE_DRIVER === "chunked-test" ? diskBlobStore() : netlifyBlobStore();
    driver = mode === "s3" ? new S3Driver() : mode === "netlify" ? new NetlifyDriver(blobs) : new LocalDriver();
  }
  return driver;
}

/** The chunked layer when the active driver stores files in parts, otherwise null. */
export function chunkedDriver(): ChunkedStorage | null {
  const d = storage();
  return d instanceof NetlifyDriver ? d.chunks : null;
}

export function localDriver(): LocalDriver | null {
  const d = storage();
  return d instanceof LocalDriver ? d : null;
}

export function maxUploadBytes(): number {
  const mb = Number(process.env.MAX_UPLOAD_MB || 1024);
  return (Number.isFinite(mb) && mb > 0 ? mb : 1024) * 1024 * 1024;
}
