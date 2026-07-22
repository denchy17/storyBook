// Creates the "fable" bucket in Supabase Storage and verifies read/write.
// Run once: node scripts/setup-storage.mjs
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const BUCKET = "fable";

// Create private bucket (idempotent — ok if already exists)
const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
  public: false,
  allowedMimeTypes: ["image/*", "audio/mpeg", "application/pdf"],
  fileSizeLimit: 52428800, // 50 MB
});
if (createErr && !createErr.message.includes("already exists")) {
  console.error("❌ Failed to create bucket:", createErr.message);
  process.exit(1);
} else {
  console.log("✓ Bucket ready:", BUCKET);
}

// Write + read a test file
const testKey = "_test/ping.txt";
const testData = Buffer.from("pong");

const { error: upErr } = await supabase.storage
  .from(BUCKET)
  .upload(testKey, testData, { contentType: "text/plain", upsert: true });
if (upErr) {
  console.error("❌ Upload test failed:", upErr.message);
  process.exit(1);
}
console.log("✓ Upload OK");

const { data: dlData, error: dlErr } = await supabase.storage.from(BUCKET).download(testKey);
if (dlErr) {
  console.error("❌ Download test failed:", dlErr.message);
  process.exit(1);
}
const text = await dlData.text();
if (text !== "pong") {
  console.error("❌ Data mismatch:", text);
  process.exit(1);
}
console.log("✓ Download OK");

// Clean up test file
await supabase.storage.from(BUCKET).remove([testKey]);
console.log("\n✅ Supabase Storage is working correctly.");
