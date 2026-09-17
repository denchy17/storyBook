// Supabase Storage. Every image, narration clip, uploaded photo and generated
// asset lives in the private "fable" bucket and is served back through the
// auth-gated /api/files/[...path] route.
//
// Netlify functions get a read-only, per-invocation filesystem, so the bucket is
// what makes uploads outlive a request.
//
// Keys are POSIX-style paths ("books/<bookId>/pages/3.png") and always go
// through normalizeKey() first — they arrive from user-controlled URL segments.
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

export const BUCKET = "fable";

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageError";
  }
}

// Built on first use, not at import: with the env vars absent createClient
// throws, and doing that at module scope fails the build instead of the one
// request that actually needed storage.
let client: SupabaseClient | null = null;

function storage() {
  if (!client) {
    if (!env.supabaseUrl || !env.supabaseKey) {
      throw new StorageError("SUPABASE_URL / SUPABASE_KEY are not configured");
    }
    client = createClient(env.supabaseUrl, env.supabaseKey);
  }
  return client.storage.from(BUCKET);
}

/**
 * Validate a key, rejecting any relative segment rather than collapsing it.
 *
 * /api/files/[...path] decides *ownership* from the key's own segments
 * ("uploads/<userId>/…" must match the caller), so a key that collapsed to a
 * different path would be authorized as one path and then read as another:
 * "uploads/<me>/../../books/<someone-elses-book>/pages/1.png" passes an owner
 * check for <me> but points into another user's book. Encoded dot segments
 * (%2e%2e) arrive decoded in the catch-all params, so URL normalization upstream
 * is not a defense. Real keys never contain "." or ".." segments.
 */
function normalizeKey(key: string): string {
  if (!key || key.includes("\0")) throw new StorageError("Invalid storage key");

  const segments = key.replace(/\\/g, "/").split("/");
  if (segments.some((s) => s === "" || s === "." || s === "..")) {
    throw new StorageError("Invalid storage key");
  }
  return segments.join("/");
}

export async function saveBuffer(key: string, data: Buffer): Promise<string> {
  const normalized = normalizeKey(key);
  const { error } = await storage().upload(normalized, data, {
    contentType: contentTypeFor(normalized),
    upsert: true,
  });
  if (error) throw new StorageError(`Storage upload failed for ${key}: ${error.message}`);
  return key;
}

export async function readBuffer(key: string): Promise<Buffer> {
  const normalized = normalizeKey(key);
  const { data, error } = await storage().download(normalized);
  if (error) throw new StorageError(`Storage read failed for ${key}: ${error.message}`);
  return Buffer.from(await data.arrayBuffer());
}

export async function exists(key: string): Promise<boolean> {
  let normalized: string;
  try {
    normalized = normalizeKey(key);
  } catch {
    return false;
  }

  const lastSlash = normalized.lastIndexOf("/");
  const dir = lastSlash >= 0 ? normalized.slice(0, lastSlash) : "";
  const name = lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized;

  // `search` is a substring match, so compare names exactly afterwards.
  const { data } = await storage().list(dir, { search: name, limit: 100 });
  return data?.some((entry) => entry.name === name) ?? false;
}

/** Delete a whole folder (e.g. every asset of one book). No-op if missing. */
export async function removePrefix(prefix: string): Promise<void> {
  const normalized = normalizeKey(prefix);
  const keys = await listRecursive(normalized);
  if (keys.length === 0) return;

  const { error } = await storage().remove(keys);
  if (error) throw new StorageError(`Storage delete failed for ${prefix}: ${error.message}`);
}

/**
 * Every object key under a folder. list() is per-folder, not recursive, and
 * returns subfolders as entries with a null id — that is the only thing
 * distinguishing them from files.
 */
async function listRecursive(dir: string): Promise<string[]> {
  const { data, error } = await storage().list(dir, { limit: 1000 });
  if (error) throw new StorageError(`Storage list failed for ${dir}: ${error.message}`);
  if (!data) return [];

  const keys: string[] = [];
  for (const entry of data) {
    const full = `${dir}/${entry.name}`;
    if (entry.id === null) {
      keys.push(...(await listRecursive(full)));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

export function extFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/png":
    default:
      return "png";
  }
}

export function contentTypeFor(key: string): string {
  const ext = path.extname(key).toLowerCase();
  switch (ext) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".mp3":
      return "audio/mpeg";
    case ".pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}
