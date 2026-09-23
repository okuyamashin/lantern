export const GUILD_DOMAINS = ["engawa.jp", "fledge-inc.com"] as const;

export function isGuildEmail(email?: string | null): boolean {
  const value = (email ?? "").trim().toLowerCase();
  return GUILD_DOMAINS.some((domain) => value.endsWith(`@${domain}`));
}

export function decodeJwtPayload(token: string): Record<string, unknown> {
  const part = token.split(".")[1];
  if (!part) {
    return {};
  }
  try {
    return JSON.parse(base64UrlDecode(part)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function emailFromToken(token: string): string {
  const email = decodeJwtPayload(token).email;
  return typeof email === "string" ? email : "";
}

function base64UrlDecode(value: string): string {
  const pad = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + pad).replaceAll("-", "+").replaceAll("_", "/");
  if (typeof atob === "function") {
    return atob(base64);
  }
  return Buffer.from(base64, "base64").toString("utf8");
}
