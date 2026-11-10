import { redirect } from "next/navigation";
import { getCtx, hasAnyUser } from "@/server/auth";
import { SetupForm } from "../auth-forms";

export const metadata = { title: "Set up your studio" };

export default async function SetupPage() {
  if (await getCtx()) redirect("/");
  if (await hasAnyUser()) redirect("/login");
  return (
    <>
      <h1 className="text-2xl font-extrabold text-navy-900">Set up your studio</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Create the owner account for this FRAMEFORGE installation. This screen is only available once.</p>
      <SetupForm needsCode={!!process.env.SETUP_CODE?.trim()} />
    </>
  );
}
