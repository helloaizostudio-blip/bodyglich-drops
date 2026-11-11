"use client";

import { useState } from "react";
import { CheckCircle2, CircleDashed, Clapperboard, Database, ExternalLink, HardDrive, KeyRound, ShieldAlert, TriangleAlert } from "lucide-react";
import type { ProviderCapability } from "@/db/schema";
import type { ProviderStatusView } from "@/server/providers/config";
import type { UsageSummary } from "@/server/services/usage";
import { removeProviderKey, saveProvider, updateAccount, updateStudio, verifyProviderConnection } from "@/server/actions/settings";
import { CAPABILITY_LABELS, PROVIDERS, type ProviderDescriptor } from "@/lib/provider-catalog";
import { timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge, Card, Notice, SectionTitle } from "@/components/ui/misc";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/modal";
import { useRun } from "@/components/ui/use-run";
import { useToast } from "@/components/ui/toast";

const CAPABILITY_ORDER: ProviderCapability[] = ["text", "image", "video", "voice", "render", "youtube"];

export function SettingsView({
  statuses,
  channelName,
  guides,
  user,
  usage,
  system,
}: {
  statuses: ProviderStatusView[];
  channelName: string;
  guides: { styleGuide: string; storyGuide: string };
  user: { name: string; email: string };
  usage: UsageSummary;
  system: { database: "postgres" | "embedded"; storage: "local" | "s3" | "netlify"; secretFromEnv: boolean; secretSource: "env" | "database" | "file"; ffmpeg: boolean };
}) {
  return (
    <div className="flex flex-col gap-5">
      <StudioCard channelName={channelName} guides={guides} />

      <section>
        <SectionTitle>AI providers</SectionTitle>
        <p className="-mt-1.5 mb-3 max-w-3xl text-[13px] leading-relaxed text-muted">
          FRAMEFORGE talks to AI services through swappable adapters. Keys are encrypted and stored on the server — they are never sent back to the browser. A provider is only used after its
          free verification call succeeds, and generating content is billed by the provider to <em>your</em> account, so nothing is ever generated without you pressing a Generate button.
        </p>
        <div className="flex flex-col gap-4">
          {CAPABILITY_ORDER.map((capability) => {
            const list = PROVIDERS.filter((p) => p.capability === capability);
            return (
              <Card key={capability} className="p-4 sm:p-5">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3">
                  <h3 className="text-base font-bold text-navy-900">{CAPABILITY_LABELS[capability].title}</h3>
                  <span className="text-xs text-muted">Used by: {CAPABILITY_LABELS[capability].usedBy}</span>
                </div>
                {capability === "render" ? (
                  <p className="text-[13px] leading-relaxed text-navy-800">
                    Rendering uses <strong>ffmpeg on your own server</strong> — no API key needed. The Video Editor shows whether ffmpeg is available on this host.
                  </p>
                ) : capability === "youtube" ? (
                  <Notice tone="lav" icon={<CircleDashed />} title="Not connected — no YouTube adapter in this build">
                    Direct uploads and automatic analytics need a Google Cloud OAuth client and Google&apos;s API verification, which are not set up yet. Until then, Publishing Center exports a
                    complete publishing package for manual upload, and Analytics accepts numbers typed in from YouTube Studio. Nothing is ever posted to YouTube by FRAMEFORGE.
                  </Notice>
                ) : (
                  <div className="flex flex-col gap-3">
                    {list.map((d) => (
                      <ProviderCard key={d.id} descriptor={d} status={statuses.find((s) => s.id === d.id && s.capability === capability)!} />
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      <Card className="p-5">
        <SectionTitle>Provider usage (last 30 days)</SectionTitle>
        {usage.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-faint">
                <tr>
                  <th className="py-1.5 pr-3 font-bold">Type</th>
                  <th className="py-1.5 pr-3 font-bold">Jobs</th>
                  <th className="py-1.5 pr-3 font-bold">Succeeded</th>
                  <th className="py-1.5 pr-3 font-bold">Failed</th>
                  <th className="py-1.5 font-bold">Tokens in / out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70 text-navy-800">
                {usage.map((u) => (
                  <tr key={u.kind}>
                    <td className="py-2 pr-3 font-semibold capitalize">{u.kind}</td>
                    <td className="py-2 pr-3 tabular-nums">{u.jobs}</td>
                    <td className="py-2 pr-3 tabular-nums">{u.succeeded}</td>
                    <td className="py-2 pr-3 tabular-nums">{u.failed}</td>
                    <td className="py-2 tabular-nums">{u.kind === "text" ? `${u.inputTokens.toLocaleString()} / ${u.outputTokens.toLocaleString()}` : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted">Counts come from FRAMEFORGE&apos;s own job log. For exact charges, check each provider&apos;s billing page.</p>
          </div>
        ) : (
          <p className="text-sm text-muted">No generation jobs have been run yet.</p>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <AccountCard user={user} />
        <Card className="p-5">
          <SectionTitle>System</SectionTitle>
          <ul className="flex flex-col gap-3 text-sm">
            <li className="flex items-start gap-3">
              <Database className="mt-0.5 size-5 shrink-0 text-brand-600" />
              <div>
                <p className="font-semibold text-navy-900">Database: {system.database === "postgres" ? "PostgreSQL (DATABASE_URL)" : "Embedded Postgres on the server disk"}</p>
                {system.database === "embedded" ? (
                  <p className="text-[13px] text-muted">Fine for one server with a persistent disk. For hosted or serverless deployments, set DATABASE_URL to a managed Postgres.</p>
                ) : null}
              </div>
            </li>
            <li className="flex items-start gap-3">
              <HardDrive className="mt-0.5 size-5 shrink-0 text-brand-600" />
              <div>
                <p className="font-semibold text-navy-900">File storage: {system.storage === "s3" ? "S3-compatible bucket" : system.storage === "netlify" ? "Netlify Blobs" : "Server disk"}</p>
                {system.storage === "netlify" ? <p className="text-[13px] text-muted">Files are uploaded and stored in 4 MB parts to fit Netlify&apos;s request limits. Large videos upload more slowly than on a dedicated server.</p> : null}
                {system.storage === "local" ? <p className="text-[13px] text-muted">Uploads live in the server&apos;s data folder. Use a persistent volume, or configure an S3-compatible bucket.</p> : null}
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Clapperboard className={system.ffmpeg ? "mt-0.5 size-5 shrink-0 text-brand-600" : "mt-0.5 size-5 shrink-0 text-warn-700"} />
              <div>
                <p className="font-semibold text-navy-900">Video rendering: {system.ffmpeg ? "ffmpeg is available" : "not available on this host"}</p>
                {!system.ffmpeg ? (
                  <p className="text-[13px] text-muted">
                    This host has no ffmpeg, so the Video Editor cannot render the final MP4 here. Everything else works; export your clips and audio, or move FRAMEFORGE to a container host to render in the studio.
                  </p>
                ) : null}
              </div>
            </li>
            <li className="flex items-start gap-3">
              {system.secretFromEnv ? <KeyRound className="mt-0.5 size-5 shrink-0 text-brand-600" /> : <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warn-700" />}
              <div>
                <p className="font-semibold text-navy-900">
                  Encryption secret: {system.secretSource === "env" ? "APP_SECRET is set" : system.secretSource === "database" ? "derived from this site's database credentials" : "auto-generated file"}
                </p>
                {!system.secretFromEnv ? (
                  <p className="text-[13px] text-muted">Set the APP_SECRET environment variable in production so saved provider keys survive redeploys.</p>
                ) : null}
              </div>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ProviderStatusView }) {
  if (status.status === "connected")
    return (
      <Badge tone="ok">
        <CheckCircle2 className="size-3" /> Connected
      </Badge>
    );
  if (status.status === "error")
    return (
      <Badge tone="bad">
        <TriangleAlert className="size-3" /> Verification failed
      </Badge>
    );
  if (status.status === "unverified") return <Badge tone="warn">Key saved · not verified</Badge>;
  return <Badge tone="gray">Not connected</Badge>;
}

function ProviderCard({ descriptor: d, status }: { descriptor: ProviderDescriptor; status: ProviderStatusView }) {
  const { run, pending } = useRun();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [config, setConfig] = useState(status.config);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const verify = async () => {
    const res = await run(verifyProviderConnection({ capability: d.capability, providerId: d.id }));
    if (!res) return;
    if (res.connected) toast.success(`${d.name} is connected`);
    else toast.error(res.error ?? "Verification failed");
  };

  const save = async () => {
    const ok = await run(saveProvider({ capability: d.capability, providerId: d.id, apiKey: apiKey || undefined, config }), "Saved");
    if (ok) {
      const hadNewKey = !!apiKey;
      setApiKey("");
      if (hadNewKey || status.hasKey) await verify();
    }
  };

  return (
    <div className="rounded-2xl bg-brand-50 ring-1 ring-line/70">
      <button type="button" className="flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 p-3.5 text-left" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="min-w-0 flex-1 basis-40">
          <span className="block text-sm font-bold text-navy-900">
            {d.name} <span className="font-medium text-muted">· {d.vendor}</span>
          </span>
          <span className="block text-xs text-muted">{d.description}</span>
        </span>
        <StatusBadge status={status} />
        <span className="text-xs font-semibold text-brand-700">{open ? "Hide" : "Set up"}</span>
      </button>

      {open ? (
        <div className="flex flex-col gap-4 border-t border-line/70 p-3.5">
          {status.status === "error" && status.lastError ? (
            <Notice tone="warn" icon={<TriangleAlert />} title="Last verification failed">
              {status.lastError}
            </Notice>
          ) : null}

          <ol className="list-decimal space-y-1 pl-5 text-[13px] leading-relaxed text-navy-800">
            {d.setup.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-semibold">
            <a href={d.keysUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-700 hover:underline">
              Get an API key <ExternalLink className="size-3.5" />
            </a>
            <a href={d.docsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-700 hover:underline">
              Documentation <ExternalLink className="size-3.5" />
            </a>
          </div>

          <TextField
            label="API key"
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={status.hasKey ? `Saved (${status.keyHint ?? "hidden"}) — paste a new key to replace it` : d.keyPlaceholder}
            hint={
              status.keySource === "environment"
                ? `Currently using the ${d.envVar} environment variable. A key saved here takes priority.`
                : `Stored encrypted on the server. You can also set the ${d.envVar} environment variable instead.`
            }
          />

          <div className="grid gap-4 sm:grid-cols-2">
            {d.fields.map((f) => (
              <SelectField key={f.key} label={f.label} hint={f.hint} value={config[f.key] ?? f.default} onChange={(e) => setConfig((c) => ({ ...c, [f.key]: e.target.value }))}>
                {(f.options ?? []).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectField>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" loading={pending} onClick={save}>
              {apiKey ? "Save & verify" : "Save"}
            </Button>
            <Button size="sm" variant="secondary" loading={pending} disabled={!status.hasKey} onClick={verify}>
              Verify connection
            </Button>
            {status.keySource === "settings" ? (
              <Button size="sm" variant="ghost" className="!text-bad-700 hover:!bg-bad-100" onClick={() => setConfirmRemove(true)}>
                Remove key
              </Button>
            ) : null}
            {status.lastVerifiedAt ? <span className="text-xs text-muted">Last checked {timeAgo(status.lastVerifiedAt)}</span> : null}
          </div>

          <p className="text-xs leading-relaxed text-muted">
            {d.billing} Adapter built from: {d.verifiedFrom} It has not been run against a live paid account by the developers of this build, so treat the first generation as a test.
          </p>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title={`Remove the ${d.name} key?`}
        message="The saved key is deleted from this server. Features that use this provider stop working until a key is added again."
        confirmLabel="Remove key"
        onConfirm={async () => {
          await run(removeProviderKey({ capability: d.capability, providerId: d.id }), "Key removed");
          setConfirmRemove(false);
        }}
      />
    </div>
  );
}

function StudioCard({ channelName, guides }: { channelName: string; guides: { styleGuide: string; storyGuide: string } }) {
  const { run, pending } = useRun();
  const [name, setName] = useState(channelName);
  const [styleGuide, setStyleGuide] = useState(guides.styleGuide);
  const [storyGuide, setStoryGuide] = useState(guides.storyGuide);
  return (
    <Card className="p-5">
      <SectionTitle>Studio</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-2">
        <TextField label="YouTube channel name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="lg:col-span-2 lg:max-w-sm" />
        <TextAreaField
          label="Visual style guide"
          rows={5}
          value={styleGuide}
          onChange={(e) => setStyleGuide(e.target.value)}
          placeholder="e.g. Blocky 3D cartoon characters with square heads, soft studio lighting, bright saturated colours, clean sky-blue backgrounds, friendly kid-safe look."
          hint="Added to every image and animation prompt so all visuals share one look."
        />
        <TextAreaField
          label="Story & humour guide"
          rows={5}
          value={storyGuide}
          onChange={(e) => setStoryGuide(e.target.value)}
          placeholder="e.g. Fast-paced friendship comedy for ages 8–16. Running gags, no swearing, every episode ends with a twist."
          hint="Given to Story Engine and the assistant whenever they write for this channel."
        />
      </div>
      <Button className="mt-4" loading={pending} disabled={!name.trim()} onClick={() => run(updateStudio({ channelName: name, styleGuide, storyGuide }), "Studio settings saved")}>
        Save studio settings
      </Button>
    </Card>
  );
}

function AccountCard({ user }: { user: { name: string; email: string } }) {
  const { run, pending } = useRun();
  const [name, setName] = useState(user.name);
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  return (
    <Card className="p-5">
      <SectionTitle>Account</SectionTitle>
      <div className="flex flex-col gap-4">
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        <TextField label="Email" value={user.email} disabled readOnly />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Current password" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} />
          <TextField label="New password" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNew(e.target.value)} hint="Leave empty to keep your password." />
        </div>
        <Button
          className="self-start"
          loading={pending}
          disabled={!name.trim()}
          onClick={async () => {
            const ok = await run(updateAccount({ name, currentPassword: currentPassword || undefined, newPassword: newPassword || undefined }), "Account saved");
            if (ok) {
              setCurrent("");
              setNew("");
            }
          }}
        >
          Save account
        </Button>
      </div>
    </Card>
  );
}
