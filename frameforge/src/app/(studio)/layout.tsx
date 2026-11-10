import { requireCtx } from "@/server/auth";
import { Shell } from "@/components/shell/shell";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireCtx();
  return (
    <Shell userName={ctx.user.name} channelName={ctx.project.channelName}>
      {children}
    </Shell>
  );
}
