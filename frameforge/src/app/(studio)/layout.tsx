import { Suspense } from "react";
import { requireCtx } from "@/server/auth";
import { Shell } from "@/components/shell/shell";
import { AssistantLauncher } from "@/components/shell/assistant";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireCtx();
  return (
    <Shell
      userName={ctx.user.name}
      channelName={ctx.project.channelName}
      topBarExtras={
        <Suspense fallback={null}>
          <AssistantLauncher />
        </Suspense>
      }
    >
      {children}
    </Shell>
  );
}
