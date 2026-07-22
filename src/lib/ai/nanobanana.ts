import { GoogleGenAI } from "@google/genai";
import { env, MODELS } from "../env";

const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });

export type ImageInput = { data: Buffer; mimeType: string };

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw lastErr;
}

/**
 * Generate a single 1K illustration with Nano Banana 2.
 *
 * `references` are passed as image parts BEFORE the prompt. We use this to:
 *   1. Feed uploaded human photos (face fidelity), and
 *   2. Feed the shared "reference/anchor" illustration so every page keeps the
 *      same art style and the same character faces.
 */
export type GeneratedImage = { data: Buffer; mimeType: string };

export async function generateImage(opts: {
  prompt: string;
  references?: ImageInput[];
  aspectRatio?: string;
}): Promise<GeneratedImage> {
  return withRetry(async () => {
    const parts: Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    > = [];

    for (const ref of opts.references ?? []) {
      parts.push({
        inlineData: {
          mimeType: ref.mimeType,
          data: ref.data.toString("base64"),
        },
      });
    }
    parts.push({ text: opts.prompt });

    const response = await ai.models.generateContent({
      model: MODELS.nanoBanana,
      contents: [{ role: "user", parts }],
      config: {
        responseModalities: ["IMAGE"],
        imageConfig: {
          imageSize: "1K",
          aspectRatio: opts.aspectRatio ?? "1:1",
        },
      },
    });

    const candidate = response.candidates?.[0];
    const outParts = candidate?.content?.parts ?? [];
    for (const part of outParts) {
      const inline = part.inlineData;
      if (inline?.data) {
        return {
          data: Buffer.from(inline.data, "base64"),
          mimeType: inline.mimeType || "image/png",
        };
      }
    }
    throw new Error("Nano Banana returned no image data");
  });
}
