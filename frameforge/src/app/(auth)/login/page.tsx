import { redirect } from "next/navigation";
import { getCtx, hasAnyUser } from "@/server/auth";
import { LoginForm } from "../auth-forms";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getCtx()) redirect("/");
  if (!(await hasAnyUser())) redirect("/setup");
  return (
    <>
      <h1 className="text-2xl font-extrabold text-navy-900">Welcome back</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Sign in to your animation studio.</p>
      <LoginForm />
    </>
  );
}
