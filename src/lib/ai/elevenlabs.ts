import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { env, MODELS } from "../env";

const client = new ElevenLabsClient({ apiKey: env.elevenLabsApiKey });

type AnyStream =
  | AsyncIterable<Uint8Array>
  | ReadableStream<Uint8Array>
  | Uint8Array
  | Buffer;

async function toBuffer(input: AnyStream): Promise<Buffer> {
  if (Buffer.isBuffer(input)) return input;
  if (input instanceof Uint8Array) return Buffer.from(input);

  const chunks: Buffer[] = [];

  // Async iterable (Node stream / async generator)
  if (typeof (input as AsyncIterable<Uint8Array>)[Symbol.asyncIterator] === "function") {
    for await (const chunk of input as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  // Web ReadableStream
  const reader = (input as ReadableStream<Uint8Array>).getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

/**
 * Generate narration audio once. The result is stored and reused, so we never
 * re-synthesize the same page (keeps ElevenLabs cost down).
 */
export async function synthesizeSpeech(
  text: string,
  voiceId: string,
): Promise<Buffer> {
  const audio = await client.textToSpeech.convert(voiceId || env.elevenLabsVoiceId, {
    text,
    modelId: MODELS.elevenLabs,
    outputFormat: "mp3_44100_128",
  });
  return toBuffer(audio as unknown as AnyStream);
}
