import { decodeJwtPayload, emailFromToken, isGuildEmail } from "./guild.ts";

const sessionKey = "lantern.auth";
const pkceKey = "lantern.pkce";

type Session = {
  idToken: string;
  accessToken: string;
  refreshToken?: string;
  email: string;
  exp: number;
};

export function authEnabled(): boolean {
  return Boolean(cognitoDomain() && cognitoClientId());
}

export function currentSession(): Session | null {
  const raw = sessionStorage.getItem(sessionKey);
  if (!raw) {
    return null;
  }
  try {
    const session = JSON.parse(raw) as Session;
    if (!session.idToken || session.exp * 1000 <= Date.now() + 15_000) {
      sessionStorage.removeItem(sessionKey);
      return null;
    }
    return session;
  } catch {
    sessionStorage.removeItem(sessionKey);
    return null;
  }
}

export function canDraw(): boolean {
  if (!authEnabled()) {
    return import.meta.env.DEV;
  }
  return isGuildEmail(currentSession()?.email);
}

export function authHeaders(): Record<string, string> {
  const session = currentSession();
  return session ? { Authorization: `Bearer ${session.idToken}` } : {};
}

export async function restoreSession(): Promise<void> {
  if (!authEnabled()) {
    return;
  }
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  if (!code) {
    return;
  }
  const verifier = sessionStorage.getItem(pkceKey) ?? "";
  sessionStorage.removeItem(pkceKey);
  const tokens = await exchangeCode(code, verifier);
  saveSession(tokens);
  window.history.replaceState({}, "", window.location.pathname);
}

export async function login(): Promise<void> {
  const domain = cognitoDomain();
  const clientId = cognitoClientId();
  if (!domain || !clientId) {
    return;
  }
  const verifier = randomVerifier();
  sessionStorage.setItem(pkceKey, verifier);
  const url = new URL(`https://${domain}/oauth2/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("identity_provider", "Google");
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("code_challenge", await challenge(verifier));
  window.location.assign(url.toString());
}

export function logout(): void {
  sessionStorage.removeItem(sessionKey);
  sessionStorage.removeItem(pkceKey);
  const domain = cognitoDomain();
  const clientId = cognitoClientId();
  if (!domain || !clientId) {
    window.location.assign(redirectUri());
    return;
  }
  const url = new URL(`https://${domain}/logout`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("logout_uri", redirectUri());
  window.location.assign(url.toString());
}

function saveSession(tokens: {
  id_token?: string;
  access_token?: string;
  refresh_token?: string;
}): void {
  if (!tokens.id_token) {
    throw new Error("ログイン情報を受け取れませんでした。");
  }
  const payload = decodeJwtPayload(tokens.id_token);
  const session: Session = {
    idToken: tokens.id_token,
    accessToken: tokens.access_token ?? tokens.id_token,
    refreshToken: tokens.refresh_token,
    email: emailFromToken(tokens.id_token),
    exp: typeof payload.exp === "number" ? payload.exp : 0,
  };
  sessionStorage.setItem(sessionKey, JSON.stringify(session));
}

async function exchangeCode(code: string, verifier: string): Promise<{
  id_token?: string;
  access_token?: string;
  refresh_token?: string;
}> {
  const domain = cognitoDomain();
  const clientId = cognitoClientId();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    code,
    redirect_uri: redirectUri(),
    code_verifier: verifier,
  });
  const response = await fetch(`https://${domain}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    throw new Error("Google ログインを完了できませんでした。");
  }
  return (await response.json()) as {
    id_token?: string;
    access_token?: string;
    refresh_token?: string;
  };
}

function redirectUri(): string {
  return `${window.location.origin}/`;
}

function cognitoDomain(): string {
  return String(import.meta.env.VITE_COGNITO_DOMAIN ?? "")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
}

function cognitoClientId(): string {
  return String(import.meta.env.VITE_COGNITO_CLIENT_ID ?? "").trim();
}

function randomVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

async function challenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
