import { Readable } from "node:stream";
import fsp from "node:fs/promises";

/**
 * Chunked object storage on top of a simple key/value blob store.
 *
 * Serverless hosts cap the size of a single request and response, so large media cannot be sent
 * or stored in one piece there. This layer stores every object as fixed-size parts
 * (`<key>/00000`, `<key>/00001`, …) plus a small manifest (`<key>/manifest`), which lets the
 * browser upload a big video in many small requests and lets playback fetch only the byte range
 * it needs. It has no dependency on any vendor SDK, so it can be unit-tested with an in-memory store.
 */
export interface BlobStore {
  set(key: string, data: Uint8Array): Promise<void>;
  /** Returns null when the key does not exist. */
  get(key: string): Promise<Uint8Array | null>;
  delete(key: string): Promise<void>;
  /** Keys that start with the prefix. */
  list(prefix: string): Promise<string[]>;
}

export type Manifest = { size: number; chunkSize: number; parts: number };

const partKey = (key: string, index: number) => `${key}/${String(index).padStart(5, "0")}`;
const manifestKey = (key: string) => `${key}/manifest`;

export class ChunkedStorage {
  constructor(
    private readonly store: BlobStore,
    readonly chunkSize: number,
  ) {}

  partCount(size: number): number {
    return Math.max(1, Math.ceil(size / this.chunkSize));
  }

  /** Stores one uploaded part. Parts may arrive in any order and may be re-sent. */
  async putPart(key: string, index: number, data: Uint8Array): Promise<void> {
    if (!Number.isInteger(index) || index < 0 || index > 99_999) throw new Error("Invalid part number");
    if (data.byteLength > this.chunkSize) throw new Error("Part is larger than the chunk size");
    await this.store.set(partKey(key, index), data);
  }

  /**
   * Verifies that every part of an upload arrived with the right sizes and writes the manifest.
   * Returns null when the upload is incomplete.
   */
  async finalize(key: string, expectedSize: number): Promise<Manifest | null> {
    const parts = this.partCount(expectedSize);
    const keys = new Set(await this.store.list(`${key}/`));
    for (let i = 0; i < parts; i++) if (!keys.has(partKey(key, i))) return null;
    // Only the last part's length is not implied by the chunk size, so check that one.
    const last = await this.store.get(partKey(key, parts - 1));
    const lastExpected = expectedSize - (parts - 1) * this.chunkSize;
    if (!last || last.byteLength !== lastExpected) return null;
    const manifest: Manifest = { size: expectedSize, chunkSize: this.chunkSize, parts };
    await this.store.set(manifestKey(key), new TextEncoder().encode(JSON.stringify(manifest)));
    return manifest;
  }

  async manifest(key: string): Promise<Manifest | null> {
    const raw = await this.store.get(manifestKey(key));
    if (!raw) return null;
    try {
      const m = JSON.parse(new TextDecoder().decode(raw)) as Manifest;
      return Number.isFinite(m.size) && m.chunkSize > 0 && m.parts > 0 ? m : null;
    } catch {
      return null;
    }
  }

  /** Stores a whole buffer (server-generated files such as AI images or voiceovers). */
  async put(key: string, data: Uint8Array): Promise<void> {
    const parts = this.partCount(data.byteLength);
    for (let i = 0; i < parts; i++) {
      await this.store.set(partKey(key, i), data.subarray(i * this.chunkSize, Math.min(data.byteLength, (i + 1) * this.chunkSize)));
    }
    const manifest: Manifest = { size: data.byteLength, chunkSize: this.chunkSize, parts };
    await this.store.set(manifestKey(key), new TextEncoder().encode(JSON.stringify(manifest)));
  }

  /** Streams the object, or an inclusive byte range of it, fetching only the parts it needs. */
  async read(key: string, range?: { start: number; end: number }): Promise<Readable> {
    const m = await this.manifest(key);
    if (!m) throw new Error("File is missing from storage");
    const start = range ? Math.max(0, range.start) : 0;
    const end = range ? Math.min(m.size - 1, range.end) : m.size - 1;
    const store = this.store;
    async function* generate() {
      if (m!.size === 0 || start > end) return;
      const first = Math.floor(start / m!.chunkSize);
      const lastPart = Math.floor(end / m!.chunkSize);
      for (let i = first; i <= lastPart; i++) {
        const part = await store.get(partKey(key, i));
        if (!part) throw new Error("A part of the file is missing from storage");
        const offset = i * m!.chunkSize;
        const from = Math.max(0, start - offset);
        const to = Math.min(part.byteLength, end - offset + 1);
        yield Buffer.from(part.buffer, part.byteOffset + from, to - from);
      }
    }
    return Readable.from(generate());
  }

  async delete(key: string): Promise<void> {
    for (const k of await this.store.list(`${key}/`)) await this.store.delete(k);
  }

  async downloadTo(key: string, filePath: string): Promise<void> {
    await fsp.writeFile(filePath, await this.read(key));
  }
}
