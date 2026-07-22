import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { saveBuffer } from "@/lib/storage";
import { enqueue } from "@/lib/jobs";
import { runBookGeneration } from "@/lib/pipeline";
import { serializeBook } from "@/lib/serialize";
import { fail, handleError, json } from "@/lib/http";

const characterSchema = z.object({
  role: z.enum(["child", "parent"]),
  name: z.string().trim().min(1).max(60),
  age: z.string().trim().max(30).optional(),
  gender: z.string().trim().max(30).optional(),
  description: z.string().trim().max(2000).optional(),
});

const payloadSchema = z.object({
  bookType: z.string().trim().min(1).max(40),
  language: z.string().trim().min(1).max(40).default("English"),
  title: z.string().trim().max(120).optional(),
  dedication: z.string().trim().max(400).optional(),
  styleHint: z.string().trim().max(120).optional(),
  voiceId: z.string().trim().max(60).optional(),
  characters: z.array(characterSchema).min(1).max(2),
  details: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .default([]),
});

const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
};
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export async function GET() {
  try {
    const user = await requireUser();
    const books = await prisma.book.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: { characters: true },
    });
    return json({ books: books.map((b) => serializeBook(b)) });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const form = await req.formData();

    const rawPayload = form.get("payload");
    if (typeof rawPayload !== "string") return fail("Missing payload");

    let payloadJson: unknown;
    try {
      payloadJson = JSON.parse(rawPayload);
    } catch {
      return fail("Payload is not valid JSON");
    }

    const parsed = payloadSchema.safeParse(payloadJson);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const data = parsed.data;

    // Read photo files aligned to character index.
    const photos: { index: number; buffer: Buffer; ext: string }[] = [];
    for (let i = 0; i < data.characters.length; i++) {
      const file = form.get(`photo_${i}`);
      if (file && file instanceof File && file.size > 0) {
        if (file.size > MAX_PHOTO_BYTES) return fail("Photo is too large (max 10MB)");
        const ext = MIME_EXT[file.type];
        if (!ext) return fail("Photos must be PNG, JPG or WEBP");
        const buffer = Buffer.from(await file.arrayBuffer());
        photos.push({ index: i, buffer, ext });
      }
    }

    const hasPhotoByIndex = new Set(photos.map((p) => p.index));

    const brief = {
      bookType: data.bookType,
      language: data.language,
      title: data.title,
      dedication: data.dedication,
      styleHint: data.styleHint,
      characters: data.characters.map((c, i) => ({
        role: c.role,
        name: c.name,
        age: c.age,
        gender: c.gender,
        description: c.description,
        hasPhoto: hasPhotoByIndex.has(i),
      })),
      details: data.details.map((d) => ({
        question: d.question,
        answer: d.answer,
      })),
    };

    const book = await prisma.book.create({
      data: {
        userId: user.id,
        title: data.title?.trim() || "Untitled Story",
        dedication: data.dedication ?? null,
        bookType: data.bookType,
        language: data.language,
        styleName: data.styleHint || "Storybook Watercolor",
        voiceId: data.voiceId || env.elevenLabsVoiceId,
        inputJson: JSON.stringify(brief),
        status: "GENERATING",
        stage: "Queued",
        progress: 1,
        characters: {
          create: data.characters.map((c) => ({
            role: c.role,
            name: c.name,
            age: c.age ?? null,
            gender: c.gender ?? null,
            description: c.description ?? "",
          })),
        },
      },
      include: { characters: true },
    });

    // Save photos and attach to the matching character.
    for (const photo of photos) {
      const character = book.characters[photo.index];
      if (!character) continue;
      const key = `uploads/${user.id}/${book.id}_${photo.index}.${photo.ext}`;
      await saveBuffer(key, photo.buffer);
      await prisma.character.update({
        where: { id: character.id },
        data: { photoPath: key },
      });
    }

    enqueue(book.id, () => runBookGeneration(book.id));

    return json({ id: book.id });
  } catch (err) {
    return handleError(err);
  }
}
