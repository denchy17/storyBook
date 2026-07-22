// Creates the "fable" bucket directly via PostgreSQL (bypasses RLS).
// Uses the direct superuser connection from DIRECT_URL.
// Run once: node scripts/setup-storage-sql.mjs
import pg from "pg";
import { config } from "dotenv";
config();

const client = new pg.Client({ connectionString: process.env.DIRECT_URL });
await client.connect();

// Create the bucket row in storage.buckets
await client.query(`
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types, created_at, updated_at)
  VALUES ('fable', 'fable', false, 52428800, NULL, now(), now())
  ON CONFLICT (id) DO UPDATE SET allowed_mime_types = NULL;
`);
console.log("✓ Bucket 'fable' ready");

// Drop any leftover policies for this bucket to start clean
await client.query(`
  DO $$
  BEGIN
    DROP POLICY IF EXISTS "fable_all" ON storage.objects;
  EXCEPTION WHEN OTHERS THEN NULL;
  END $$;
`);

// Allow all operations on this bucket (auth is enforced at the app layer)
await client.query(`
  CREATE POLICY "fable_all" ON storage.objects
  FOR ALL
  USING (bucket_id = 'fable')
  WITH CHECK (bucket_id = 'fable');
`);
console.log("✓ Storage RLS policy created");

await client.end();

// Now verify with the Supabase client
const { createClient } = await import("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const testKey = "_test/ping.bin";
const { error: upErr } = await supabase.storage
  .from("fable")
  .upload(testKey, Buffer.from("pong"), { contentType: "application/octet-stream", upsert: true });

if (upErr) {
  console.error("❌ Upload test failed:", upErr.message);
  process.exit(1);
}
console.log("✓ Upload OK");

const { data, error: dlErr } = await supabase.storage.from("fable").download(testKey);
if (dlErr) {
  console.error("❌ Download test failed:", dlErr.message);
  process.exit(1);
}
const text = await data.text();
if (text !== "pong") { console.error("❌ Data mismatch:", text); process.exit(1); }
console.log("✓ Download OK");

await supabase.storage.from("fable").remove(["_test/ping.bin"]);
console.log("\n✅ Supabase Storage is fully working.");
