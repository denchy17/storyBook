import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { enqueue } from "@/lib/jobs";
import { runBookGeneration } from "@/lib/pipeline";
import { fail, handleError, json } from "@/lib/http";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const book = await prisma.book.findUnique({
      where: { id },
      select: { userId: true, status: true },
    });
    if (!book || book.userId !== user.id) return fail("Not found", 404);
    if (book.status === "GENERATING") return json({ ok: true });

    await prisma.book.update({
      where: { id },
      data: { status: "GENERATING", stage: "Queued", progress: 1, errorMessage: null },
    });
    enqueue(id, () => runBookGeneration(id));
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
