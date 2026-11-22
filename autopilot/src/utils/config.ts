import path from "node:path";

/**
 * Central, typed access to environment configuration.
 * Values are read lazily so tests and the worker can set process.env first.
 * Nothing here is ever logged or sent to the browser.
 */
function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

export const config = {
  get publicBaseUrl() {
    return (env("PUBLIC_BASE_URL") ?? "http://localhost:3000").replace(/\/+$/, "");
  },
  get dashboardPassword() {
    return env("DASHBOARD_PASSWORD");
  },
  get appSecret() {
    return env("APP_SECRET");
  },
  get databaseUrl() {
    return env("DATABASE_URL");
  },
  get sqlitePath() {
    return path.resolve(/*turbopackIgnore: true*/ env("SQLITE_PATH") ?? "./data/autopilot.db");
  },
  get dataDir() {
    return path.resolve(/*turbopackIgnore: true*/ env("DATA_DIR") ?? "./data");
  },
  get mediaDir() {
    return path.join(this.dataDir, "media");
  },
  get timezone() {
    return env("APP_TIMEZONE") ?? "Asia/Kolkata";
  },
  amazon: {
    get partnerTag() {
      return env("AMAZON_PARTNER_TAG");
    },
    get credentialId() {
      return env("AMAZON_CREATORS_CREDENTIAL_ID");
    },
    get credentialSecret() {
      return env("AMAZON_CREATORS_CREDENTIAL_SECRET");
    },
    get credentialVersion() {
      return env("AMAZON_CREATORS_CREDENTIAL_VERSION") ?? "3.1";
    },
    get tokenUrl() {
      return env("AMAZON_CREATORS_TOKEN_URL") ?? "https://api.amazon.co.uk/auth/o2/token";
    },
    get scope() {
      return env("AMAZON_CREATORS_SCOPE") ?? "creatorsapi::default";
    },
    get apiBase() {
      return (env("AMAZON_CREATORS_API_BASE") ?? "https://creatorsapi.amazon").replace(/\/+$/, "");
    },
    get marketplace() {
      return env("AMAZON_MARKETPLACE") ?? "www.amazon.in";
    },
    get apiConfigured() {
      return Boolean(this.credentialId && this.credentialSecret && this.partnerTag);
    },
  },
  claude: {
    get apiKey() {
      return env("ANTHROPIC_API_KEY");
    },
    get model() {
      return env("CLAUDE_MODEL") ?? "claude-opus-5-5";
    },
    get configured() {
      return Boolean(this.apiKey);
    },
  },
  higgsfield: {
    get keyId() {
      return env("HIGGSFIELD_API_KEY_ID");
    },
    get keySecret() {
      return env("HIGGSFIELD_API_KEY_SECRET");
    },
    get apiBase() {
      return (env("HIGGSFIELD_API_BASE") ?? "https://platform.higgsfield.ai").replace(/\/+$/, "");
    },
    get model() {
      return env("HIGGSFIELD_MODEL") ?? "higgsfield-ai/soul/standard";
    },
    get configured() {
      return Boolean(this.keyId && this.keySecret);
    },
  },
  zapier: {
    get webhookUrl() {
      return env("ZAPIER_WEBHOOK_URL");
    },
    get callbackSecret() {
      return env("ZAPIER_CALLBACK_SECRET");
    },
    get configured() {
      return Boolean(this.webhookUrl);
    },
  },
  pinterest: {
    get appId() {
      return env("PINTEREST_APP_ID");
    },
    get appSecret() {
      return env("PINTEREST_APP_SECRET");
    },
    get trendsRegion() {
      return env("PINTEREST_TRENDS_REGION") ?? "IN";
    },
    get oauthConfigured() {
      return Boolean(this.appId && this.appSecret);
    },
    get redirectUri() {
      return `${config.publicBaseUrl}/api/pinterest/oauth/callback`;
    },
  },
};

export function isPublicBaseUrlReachable(): boolean {
  try {
    const u = new URL(config.publicBaseUrl);
    return !["localhost", "127.0.0.1", "0.0.0.0"].includes(u.hostname) && u.protocol === "https:";
  } catch {
    return false;
  }
}
