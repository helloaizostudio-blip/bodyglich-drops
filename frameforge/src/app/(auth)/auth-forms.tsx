"use client";

import { useActionState } from "react";
import { AlertTriangle } from "lucide-react";
import { setupStudio, signIn, type AuthFormState } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";

function FormError({ state }: { state: AuthFormState }) {
  if (!state.error) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-xl bg-bad-100 px-3 py-2.5 text-[13px] font-medium text-bad-700">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {state.error}
    </p>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <TextField label="Email" name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} />
      <TextField label="Password" name="password" type="password" autoComplete="current-password" required />
      <FormError state={state} />
      <Button type="submit" size="lg" loading={pending}>
        Sign in
      </Button>
    </form>
  );
}

export function SetupForm({ needsCode }: { needsCode: boolean }) {
  const [state, action, pending] = useActionState(setupStudio, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      {needsCode ? <TextField label="Setup code" name="setupCode" autoComplete="off" required hint="The one-time code you were given when this studio was put online." /> : null}
      <TextField label="Your name" name="name" autoComplete="name" required defaultValue={state.values?.name} />
      <TextField label="YouTube channel" name="channel" required defaultValue={state.values?.channel ?? "BLOCKHEADS"} hint="Shown across the studio. You can change it later in Settings." />
      <TextField label="Email" name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} />
      <TextField label="Password" name="password" type="password" autoComplete="new-password" required minLength={8} hint="At least 8 characters." />
      <FormError state={state} />
      <Button type="submit" size="lg" loading={pending}>
        Create my studio
      </Button>
    </form>
  );
}
