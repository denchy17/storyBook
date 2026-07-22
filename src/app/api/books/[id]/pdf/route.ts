import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage } from "pdf-lib";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readBuffer } from "@/lib/storage";
import { fail, handleError } from "@/lib/http";

const SIZE = 720;
const MARGIN = 56;

function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\n+/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, fontSize) > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    lines.push("");
  }
  if (lines[lines.length - 1] === "") lines.pop();
  return lines;
}

function drawImageFit(page: ReturnType<PDFDocument["addPage"]>, image: PDFImage) {
  const maxW = SIZE - MARGIN * 2;
  const maxH = SIZE - MARGIN * 2;
  const scale = Math.min(maxW / image.width, maxH / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  page.drawImage(image, {
    x: (SIZE - w) / 2,
    y: (SIZE - h) / 2,
    width: w,
    height: h,
  });
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const book = await prisma.book.findUnique({
      where: { id },
      include: { pages: { orderBy: { index: "asc" } } },
    });
    if (!book || book.userId !== user.id) return fail("Not found", 404);
    if (book.status !== "READY") return fail("Book is not ready yet", 409);

    const pdf = await PDFDocument.create();
    const serif = await pdf.embedFont(StandardFonts.TimesRoman);
    const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);

    const embedImage = async (key: string | null) => {
      if (!key) return null;
      try {
        const buf = await readBuffer(key);
        const bytes = new Uint8Array(buf);
        // Detect format by magic bytes (Nano Banana may return PNG or JPEG).
        const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
        return isJpeg ? pdf.embedJpg(bytes) : pdf.embedPng(bytes);
      } catch {
        return null;
      }
    };

    // Cover
    const cover = pdf.addPage([SIZE, SIZE]);
    cover.drawRectangle({ x: 0, y: 0, width: SIZE, height: SIZE, color: rgb(0.98, 0.96, 0.92) });
    const coverImg = await embedImage(book.coverImagePath);
    if (coverImg) {
      const scale = Math.min((SIZE - MARGIN * 2) / coverImg.width, (SIZE - 220) / coverImg.height);
      const w = coverImg.width * scale;
      const h = coverImg.height * scale;
      cover.drawImage(coverImg, { x: (SIZE - w) / 2, y: SIZE - MARGIN - h, width: w, height: h });
    }
    const titleSize = 34;
    const titleLines = wrapText(book.title, serifBold, titleSize, SIZE - MARGIN * 2);
    let ty = 150;
    for (const line of titleLines) {
      const tw = serifBold.widthOfTextAtSize(line, titleSize);
      cover.drawText(line, { x: (SIZE - tw) / 2, y: ty, size: titleSize, font: serifBold, color: rgb(0.2, 0.15, 0.1) });
      ty -= titleSize + 6;
    }
    if (book.dedication) {
      const dSize = 13;
      const dLines = wrapText(book.dedication, serif, dSize, SIZE - MARGIN * 2);
      let dy = ty - 10;
      for (const line of dLines) {
        const dw = serif.widthOfTextAtSize(line, dSize);
        cover.drawText(line, { x: (SIZE - dw) / 2, y: dy, size: dSize, font: serif, color: rgb(0.45, 0.4, 0.35) });
        dy -= dSize + 4;
      }
    }

    // Story pages: illustration leaf + text leaf.
    for (const p of book.pages) {
      const illustration = pdf.addPage([SIZE, SIZE]);
      illustration.drawRectangle({ x: 0, y: 0, width: SIZE, height: SIZE, color: rgb(1, 1, 1) });
      const img = await embedImage(p.imagePath);
      if (img) drawImageFit(illustration, img);

      const textPage = pdf.addPage([SIZE, SIZE]);
      textPage.drawRectangle({ x: 0, y: 0, width: SIZE, height: SIZE, color: rgb(0.99, 0.98, 0.95) });
      const bodySize = 18;
      const lines = wrapText(p.text, serif, bodySize, SIZE - MARGIN * 2);
      const blockHeight = lines.length * (bodySize + 8);
      let y = Math.min(SIZE - MARGIN - bodySize, (SIZE + blockHeight) / 2);
      for (const line of lines) {
        textPage.drawText(line, { x: MARGIN, y, size: bodySize, font: serif, color: rgb(0.15, 0.12, 0.1), lineHeight: bodySize + 8 });
        y -= bodySize + 8;
      }
      const num = `${p.index + 1}`;
      const nw = serif.widthOfTextAtSize(num, 12);
      textPage.drawText(num, { x: (SIZE - nw) / 2, y: MARGIN / 2, size: 12, font: serif, color: rgb(0.6, 0.55, 0.5) });
    }

    const bytes = await pdf.save();
    const safeTitle = book.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 60) || "storybook";
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeTitle}.pdf"`,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
