export const SESSION_PROOF_COOKIE = "hc_session_proof";
export const SESSION_PROOF_HEADER = "x-session-proof";
const SESSION_PROOF_TTL_SECONDS = 60 * 60 * 24 * 30;
const SESSION_PROOF_TTL_MS = SESSION_PROOF_TTL_SECONDS * 1000;

export type SessionProofPayload = {
  session_id: string;
  app_origin: string;
  ts: number;
};

export function isPublicWebOrigin(origin: string | null | undefined): origin is string {
  if (!origin) return false;

  try {
    const parsed = new URL(origin);
    return parsed.protocol === "https:" || (parsed.protocol === "http:" && parsed.hostname === "localhost");
  } catch {
    return false;
  }
}

export function createCorsHeaders(origin?: string | null, allowCredentials = false): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-session-id, x-session-proof, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    Vary: "Origin",
  };

  if (origin && isPublicWebOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    if (allowCredentials) {
      headers["Access-Control-Allow-Credentials"] = "true";
    }
    return headers;
  }

  headers["Access-Control-Allow-Origin"] = "*";
  return headers;
}

function toBase64Url(bytes: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function secureEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return diff === 0;
}

async function signValue(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return toBase64Url(new Uint8Array(signature));
}

export async function signJsonPayload<T>(payload: T, secret: string): Promise<string> {
  const encodedPayload = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await signValue(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export async function parseSignedJsonPayload<T>(value: string, secret: string): Promise<T | null> {
  const [encodedPayload, signature] = value.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = await signValue(encodedPayload, secret);
  if (!secureEqual(signature, expectedSignature)) return null;

  try {
    const payloadJson = new TextDecoder().decode(fromBase64Url(encodedPayload));
    return JSON.parse(payloadJson) as T;
  } catch {
    return null;
  }
}

export function getCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const [cookieName, ...cookieValue] = part.trim().split("=");
    if (cookieName === name) {
      return cookieValue.join("=") || null;
    }
  }

  return null;
}

function getSessionProofValue(request: Request): string | null {
  return request.headers.get(SESSION_PROOF_HEADER) || getCookie(request, SESSION_PROOF_COOKIE);
}

function isSessionProofFresh(payload: SessionProofPayload | null): payload is SessionProofPayload {
  if (!payload?.session_id || !payload.app_origin || !payload.ts) return false;
  return Date.now() - payload.ts <= SESSION_PROOF_TTL_MS;
}

export async function readVerifiedSessionProof(
  request: Request,
  secret: string
): Promise<SessionProofPayload | null> {
  const rawProof = getSessionProofValue(request);
  if (!rawProof) return null;

  const payload = await parseSignedJsonPayload<SessionProofPayload>(rawProof, secret);
  return isSessionProofFresh(payload) ? payload : null;
}

export function createSessionProofCookie(value: string): string {
  return [
    `${SESSION_PROOF_COOKIE}=${value}`,
    "Path=/functions/v1",
    "HttpOnly",
    "Secure",
    "SameSite=None",
    `Max-Age=${SESSION_PROOF_TTL_SECONDS}`,
  ].join("; ");
}

export function clearSessionProofCookie(): string {
  return [
    `${SESSION_PROOF_COOKIE}=`,
    "Path=/functions/v1",
    "HttpOnly",
    "Secure",
    "SameSite=None",
    "Max-Age=0",
  ].join("; ");
}
