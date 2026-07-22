import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { serializeBook } from "@/lib/serialize";
import { SiteHeader } from "@/components/site-header";
import { LibraryGrid } from "@/components/library-grid";
import { LinkButton } from "@/components/ui";
import { PlusIcon } from "@/components/icons";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const books = await prisma.book.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { characters: true },
  });

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader user={user} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-accent">Your library</p>
            <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight text-ink">
              Hello, {user.name.split(" ")[0]}
            </h1>
            <p className="mt-2 text-ink-soft">
              Every story you create lives here — ready to read, hear, and share.
            </p>
          </div>
          <LinkButton href="/create">
            <PlusIcon className="h-5 w-5" />
            Create a book
          </LinkButton>
        </div>

        <div className="mt-10">
          <LibraryGrid initialBooks={books.map((b) => serializeBook(b))} />
        </div>
      </main>
    </div>
  );
}
