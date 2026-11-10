import "server-only";
import type { BlobStore } from "./chunked";

/** Binds the chunked storage layer to Netlify Blobs (site-wide store, strong consistency). */
export function netlifyBlobStore(): BlobStore {
  const storeName = process.env.NETLIFY_BLOBS_STORE || "frameforge-media";
  const open = async () => {
    const { getStore } = await import("@netlify/blobs");
    // Strong consistency so a file can be read immediately after its last part is written.
    return getStore({ name: storeName, consistency: "strong" });
  };
  return {
    async set(key, data) {
      const copy = new Uint8Array(data.byteLength);
      copy.set(data);
      await (await open()).set(key, copy.buffer);
    },
    async get(key) {
      const value = await (await open()).get(key, { type: "arrayBuffer" });
      return value === null ? null : new Uint8Array(value);
    },
    async delete(key) {
      await (await open()).delete(key);
    },
    async list(prefix) {
      const { blobs } = await (await open()).list({ prefix });
      return blobs.map((b) => b.key);
    },
  };
}
