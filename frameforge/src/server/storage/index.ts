import "server-only";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { dataDir } from "@/db";
import { sign } from "@/server/secret";

/**
 * File storage adapter. Media never lives in the database or in browser storage:
 *  - "local": files on the server disk under DATA_DIR/storage (dev, or any host with a persistent volume)
 *  - "s3": any S3-compatible bucket (AWS S3, Cloudflare R2, Supabase Storage, Backblaze B2, MinIO)
 */
export type UploadTicket = { url: string; method: "PUT"; headers: Record<string, string> };

export interface StorageDriver {
  readonly id: "local" | "s3";
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

export function storageMode(): "local" | "s3" {
  const explicit = process.env.STORAGE_DRIVER;
  if (explicit === "s3" || explicit === "local") return explicit;
  return process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY ? "s3" : "local";
}

let driver: StorageDriver | undefined;
export function storage(): StorageDriver {
  driver ??= storageMode() === "s3" ? new S3Driver() : new LocalDriver();
  return driver;
}

export function localDriver(): LocalDriver | null {
  const d = storage();
  return d instanceof LocalDriver ? d : null;
}

export function maxUploadBytes(): number {
  const mb = Number(process.env.MAX_UPLOAD_MB || 1024);
  return (Number.isFinite(mb) && mb > 0 ? mb : 1024) * 1024 * 1024;
}
