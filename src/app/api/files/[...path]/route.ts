import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { contentTypeFor, exists, readBuffer } from "@/lib/storage";
import { fail, handleError } from "@/lib/http";

async function canAccess(userId: string, key: string): Promise<boolean> {
  const parts = key.split("/");
  if (parts[0] === "uploads") {
    return parts[1] === userId;
  }
  if (parts[0] === "books" && parts[1]) {
    const book = await prisma.book.findUnique({
      where: { id: parts[1] },
      select: { userId: true },
    });
    return book?.userId === userId;
  }
  return false;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  try {
    const user = await requireUser();
    const { path } = await ctx.params;
    const key = path.join("/");

    if (!(await canAccess(user.id, key))) return fail("Forbidden", 403);
    if (!(await exists(key))) return fail("Not found", 404);

    const buffer = await readBuffer(key);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentTypeFor(key),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
