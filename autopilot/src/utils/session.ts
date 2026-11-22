/**
 * Dashboard session tokens: "<expiryMs>.<hmac>" signed with APP_SECRET (or the password).
 * Uses Web Crypto so it works in the proxy and in route handlers.
 */
export const SESSION_COOKIE = "autopilot_session";
const SESSION_DAYS = 14;

function signingKey(): string | undefined {
  return process.env.APP_SECRET?.trim() || process.env.DASHBOARD_PASSWORD?.trim() || undefined;
}

async function hmac(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Buffer.from(sig).toString("base64url");
}

export async function createSessionToken(): Promise<{ token: string; maxAge: number }> {
  const secret = signingKey();
  if (!secret) throw new Error("No signing key");
  const exp = Date.now() + SESSION_DAYS * 86_400_000;
  return { token: `${exp}.${await hmac(`session:${exp}`, secret)}`, maxAge: SESSION_DAYS * 86_400 };
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  const secret = signingKey();
  if (!token || !secret) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const expected = await hmac(`session:${exp}`, secret);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

export function passwordMatches(input: string): boolean {
  const pw = process.env.DASHBOARD_PASSWORD?.trim();
  if (!pw) return false;
  if (input.length !== pw.length) return false;
  let diff = 0;
  for (let i = 0; i < pw.length; i++) diff |= pw.charCodeAt(i) ^ input.charCodeAt(i);
  return diff === 0;
}
