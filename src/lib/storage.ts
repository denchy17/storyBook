// Asset storage for every image, narration clip, uploaded photo and generated
// asset. Served back through the auth-gated /api/files/[...path] route.
//
// Two backends behind one interface:
//   • Netlify Blobs in production — Netlify functions get a read-only,
//     per-invocation filesystem, so anything written to disk there is gone by
//     the next request.
//   • The local filesystem under STORAGE_DIR (default ./storage) everywhere
//     else, so `npm run dev` keeps working without a Netlify context.
//
// Keys are POSIX-style paths ("books/<bookId>/pages/3.png"). They arrive from
// user-controlled URL segments, so every key goes through normalizeKey() first:
// on disk a raw join would be a path-traversal hole, and in Blobs an
// unnormalized key would disagree with the ownership check in the files route,
// which reads the book id out of the key itself.
import fs from "fs/promises";
import path from "path";
import { env } from "./env";

const ROOT = path.resolve(env.storageDir);

const STORE_NAME = "fable-assets";

/** Netlify sets NETLIFY=true in both builds and the function runtime. */
const onNetlify = process.env.NETLIFY === "true";

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageError";
  }
}

/**
 * Validate a key, rejecting any relative segment rather than collapsing it.
 *
 * Rejecting matters: /api/files/[...path] decides *ownership* from the key's own
 * segments ("uploads/<userId>/…" must match the caller), so a key that collapsed
 * to a different path would be authorized as one path and then read as another.
 * "uploads/<me>/../../books/<someone-elses-book>/pages/1.png" passes an owner
 * check for <me> but normalizes into another user's book. Encoded dot segments
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

/** Map a normalized key onto an absolute path inside ROOT, or throw. */
function resolveKey(key: string): string {
  const full = path.resolve(ROOT, normalizeKey(key));
  if (full !== ROOT && !full.startsWith(ROOT + path.sep)) {
    throw new StorageError("Invalid storage key");
  }
  return full;
}

type Driver = {
  save(key: string, data: Buffer): Promise<void>;
  read(key: string): Promise<Buffer>;
  has(key: string): Promise<boolean>;
  removePrefix(prefix: string): Promise<void>;
};

// --- Netlify Blobs -----------------------------------------------------------

// Strong consistency: the pipeline writes a page image and reads it straight
// back (and the browser requests it moments later), which the default
// eventually-consistent reads would sometimes miss.
async function loadStore() {
  const { getStore } = await import("@netlify/blobs");
  return getStore({ name: STORE_NAME, consistency: "strong" });
}

let storePromise: ReturnType<typeof loadStore> | null = null;

function blobStore() {
  storePromise ??= loadStore();
  return storePromise;
}

const blobsDriver: Driver = {
  async save(key, data) {
    const store = await blobStore();
    // Blobs takes an ArrayBuffer, and a Buffer is usually a view into a larger
    // pooled one — hand over this Buffer's slice, not the whole pool.
    const bytes = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength,
    ) as ArrayBuffer;
    await store.set(normalizeKey(key), bytes);
  },

  async read(key) {
    const store = await blobStore();
    // Typed non-nullable by the overload, but a missing key resolves to null.
    const value: ArrayBuffer | null = await store.get(normalizeKey(key), {
      type: "arrayBuffer",
    });
    if (value === null) throw new StorageError(`Storage read failed for ${key} (missing)`);
    return Buffer.from(value);
  },

  async has(key) {
    const store = await blobStore();
    // getMetadata is the cheap existence probe — it skips the body download.
    return (await store.getMetadata(normalizeKey(key))) !== null;
  },

  async removePrefix(prefix) {
    const store = await blobStore();
    // Blobs is flat, so "delete the folder" means listing the prefix and
    // deleting each key. Keep the trailing slash: without it, `books/ab` would
    // also match `books/abc`.
    const normalized = normalizeKey(prefix);
    const { blobs } = await store.list({ prefix: `${normalized}/` });
    await Promise.all(blobs.map((blob) => store.delete(blob.key)));
  },
};

// --- Local filesystem --------------------------------------------------------

const fsDriver: Driver = {
  async save(key, data) {
    const file = resolveKey(key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, data);
  },

  async read(key) {
    const file = resolveKey(key);
    try {
      return await fs.readFile(file);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      throw new StorageError(`Storage read failed for ${key}${code ? ` (${code})` : ""}`);
    }
  },

  async has(key) {
    let file: string;
    try {
      file = resolveKey(key);
    } catch {
      return false;
    }
    try {
      const stat = await fs.stat(file);
      return stat.isFile();
    } catch {
      return false;
    }
  },

  async removePrefix(prefix) {
    const dir = resolveKey(prefix);
    if (dir === ROOT) throw new StorageError("Refusing to delete the storage root");
    await fs.rm(dir, { recursive: true, force: true });
  },
};

const driver: Driver = onNetlify ? blobsDriver : fsDriver;

// --- Public surface ----------------------------------------------------------

export async function saveBuffer(key: string, data: Buffer): Promise<string> {
  await driver.save(key, data);
  return key;
}

export async function readBuffer(key: string): Promise<Buffer> {
  return driver.read(key);
}

export async function exists(key: string): Promise<boolean> {
  try {
    return await driver.has(key);
  } catch {
    return false;
  }
}

/** Delete a whole folder (e.g. every asset of one book). No-op if missing. */
export async function removePrefix(prefix: string): Promise<void> {
  await driver.removePrefix(prefix);
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
