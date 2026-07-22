import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { serializeBook } from "@/lib/serialize";
import { SiteHeader } from "@/components/site-header";
import { BookProgress } from "@/components/book-progress";

export default async function BookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const book = await prisma.book.findUnique({
    where: { id },
    include: { characters: true, pages: { orderBy: { index: "asc" } } },
  });
  if (!book || book.userId !== user.id) notFound();

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader user={user} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-12">
        <BookProgress initial={serializeBook(book)} />
      </main>
    </div>
  );
}
