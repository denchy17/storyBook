import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { serializeBook } from "@/lib/serialize";
import { BookReader } from "@/components/book-reader";

export default async function ReadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const book = await prisma.book.findUnique({
    where: { id },
    include: { pages: { orderBy: { index: "asc" } } },
  });
  if (!book || book.userId !== user.id) notFound();
  if (book.status !== "READY") redirect(`/book/${id}`);

  return <BookReader book={serializeBook(book)} />;
}
