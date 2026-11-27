import fs from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CharacterId, CharacterProfile, Idea, Project, Settings } from "../types";
import { mergeSettings } from "../settings";

export const APP_ROOT = process.env.APP_ROOT || process.cwd();
export const DATA_DIR = path.resolve(APP_ROOT, process.env.DATA_DIR || "data");
export const MEDIA_DIR = path.join(DATA_DIR, "media");
export const DB_DIR = path.join(DATA_DIR, "db");
export const ASSETS_DIR = path.join(APP_ROOT, "assets");

type Collection = "settings" | "characters" | "ideas" | "projects";

/** Persistence for documents + media. Local filesystem by default, Supabase when configured. */
export interface Store {
  kind: "local" | "supabase";
  getDoc<T>(c: Collection, id: string): Promise<T | null>;
  putDoc<T>(c: Collection, id: string, data: T): Promise<void>;
  listDocs<T>(c: Collection): Promise<T[]>;
  deleteDoc(c: Collection, id: string): Promise<void>;
  /** Store a media file under `key`; returns key. */
  putFile(key: string, src: string | Buffer, contentType?: string): Promise<string>;
  /** Absolute local path for a stored file (downloads into cache when remote). */
  localPath(key: string): Promise<string>;
  hasFile(key: string): Promise<boolean>;
}

function atomicWrite(file: string, data: string | Buffer) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file);
}

function safeKey(key: string): string {
  const norm = path.posix.normalize(key).replace(/^\/+/, "");
  if (norm.startsWith("..") || norm.includes("\0")) throw new Error(`invalid storage key: ${key}`);
  return norm;
}

class LocalStore implements Store {
  kind = "local" as const;
  private docPath(c: Collection, id: string) {
    return path.join(DB_DIR, c, `${safeKey(id)}.json`);
  }
  async getDoc<T>(c: Collection, id: string) {
    const p = this.docPath(c, id);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf8")) as T;
  }
  async putDoc<T>(c: Collection, id: string, data: T) {
    atomicWrite(this.docPath(c, id), JSON.stringify(data, null, 2));
  }
  async listDocs<T>(c: Collection) {
    const dir = path.join(DB_DIR, c);
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as T);
  }
  async deleteDoc(c: Collection, id: string) {
    fs.rmSync(this.docPath(c, id), { force: true });
  }
  async putFile(key: string, src: string | Buffer) {
    const dest = path.join(MEDIA_DIR, safeKey(key));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (typeof src === "string") {
      if (path.resolve(src) !== path.resolve(dest)) fs.copyFileSync(src, dest);
    } else atomicWrite(dest, src);
    return key;
  }
  async localPath(key: string) {
    const p = path.join(MEDIA_DIR, safeKey(key));
    if (!fs.existsSync(p)) throw new Error(`missing media: ${key}`);
    return p;
  }
  async hasFile(key: string) {
    return fs.existsSync(path.join(MEDIA_DIR, safeKey(key)));
  }
}

/**
 * Supabase-backed store. Documents live in a single `docs` table (see supabase/schema.sql),
 * media in the `media` storage bucket. A local cache keeps render inputs on disk.
 */
class SupabaseStore implements Store {
  kind = "supabase" as const;
  private sb: SupabaseClient;
  private bucket: string;
  private local = new LocalStore();
  constructor(url: string, key: string, bucket: string) {
    this.sb = createClient(url, key, { auth: { persistSession: false } });
    this.bucket = bucket;
  }
  async getDoc<T>(c: Collection, id: string) {
    const { data, error } = await this.sb.from("docs").select("data").eq("collection", c).eq("id", id).maybeSingle();
    if (error) throw new Error(`supabase getDoc: ${error.message}`);
    return (data?.data as T) ?? null;
  }
  async putDoc<T>(c: Collection, id: string, data: T) {
    const { error } = await this.sb
      .from("docs")
      .upsert({ collection: c, id, data, updated_at: new Date().toISOString() }, { onConflict: "collection,id" });
    if (error) throw new Error(`supabase putDoc: ${error.message}`);
  }
  async listDocs<T>(c: Collection) {
    const { data, error } = await this.sb.from("docs").select("data").eq("collection", c).limit(1000);
    if (error) throw new Error(`supabase listDocs: ${error.message}`);
    return (data ?? []).map((r) => r.data as T);
  }
  async deleteDoc(c: Collection, id: string) {
    const { error } = await this.sb.from("docs").delete().eq("collection", c).eq("id", id);
    if (error) throw new Error(`supabase deleteDoc: ${error.message}`);
  }
  async putFile(key: string, src: string | Buffer, contentType?: string) {
    await this.local.putFile(key, src);
    const body = typeof src === "string" ? fs.readFileSync(src) : src;
    const { error } = await this.sb.storage
      .from(this.bucket)
      .upload(safeKey(key), body, { upsert: true, contentType: contentType ?? guessType(key) });
    if (error) throw new Error(`supabase upload ${key}: ${error.message}`);
    return key;
  }
  async localPath(key: string) {
    if (await this.local.hasFile(key)) return this.local.localPath(key);
    const { data, error } = await this.sb.storage.from(this.bucket).download(safeKey(key));
    if (error || !data) throw new Error(`missing media: ${key} (${error?.message})`);
    await this.local.putFile(key, Buffer.from(await data.arrayBuffer()));
    return this.local.localPath(key);
  }
  async hasFile(key: string) {
    if (await this.local.hasFile(key)) return true;
    const dir = path.posix.dirname(safeKey(key));
    const { data } = await this.sb.storage.from(this.bucket).list(dir === "." ? "" : dir, {
      search: path.posix.basename(key),
    });
    return !!data?.some((f) => f.name === path.posix.basename(key));
  }
}

export function guessType(key: string): string {
  const ext = path.extname(key).toLowerCase();
  return (
    {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".mp4": "video/mp4",
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
      ".json": "application/json",
    }[ext] ?? "application/octet-stream"
  );
}

let _store: Store | null = null;
export function getStore(): Store {
  if (_store) return _store;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  _store = url && key ? new SupabaseStore(url, key, process.env.SUPABASE_BUCKET || "media") : new LocalStore();
  return _store;
}

// ---------- typed helpers ----------

export async function loadSettings(): Promise<Settings> {
  return mergeSettings(await getStore().getDoc<Settings>("settings", "global"));
}
export async function saveSettings(s: Settings) {
  await getStore().putDoc("settings", "global", s);
}
export async function getProject(id: string) {
  return getStore().getDoc<Project>("projects", id);
}
export async function saveProject(p: Project) {
  p.updatedAt = new Date().toISOString();
  await getStore().putDoc("projects", p.id, p);
}
export async function listProjects() {
  return (await getStore().listDocs<Project>("projects")).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function getIdea(id: string) {
  return getStore().getDoc<Idea>("ideas", id);
}
export async function saveIdea(i: Idea) {
  await getStore().putDoc("ideas", i.id, i);
}
export async function listIdeas() {
  return (await getStore().listDocs<Idea>("ideas")).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function getCharacterDoc(id: CharacterId) {
  return getStore().getDoc<CharacterProfile>("characters", id);
}
export async function saveCharacter(c: CharacterProfile) {
  c.updatedAt = new Date().toISOString();
  await getStore().putDoc("characters", c.id, c);
}
