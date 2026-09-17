import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { serializeBook } from "@/lib/serialize";
import { removePrefix } from "@/lib/storage";
import { fail, handleError, json } from "@/lib/http";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const book = await prisma.book.findUnique({
      where: { id },
      include: { characters: true, pages: { orderBy: { index: "asc" } } },
    });
    if (!book || book.userId !== user.id) return fail("Not found", 404);
    return json({ book: serializeBook(book) });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const book = await prisma.book.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!book || book.userId !== user.id) return fail("Not found", 404);
    await prisma.book.delete({ where: { id } });
    // Files now live on our own disk, so the row going away has to take the
    // illustrations and narration with it.
    await removePrefix(`books/${id}`).catch((err) =>
      console.error(`[books] failed to remove files for ${id}`, err),
    );
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
