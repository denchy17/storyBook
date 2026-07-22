// Cheap validation of the three AI integrations (model IDs + keys).
// Run: node --env-file=.env scripts/smoke-ai.mjs

import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const results = {};

async function testClaude() {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 64,
    messages: [{ role: "user", content: "Reply with exactly: OK" }],
  });
  const text = msg.content.find((c) => c.type === "text")?.text ?? "";
  results.claude = `ok (${text.trim().slice(0, 20)})`;
}

async function testGemini() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const res = await ai.models.generateContent({
    model: "gemini-3.1-flash-image",
    contents: [{ role: "user", parts: [{ text: "A single red apple on a white background, minimalist." }] }],
    config: { responseModalities: ["IMAGE"], imageConfig: { imageSize: "1K", aspectRatio: "1:1" } },
  });
  const parts = res.candidates?.[0]?.content?.parts ?? [];
  const img = parts.find((p) => p.inlineData?.data);
  if (!img) throw new Error("no image returned");
  results.gemini = `ok (${Math.round(Buffer.from(img.inlineData.data, "base64").length / 1024)} KB)`;
}

async function testEleven() {
  const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
  const audio = await client.textToSpeech.convert(
    process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM",
    { text: "Once upon a time.", modelId: "eleven_multilingual_v2", outputFormat: "mp3_44100_128" },
  );
  const chunks = [];
  for await (const c of audio) chunks.push(Buffer.from(c));
  const total = Buffer.concat(chunks).length;
  if (!total) throw new Error("empty audio");
  results.eleven = `ok (${Math.round(total / 1024)} KB)`;
}

for (const [name, fn] of [
  ["claude", testClaude],
  ["gemini", testGemini],
  ["eleven", testEleven],
]) {
  try {
    await fn();
    console.log(`PASS ${name}: ${results[name]}`);
  } catch (e) {
    console.log(`FAIL ${name}: ${e?.message ?? e}`);
  }
}
