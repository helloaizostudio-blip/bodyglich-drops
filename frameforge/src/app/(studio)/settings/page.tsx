import { requireCtx } from "@/server/auth";
import { databaseMode } from "@/db";
import { storageMode } from "@/server/storage";
import { providerStatuses } from "@/server/providers/config";
import { studioGuides } from "@/server/services/settings";
import { textUsageSummary } from "@/server/services/usage";
import { ffmpegStatus } from "@/server/services/render";
import { PageHeader } from "@/components/ui/misc";
import { SettingsView } from "./settings-view";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ctx = await requireCtx();
  const [statuses, guides, usage] = await Promise.all([providerStatuses(ctx), studioGuides(ctx), textUsageSummary(ctx)]);
  return (
    <>
      <PageHeader title="Settings" subtitle="Studio details, AI provider connections and system status." />
      <SettingsView
        statuses={statuses}
        channelName={ctx.project.channelName}
        guides={guides}
        user={{ name: ctx.user.name, email: ctx.user.email }}
        usage={usage}
        system={{
          database: databaseMode(),
          storage: storageMode(),
          secretFromEnv: !!process.env.APP_SECRET,
          ffmpeg: (await ffmpegStatus()).available,
        }}
      />
    </>
  );
}
