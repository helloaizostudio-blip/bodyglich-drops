import { safeEqual } from "./crypto";

/**
 * Checks the `Authorization: Bearer <IMPORT_API_TOKEN>` header used by the machine endpoints.
 * Returns "disabled" when no (long enough) token is configured.
 */
export function checkApiToken(req: Request): "ok" | "disabled" | "denied" {
  const token = process.env.IMPORT_API_TOKEN?.trim();
  if (!token || token.length < 24) return "disabled";
  const auth = req.headers.get("authorization") ?? "";
  const given = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  return given && safeEqual(given, token) ? "ok" : "denied";
}
