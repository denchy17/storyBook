import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";

export default async function RegisterPage() {
  if (await getSessionUser()) redirect("/dashboard");
  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-16">
      <AuthForm mode="register" />
    </div>
  );
}
