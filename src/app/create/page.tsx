import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { CreateWizard } from "@/components/create-wizard";

export default async function CreatePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader user={user} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-12">
        <div className="mb-10 text-center">
          <p className="text-sm font-medium text-accent">Create a book</p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight text-ink">
            Let&apos;s write their story
          </h1>
        </div>
        <CreateWizard />
      </main>
    </div>
  );
}
