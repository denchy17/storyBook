import { createClient } from "@supabase/supabase-js";
import path from "path";
import { env } from "./env";

const supabase = createClient(env.supabaseUrl, env.supabaseKey);
export const BUCKET = "fable";

export async function saveBuffer(key: string, data: Buffer): Promise<string> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(key, data, { contentType: contentTypeFor(key), upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return key;
}

export async function readBuffer(key: string): Promise<Buffer> {
  const { data, error } = await supabase.storage.from(BUCKET).download(key);
  if (error) throw new Error(`Storage read failed: ${error.message}`);
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function exists(key: string): Promise<boolean> {
  const lastSlash = key.lastIndexOf("/");
  const prefix = lastSlash >= 0 ? key.substring(0, lastSlash) : "";
  const filename = lastSlash >= 0 ? key.substring(lastSlash + 1) : key;
  const { data } = await supabase.storage
    .from(BUCKET)
    .list(prefix, { search: filename, limit: 1 });
  return data?.some((f) => f.name === filename) ?? false;
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
