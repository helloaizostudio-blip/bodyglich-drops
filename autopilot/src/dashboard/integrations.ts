import { config, isPublicBaseUrlReachable } from "@/utils/config";
import { pinterestConnection } from "@/services/pinterest/api";

export type IntegrationState = "ready" | "partial" | "missing";

export interface IntegrationStatus {
  key: string;
  name: string;
  state: IntegrationState;
  summary: string;
  required: boolean;
}

/** What is configured, what is missing — shown on the overview and setup screens. Never exposes secret values. */
export async function getIntegrationStatuses(): Promise<IntegrationStatus[]> {
  const pin = await pinterestConnection().catch(() => ({ connected: false, expiresAt: null, scope: null }));
  return [
    {
      key: "amazon_tag",
      name: "Amazon Associates tracking ID",
      required: true,
      state: config.amazon.partnerTag ? "ready" : "missing",
      summary: config.amazon.partnerTag ? `Links are checked against "${config.amazon.partnerTag}"` : "Set AMAZON_PARTNER_TAG so affiliate links can be validated",
    },
    {
      key: "amazon_api",
      name: "Amazon Creators API",
      required: false,
      state: config.amazon.apiConfigured ? "ready" : "missing",
      summary: config.amazon.apiConfigured
        ? `Credential v${config.amazon.credentialVersion}, marketplace ${config.amazon.marketplace}`
        : "Not configured: automatic discovery is off. Use manual import with links from Associates Central.",
    },
    {
      key: "claude",
      name: "Claude (AI copywriting)",
      required: false,
      state: config.claude.configured ? "ready" : "partial",
      summary: config.claude.configured ? `Model ${config.claude.model}` : "No API key: pins use template copy (labelled 'template')",
    },
    {
      key: "higgsfield",
      name: "Higgsfield (AI backgrounds)",
      required: false,
      state: config.higgsfield.configured ? "ready" : "partial",
      summary: config.higgsfield.configured ? `Model ${config.higgsfield.model}` : "Not configured: pins use original vector templates",
    },
    {
      key: "zapier",
      name: "Zapier → Pinterest publishing",
      required: true,
      state: config.zapier.configured && (config.zapier.callbackSecret || config.appSecret) ? "ready" : config.zapier.configured ? "partial" : "missing",
      summary: !config.zapier.configured
        ? "Set ZAPIER_WEBHOOK_URL (Catch Hook) to publish approved pins"
        : config.zapier.callbackSecret || config.appSecret
          ? "Webhook configured; callbacks verified with a signed token"
          : "Webhook set, but no secret for callback verification (set APP_SECRET)",
    },
    {
      key: "public_url",
      name: "Public image URL",
      required: true,
      state: isPublicBaseUrlReachable() ? "ready" : "missing",
      summary: isPublicBaseUrlReachable()
        ? `Images served from ${config.publicBaseUrl}/api/media/…`
        : `PUBLIC_BASE_URL is ${config.publicBaseUrl}. Zapier needs a public https URL to download pin images.`,
    },
    {
      key: "pinterest_api",
      name: "Pinterest API (analytics, boards, trends)",
      required: false,
      state: pin.connected ? "ready" : config.pinterest.oauthConfigured ? "partial" : "missing",
      summary: pin.connected
        ? "Connected (read-only)"
        : config.pinterest.oauthConfigured
          ? "App configured: click Connect Pinterest in Settings"
          : "Optional. Without it, impressions and clicks can't be pulled automatically.",
    },
    {
      key: "security",
      name: "Dashboard security",
      required: true,
      state: config.dashboardPassword && config.appSecret ? "ready" : "missing",
      summary:
        config.dashboardPassword && config.appSecret
          ? "Password login and encrypted token storage enabled"
          : "Set DASHBOARD_PASSWORD and APP_SECRET before deploying (without a password, only localhost can open the dashboard)",
    },
  ];
}
