import { prisma } from "./db";
import { env } from "./env";
import { readBuffer, saveBuffer, contentTypeFor, extFromMime } from "./storage";
import { generateStoryPlan, type BookBrief } from "./ai/claude";
import { generateImage, type ImageInput } from "./ai/nanobanana";
import { synthesizeSpeech } from "./ai/elevenlabs";

async function setStatus(
  bookId: string,
  data: {
    status?: string;
    stage?: string;
    progress?: number;
    errorMessage?: string | null;
  },
) {
  await prisma.book.update({ where: { id: bookId }, data });
}

function imageRefFrom(key: string, buffer: Buffer): ImageInput {
  return { data: buffer, mimeType: contentTypeFor(key) };
}

/** Compose the final image prompt for a page: scene + shared art direction. */
function composePrompt(scene: string, stylePrompt: string): string {
  return [
    scene.trim(),
    stylePrompt.trim()
      ? `Art direction (keep identical across the whole book): ${stylePrompt.trim()}`
      : "",
    "Single illustration, no text, no letters, no captions, no watermark. Keep every character's face and outfit exactly consistent with the reference image.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function runBookGeneration(bookId: string): Promise<void> {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: { characters: true, pages: { orderBy: { index: "asc" } } },
  });
  if (!book) return;

  try {
    await setStatus(bookId, {
      status: "GENERATING",
      stage: "Writing your story",
      progress: 4,
      errorMessage: null,
    });

    const brief = JSON.parse(book.inputJson) as BookBrief;

    // 1) Story + prompts from Claude.
    const plan = await generateStoryPlan(brief);

    await prisma.book.update({
      where: { id: bookId },
      data: {
        title: plan.title,
        dedication: plan.dedication ?? null,
        styleName: plan.styleName,
        stylePrompt: plan.stylePrompt,
        stage: "Story ready",
        progress: 12,
      },
    });

    // Persist page text + prompts (create pages if not present).
    for (let i = 0; i < plan.pages.length; i++) {
      const p = plan.pages[i];
      await prisma.page.upsert({
        where: { bookId_index: { bookId, index: i } },
        create: {
          bookId,
          index: i,
          text: p.text,
          imagePrompt: p.imagePrompt,
          status: "TEXT_READY",
        },
        update: { text: p.text, imagePrompt: p.imagePrompt, status: "TEXT_READY" },
      });
    }

    // 2) Reference/anchor image (all characters, detailed faces, chosen style).
    await setStatus(bookId, {
      stage: "Designing your characters",
      progress: 18,
    });

    const photoRefs: ImageInput[] = [];
    for (const c of book.characters) {
      if (c.photoPath) {
        try {
          const buf = await readBuffer(c.photoPath);
          photoRefs.push(imageRefFrom(c.photoPath, buf));
        } catch {
          // ignore missing photo
        }
      }
    }

    const anchorPrompt = composePrompt(
      plan.characterSheetPrompt ||
        "A friendly full-body line-up of all the story's characters.",
      plan.stylePrompt,
    );

    const anchor = await generateImage({
      prompt:
        anchorPrompt +
        "\n\nThe attached photos are the real people — capture their real, detailed facial likeness faithfully while rendering them in the chosen art style.",
      references: photoRefs,
      aspectRatio: "4:3",
    });
    const anchorKey = `books/${bookId}/reference.${extFromMime(anchor.mimeType)}`;
    await saveBuffer(anchorKey, anchor.data);
    await prisma.book.update({
      where: { id: bookId },
      data: { referenceImagePath: anchorKey, coverImagePath: anchorKey },
    });

    // Build the reference set reused for every page: the anchor illustration
    // (style + faces) plus up to 3 real photos (identity reinforcement).
    const pageRefs: ImageInput[] = [
      { data: anchor.data, mimeType: anchor.mimeType },
      ...photoRefs.slice(0, 3),
    ];

    // 3) Per-page illustrations.
    const pages = await prisma.page.findMany({
      where: { bookId },
      orderBy: { index: "asc" },
    });

    const imgStart = 22;
    const imgEnd = 68;
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      await setStatus(bookId, {
        stage: `Illustrating page ${i + 1} of ${pages.length}`,
        progress: Math.round(imgStart + ((imgEnd - imgStart) * i) / pages.length),
      });

      const image = await generateImage({
        prompt: composePrompt(page.imagePrompt, plan.stylePrompt),
        references: pageRefs,
        aspectRatio: "1:1",
      });
      const key = `books/${bookId}/pages/${page.index}.${extFromMime(image.mimeType)}`;
      await saveBuffer(key, image.data);
      await prisma.page.update({
        where: { id: page.id },
        data: { imagePath: key, status: "IMAGE_READY" },
      });
    }

    // 4) Narration (generated once, reused).
    const audioStart = 70;
    const audioEnd = 98;
    const voiceId = book.voiceId || env.elevenLabsVoiceId;
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      await setStatus(bookId, {
        stage: `Recording narration ${i + 1} of ${pages.length}`,
        progress: Math.round(
          audioStart + ((audioEnd - audioStart) * i) / pages.length,
        ),
      });
      if (!page.text.trim()) continue;
      const audio = await synthesizeSpeech(page.text, voiceId);
      const key = `books/${bookId}/audio/${page.index}.mp3`;
      await saveBuffer(key, audio);
      await prisma.page.update({
        where: { id: page.id },
        data: { audioPath: key, status: "DONE" },
      });
    }

    await setStatus(bookId, {
      status: "READY",
      stage: "Your book is ready",
      progress: 100,
    });
  } catch (err) {
    console.error(`[pipeline] book ${bookId} failed`, err);
    await setStatus(bookId, {
      status: "FAILED",
      stage: "Generation failed",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
