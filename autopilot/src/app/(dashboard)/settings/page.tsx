import { AlertTriangle, CheckCircle2, CircleDashed } from "lucide-react";
import { Badge, Card, Notice, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import {
  disconnectPinterestAction,
  importPinterestBoardsAction,
  saveBoardsAction,
  saveCommissionAction,
  saveDiscoveryAction,
  setApprovalAction,
  setImageProviderAction,
} from "@/app/actions";
import { getSettings } from "@/database/settings";
import { getIntegrationStatuses, type IntegrationStatus } from "@/dashboard/integrations";
import { CATEGORIES, CATEGORY_KEYS } from "@/services/product-research/categories";
import { pinterestConnection } from "@/services/pinterest/api";
import { config } from "@/utils/config";

function StateIcon({ s }: { s: IntegrationStatus }) {
  if (s.state === "ready") return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
  if (s.state === "partial") return <CircleDashed className="h-5 w-5 text-amber-500" />;
  return <AlertTriangle className={`h-5 w-5 ${s.required ? "text-red-500" : "text-zinc-400"}`} />;
}

const SETUP: Record<string, React.ReactNode> = {
  amazon_tag: (
    <p>
      Set <code>AMAZON_PARTNER_TAG</code> to your Amazon.in tracking ID (for example <code>yourname-21</code>). Every pin link is checked against it before approval and before sending.
    </p>
  ),
  amazon_api: (
    <ol className="list-decimal space-y-1 pl-5">
      <li>In Associates Central (amazon.in), open <em>Tools → Creators API</em>. Amazon grants access only to eligible accounts (typically after qualifying sales).</li>
      <li>Create a credential and copy the <strong>Credential ID</strong>, <strong>Secret</strong> and <strong>Version</strong>.</li>
      <li>
        Set <code>AMAZON_CREATORS_CREDENTIAL_ID</code>, <code>AMAZON_CREATORS_CREDENTIAL_SECRET</code>, <code>AMAZON_CREATORS_CREDENTIAL_VERSION</code>. Check the token URL and scope shown for your credential version and set <code>AMAZON_CREATORS_TOKEN_URL</code> / <code>AMAZON_CREATORS_SCOPE</code> if they differ from the defaults.
      </li>
      <li>Restart the app and worker, then use <em>Run discovery now</em> on the Discover page.</li>
    </ol>
  ),
  claude: (
    <p>
      Set <code>ANTHROPIC_API_KEY</code> (from console.anthropic.com). Optional <code>CLAUDE_MODEL</code> (default <code>claude-opus-5-5</code>). Without a key, pins use built-in template copy.
    </p>
  ),
  higgsfield: (
    <p>
      Set <code>HIGGSFIELD_API_KEY_ID</code> and <code>HIGGSFIELD_API_KEY_SECRET</code> from Higgsfield Cloud, then choose the Higgsfield image provider below. Optionally set <code>HIGGSFIELD_MODEL</code> to a text-to-image model on your account. AI images are used as mood backgrounds only, never as fake product photos, and are labelled &ldquo;Illustrative image&rdquo;.
    </p>
  ),
  zapier: (
    <ol className="list-decimal space-y-1 pl-5">
      <li>
        In Zapier create a Zap. <strong>Trigger:</strong> Webhooks by Zapier → <em>Catch Hook</em>. Copy the hook URL into <code>ZAPIER_WEBHOOK_URL</code>.
      </li>
      <li>Send one pin so Zapier learns the fields: approve a pin, then press <em>Send now</em> on the Schedule page. While the Zap is off, Zapier only records the sample and creates no pin.</li>
      <li>
        <strong>Action:</strong> Pinterest → <em>Create Pin</em>. Map: Board → <em>Custom value</em> <code>board_id</code> · Title → <code>title</code> · Description → <code>description</code> · Link → <code>link</code> · Image → <code>image_url</code>.
      </li>
      <li>
        <strong>Optional, recommended:</strong> add Webhooks by Zapier → <em>POST</em> to <code>callback_url</code> with JSON data <code>pin_id</code>, <code>callback_token</code> (both from step 1) and <code>pinterest_pin_id</code> (the ID from the Create Pin step). The app then marks the pin as published.
      </li>
      <li>Turn the Zap on. Set <code>APP_SECRET</code> (or <code>ZAPIER_CALLBACK_SECRET</code>) so callbacks can be verified.</li>
    </ol>
  ),
  public_url: (
    <p>
      Deploy the app somewhere with HTTPS and set <code>PUBLIC_BASE_URL</code> to that address. Zapier downloads each pin image from <code>{config.publicBaseUrl}/api/media/…</code>. Image URLs are public, but everything else needs the dashboard login.
    </p>
  ),
  pinterest_api: (
    <ol className="list-decimal space-y-1 pl-5">
      <li>Create an app at developers.pinterest.com (read access to boards, pins and user accounts).</li>
      <li>
        Add the redirect URI <code>{config.pinterest.redirectUri}</code>.
      </li>
      <li>
        Set <code>PINTEREST_APP_ID</code>, <code>PINTEREST_APP_SECRET</code> and <code>APP_SECRET</code>, restart, then click <em>Connect Pinterest</em>. Tokens are stored encrypted.
      </li>
    </ol>
  ),
  security: (
    <p>
      Set <code>DASHBOARD_PASSWORD</code> (dashboard login) and <code>APP_SECRET</code> (a random 32+ character string for signing and encryption). Keep all keys in <code>.env.local</code> or your host&apos;s secret store. Never commit them.
    </p>
  ),
};

export default async function SettingsPage() {
  const [settings, statuses, pin] = await Promise.all([getSettings(), getIntegrationStatuses(), pinterestConnection()]);

  return (
    <>
      <PageHeader title="Settings & setup" description="Integrations are configured with environment variables. This page shows what's connected and walks you through the rest. Secret values are never displayed." />

      <div className="space-y-3">
        {statuses.map((s) => (
          <details key={s.key} className="card group" open={s.state !== "ready" && s.required}>
            <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4">
              <StateIcon s={s} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                  {s.name}
                  {s.required ? <Badge tone="brand">required</Badge> : <Badge>optional</Badge>}
                </div>
                <div className="text-xs text-zinc-500">{s.summary}</div>
              </div>
              <span className="text-xs text-zinc-400 group-open:hidden">Show steps</span>
            </summary>
            <div className="border-t border-zinc-100 px-5 py-4 text-sm leading-relaxed text-zinc-700 [&_code]:rounded [&_code]:bg-zinc-100 [&_code]:px-1 [&_code]:text-[12px]">
              {SETUP[s.key]}
              {s.key === "pinterest_api" && config.pinterest.oauthConfigured && (
                <div className="mt-3 flex gap-2">
                  {pin.connected ? (
                    <>
                      <form action={importPinterestBoardsAction}>
                        <input type="hidden" name="returnTo" value="/settings" />
                        <SubmitButton variant="secondary" size="sm">Match board IDs from Pinterest</SubmitButton>
                      </form>
                      <form action={disconnectPinterestAction}>
                        <input type="hidden" name="returnTo" value="/settings" />
                        <SubmitButton variant="danger" size="sm">Disconnect</SubmitButton>
                      </form>
                    </>
                  ) : (
                    <a href="/api/pinterest/oauth/start" className="btn btn-primary btn-sm">Connect Pinterest</a>
                  )}
                </div>
              )}
            </div>
          </details>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card title="Publishing approval" description="Manual approval is on by default and strongly recommended">
          <form action={setApprovalAction} className="space-y-3 text-sm">
            <input type="hidden" name="returnTo" value="/settings" />
            <label className="flex items-center gap-2">
              <input type="radio" name="requireApproval" value="true" defaultChecked={settings.requireApproval} /> Require my approval for every pin
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="requireApproval" value="false" defaultChecked={!settings.requireApproval} /> Auto-approve drafts with no compliance flags
            </label>
            <div>
              <label className="label" htmlFor="confirm">To turn auto-approve on, type AUTO</label>
              <input className="input" id="confirm" name="confirm" autoComplete="off" />
            </div>
            <SubmitButton variant="secondary">Save</SubmitButton>
          </form>
        </Card>

        <Card title="Pin images" description="Where pin artwork comes from">
          <form action={setImageProviderAction} className="space-y-3 text-sm">
            <input type="hidden" name="returnTo" value="/settings" />
            <label className="flex items-start gap-2">
              <input type="radio" name="imageProvider" value="template" defaultChecked={settings.imageProvider === "template"} className="mt-1" />
              <span><strong>Original templates</strong>: typographic designs rendered locally (6 styles, rotating palettes). Free and always available.</span>
            </label>
            <label className="flex items-start gap-2">
              <input type="radio" name="imageProvider" value="higgsfield" defaultChecked={settings.imageProvider === "higgsfield"} disabled={!config.higgsfield.configured} className="mt-1" />
              <span>
                <strong>Higgsfield AI backgrounds + templates</strong>: AI mood scenes under the same typography, labelled &ldquo;Illustrative image&rdquo;. Falls back to templates on error.
                {!config.higgsfield.configured && <span className="block text-xs text-amber-700">Configure Higgsfield keys first.</span>}
              </span>
            </label>
            <SubmitButton variant="secondary">Save</SubmitButton>
          </form>
        </Card>
      </div>

      <Card title="Product discovery" className="mt-6" description="Used by the daily discovery job">
        <form action={saveDiscoveryAction} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="returnTo" value="/settings" />
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="enabled" defaultChecked={settings.discovery.enabled} /> Discovery enabled
            </label>
          </div>
          <fieldset className="md:col-span-2">
            <legend className="label">Categories to research</legend>
            <div className="grid grid-cols-2 gap-1.5 text-sm sm:grid-cols-3">
              {CATEGORY_KEYS.map((k) => (
                <label key={k} className="flex items-center gap-2">
                  <input type="checkbox" name="categories" value={k} defaultChecked={settings.discovery.categories.includes(k)} /> {CATEGORIES[k].label}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label className="label" htmlFor="maxSearchesPerRun">Searches per run</label>
            <input className="input" id="maxSearchesPerRun" name="maxSearchesPerRun" type="number" min={1} max={40} defaultValue={settings.discovery.maxSearchesPerRun} />
          </div>
          <div>
            <label className="label" htmlFor="minScoreToShortlist">Minimum score to shortlist</label>
            <input className="input" id="minScoreToShortlist" name="minScoreToShortlist" type="number" min={0} max={100} defaultValue={settings.discovery.minScoreToShortlist} />
          </div>
          <div>
            <label className="label" htmlFor="autoGenerateTopN">Auto-create drafts for top N new products per run</label>
            <input className="input" id="autoGenerateTopN" name="autoGenerateTopN" type="number" min={0} max={20} defaultValue={settings.discovery.autoGenerateTopN} />
          </div>
          <div>
            <label className="label" htmlFor="lookaheadDays">Seasonal look-ahead (days)</label>
            <input className="input" id="lookaheadDays" name="lookaheadDays" type="number" min={0} max={120} defaultValue={settings.discovery.lookaheadDays} />
          </div>
          <div className="md:col-span-2">
            <label className="label" htmlFor="customKeywords">Custom keywords, one per line. Optionally add <code>| category_key</code></label>
            <textarea className="textarea font-mono text-xs" id="customKeywords" name="customKeywords" rows={4} defaultValue={settings.discovery.customKeywords.join("\n")} placeholder="bamboo bath mat | home_decor" />
          </div>
          <div>
            <SubmitButton variant="secondary">Save discovery settings</SubmitButton>
          </div>
        </form>
      </Card>

      <Card title="Commission rates" className="mt-6" description="Enter the current rates from the Amazon.in Associates fee schedule. Blank means unknown: the app never assumes a rate.">
        <form action={saveCommissionAction}>
          <input type="hidden" name="returnTo" value="/settings" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {CATEGORY_KEYS.map((k) => (
              <div key={k}>
                <label className="label" htmlFor={`rate_${k}`}>{CATEGORIES[k].label} (%)</label>
                <input className="input" id={`rate_${k}`} name={`rate_${k}`} inputMode="decimal" defaultValue={settings.commissionRates[k] ?? ""} />
              </div>
            ))}
          </div>
          <div className="mt-4">
            <SubmitButton variant="secondary">Save rates</SubmitButton>
          </div>
        </form>
      </Card>

      <Card title="Pinterest boards" className="mt-6" description="The system picks a board per product: seasonal campaign match first, then category. Board ID is the Pinterest board ID your Zap uses.">
        <Notice tone="blue">Create these boards on Pinterest first. Then connect the Pinterest API and click &ldquo;Match board IDs&rdquo;, or paste the IDs from Zapier&apos;s Board dropdown.</Notice>
        <form action={saveBoardsAction} className="mt-4">
          <input type="hidden" name="returnTo" value="/settings" />
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Board name</th>
                  <th>Pinterest board ID</th>
                  <th>Categories (keys, comma separated)</th>
                  <th>Campaigns (keys)</th>
                </tr>
              </thead>
              <tbody>
                {[...settings.boards, { name: "", pinterestBoardId: null, categories: [], campaigns: [] }].map((b, i) => (
                  <tr key={i}>
                    <td><input className="input" name="board_name" defaultValue={b.name} placeholder={i === settings.boards.length ? "Add a board…" : ""} aria-label="Board name" /></td>
                    <td><input className="input font-mono text-xs" name="board_id" defaultValue={b.pinterestBoardId ?? ""} aria-label="Board ID" /></td>
                    <td><input className="input text-xs" name="board_categories" defaultValue={b.categories.join(", ")} aria-label="Categories" /></td>
                    <td><input className="input text-xs" name="board_campaigns" defaultValue={b.campaigns.join(", ")} aria-label="Campaigns" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-zinc-500">Clear a board&apos;s name to remove it. Category keys: {CATEGORY_KEYS.join(", ")}.</p>
          <div className="mt-3">
            <SubmitButton variant="secondary">Save boards</SubmitButton>
          </div>
        </form>
      </Card>
    </>
  );
}
