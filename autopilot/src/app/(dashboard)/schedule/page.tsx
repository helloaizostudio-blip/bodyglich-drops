import Link from "next/link";
import { Card, EmptyState, Notice, PageHeader, StatusBadge } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { rejectPinAction, retryPinAction, saveScheduleAction, sendNowAction, togglePauseAction, unscheduleAction } from "@/app/actions";
import { listPins } from "@/database/repositories";
import { getSettings } from "@/database/settings";
import type { Pin } from "@/database/types";
import { config } from "@/utils/config";
import { formatDateTime } from "@/utils/time";

function PinRow({ pin, children }: { pin: Pin; children?: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      {pin.image_file ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/media/${pin.image_file}`} alt="" className="h-16 w-11 rounded object-cover ring-1 ring-zinc-200" />
      ) : (
        <div className="h-16 w-11 rounded bg-zinc-100" />
      )}
      <div className="min-w-0 flex-1">
        <Link href={`/products/${pin.product_id}`} className="block truncate text-sm font-medium hover:text-brand-700">{pin.title}</Link>
        <div className="text-xs text-zinc-500">
          {pin.board} · {pin.style}
          {pin.scheduled_for && <> · {formatDateTime(pin.scheduled_for)}</>}
          {pin.sent_at && <> · sent {formatDateTime(pin.sent_at)}</>}
        </div>
        {pin.last_error && <div className="mt-0.5 text-xs text-red-700">{pin.last_error}</div>}
      </div>
      <StatusBadge status={pin.status} />
      <div className="flex gap-1.5">{children}</div>
    </li>
  );
}

function Hidden({ pin }: { pin: Pin }) {
  return (
    <>
      <input type="hidden" name="pinId" value={pin.id} />
      <input type="hidden" name="returnTo" value="/schedule" />
    </>
  );
}

export default async function SchedulePage() {
  const [settings, scheduled, approved, inflight, failed] = await Promise.all([
    getSettings(),
    listPins({ status: "scheduled" }),
    listPins({ status: "approved" }),
    listPins({ status: ["sending", "sent"] }),
    listPins({ status: "failed" }),
  ]);
  const s = settings.schedule;
  const upcoming = [...scheduled].sort((a, b) => (a.scheduled_for ?? "").localeCompare(b.scheduled_for ?? ""));

  return (
    <>
      <PageHeader
        title="Publishing schedule"
        description={`Approved pins are spread across your posting times (${config.timezone}), with no repeat of a product inside the cooldown and different styles back to back.`}
        actions={
          <form action={togglePauseAction}>
            <input type="hidden" name="returnTo" value="/schedule" />
            <SubmitButton variant={s.paused ? "primary" : "danger"}>{s.paused ? "Resume publishing" : "Pause publishing"}</SubmitButton>
          </form>
        }
      />

      {s.paused && (
        <div className="mb-5">
          <Notice tone="red" title="Publishing is paused">Scheduled pins stay in place but nothing is sent to Zapier until you resume.</Notice>
        </div>
      )}
      {!config.zapier.configured && (
        <div className="mb-5">
          <Notice title="Zapier not configured">Pins can be approved and scheduled, but will not be sent until ZAPIER_WEBHOOK_URL is set (Settings → Zapier).</Notice>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Schedule settings" description="Start slow: 1–3 quality pins per day">
          <form action={saveScheduleAction} className="space-y-3">
            <input type="hidden" name="returnTo" value="/schedule" />
            <div>
              <label className="label" htmlFor="pinsPerDay">Pins per day (max 10)</label>
              <input className="input" id="pinsPerDay" name="pinsPerDay" type="number" min={1} max={10} defaultValue={s.pinsPerDay} />
            </div>
            <div>
              <label className="label" htmlFor="postingTimes">Posting times (HH:MM, comma separated)</label>
              <input className="input" id="postingTimes" name="postingTimes" defaultValue={s.postingTimes.join(", ")} />
            </div>
            <div>
              <label className="label" htmlFor="minGapMinutes">Minimum gap between pins (minutes)</label>
              <input className="input" id="minGapMinutes" name="minGapMinutes" type="number" min={30} max={1440} defaultValue={s.minGapMinutes} />
            </div>
            <div>
              <label className="label" htmlFor="productCooldownDays">Days before the same product is pinned again</label>
              <input className="input" id="productCooldownDays" name="productCooldownDays" type="number" min={1} max={365} defaultValue={s.productCooldownDays} />
            </div>
            <SubmitButton pendingText="Re-planning…">Save & re-plan</SubmitButton>
          </form>
        </Card>

        <Card title={`Upcoming (${upcoming.length})`} className="lg:col-span-2">
          {upcoming.length === 0 ? (
            <EmptyState title="Nothing scheduled">Approve drafts in the <Link className="font-semibold text-brand-700" href="/queue">approval queue</Link>.</EmptyState>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {upcoming.map((p) => (
                <PinRow key={p.id} pin={p}>
                  <form action={sendNowAction}>
                    <Hidden pin={p} />
                    <SubmitButton size="sm" variant="secondary" confirm="Send this pin to Zapier now?" pendingText="Sending…">Send now</SubmitButton>
                  </form>
                  <form action={unscheduleAction}>
                    <Hidden pin={p} />
                    <SubmitButton size="sm" variant="ghost">Unschedule</SubmitButton>
                  </form>
                </PinRow>
              ))}
            </ul>
          )}
          {approved.length > 0 && (
            <div className="mt-4 border-t border-zinc-100 pt-3">
              <div className="text-xs font-semibold text-zinc-500">Approved, waiting for a slot ({approved.length})</div>
              <p className="text-xs text-zinc-500">These are held back by the daily limit or product cooldown and are planned automatically.</p>
              <ul className="divide-y divide-zinc-100">
                {approved.map((p) => (
                  <PinRow key={p.id} pin={p}>
                    <form action={unscheduleAction}>
                      <Hidden pin={p} />
                      <SubmitButton size="sm" variant="ghost">Back to drafts</SubmitButton>
                    </form>
                  </PinRow>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title={`Sent to Zapier, awaiting confirmation (${inflight.length})`} description="Becomes 'published' when your Zap calls back with the Pinterest pin ID">
          {inflight.length === 0 ? (
            <p className="text-sm text-zinc-500">None.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {inflight.map((p) => (
                <PinRow key={p.id} pin={p} />
              ))}
            </ul>
          )}
        </Card>
        <Card title={`Failed (${failed.length})`} description="Blocked by a pre-publish check or rejected by Zapier">
          {failed.length === 0 ? (
            <p className="text-sm text-zinc-500">No failures.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {failed.map((p) => (
                <PinRow key={p.id} pin={p}>
                  <form action={retryPinAction}>
                    <Hidden pin={p} />
                    <SubmitButton size="sm" variant="secondary">Retry</SubmitButton>
                  </form>
                  <form action={rejectPinAction}>
                    <Hidden pin={p} />
                    <SubmitButton size="sm" variant="ghost">Reject</SubmitButton>
                  </form>
                </PinRow>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
