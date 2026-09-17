// Local filesystem storage. Every image, narration clip, uploaded photo and
// generated asset lives under STORAGE_DIR (default ./storage) and is served
// back through the auth-gated /api/files/[...path] route.
//
// Keys are POSIX-style paths ("books/<bookId>/pages/3.png") and are always
// resolved through resolveKey(), which keeps them inside the storage root —
// they arrive from user-controlled URL segments, so a raw join would be a
// path-traversal hole.
import fs from "fs/promises";
import path from "path";
import { env } from "./env";

const ROOT = path.resolve(env.storageDir);

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageError";
  }
}

/** Map a storage key onto an absolute path inside ROOT, or throw. */
function resolveKey(key: string): string {
  if (!key || key.includes("\0")) throw new StorageError("Invalid storage key");

  const normalized = path.posix.normalize(key.replace(/\\/g, "/"));
  if (
    normalized.startsWith("/") ||
    normalized === ".." ||
    normalized.startsWith("../")
  ) {
    throw new StorageError("Invalid storage key");
  }

  const full = path.resolve(ROOT, normalized);
  if (full !== ROOT && !full.startsWith(ROOT + path.sep)) {
    throw new StorageError("Invalid storage key");
  }
  return full;
}

export async function saveBuffer(key: string, data: Buffer): Promise<string> {
  const file = resolveKey(key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, data);
  return key;
}

export async function readBuffer(key: string): Promise<Buffer> {
  const file = resolveKey(key);
  try {
    return await fs.readFile(file);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    throw new StorageError(`Storage read failed for ${key}${code ? ` (${code})` : ""}`);
  }
}

export async function exists(key: string): Promise<boolean> {
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
}

/** Delete a whole folder (e.g. every asset of one book). No-op if missing. */
export async function removePrefix(prefix: string): Promise<void> {
  const dir = resolveKey(prefix);
  if (dir === ROOT) throw new StorageError("Refusing to delete the storage root");
  await fs.rm(dir, { recursive: true, force: true });
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
