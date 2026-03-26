import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  clearSessionProofCookie,
  createCorsHeaders,
  createSessionProofCookie,
  isPublicWebOrigin,
  parseSignedJsonPayload,
  readVerifiedSessionProof,
  signJsonPayload,
  type SessionProofPayload,
} from "../_shared/sessionSecurity.ts";

type OAuthState = {
  session_id: string;
  redirect_uri: string;
  app_origin: string;
  csrf_token?: string;
  ts?: number;
};

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60_000;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;
  entry.count += 1;
  return true;
}

function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function sanitizeAppOrigin(origin: string, fallback: string): string {
  try {
    const parsed = new URL(origin);
    return isPublicWebOrigin(parsed.origin) ? parsed.origin : fallback;
  } catch {
    return fallback;
  }
}

function isAllowedNativeRedirect(parsed: URL): boolean {
  const protocol = parsed.protocol.replace(":", "");
  if (!protocol || protocol === "http" || protocol === "https") {
    return false;
  }

  return /^[a-z][a-z0-9+.-]*$/i.test(protocol);
}

function sanitizeRedirectUri(uri: string, fallback: string): string {
  try {
    const parsed = new URL(uri);

    if (parsed.protocol === "https:" || (parsed.protocol === "http:" && parsed.hostname === "localhost")) {
      return parsed.toString();
    }

    if (isAllowedNativeRedirect(parsed)) {
      return parsed.toString();
    }
  } catch {
    // Ignore and fall back.
  }

  return fallback;
}

function buildRedirectUrl(base: string, fallback: string): URL {
  try {
    return new URL(base);
  } catch {
    return new URL(fallback);
  }
}

function shouldReturnProofInUrl(redirectUri: string): boolean {
  try {
    const parsed = new URL(redirectUri);
    return parsed.protocol !== "https:" && parsed.protocol !== "http:";
  } catch {
    return false;
  }
}

function responseJson(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  const requestOrigin = request.headers.get("origin");
  const preflightHeaders = createCorsHeaders(requestOrigin, Boolean(requestOrigin));

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: preflightHeaders });
  }

  const url = new URL(request.url);
  const path = url.pathname.split("/").pop();

  const clientId = Deno.env.get("GITHUB_CLIENT_ID")!;
  const clientSecret = Deno.env.get("GITHUB_CLIENT_SECRET")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseOrigin = new URL(supabaseUrl).origin;
  const stateSecret = Deno.env.get("OAUTH_STATE_SECRET") || clientSecret;

  if (path === "authorize") {
    const sessionId = url.searchParams.get("session_id");
    const redirectUri = url.searchParams.get("redirect_uri") || "";
    const appOrigin = url.searchParams.get("app_origin") || "";
    const csrfToken = url.searchParams.get("csrf_token") || "";

    if (!sessionId || !isValidUUID(sessionId)) {
      return new Response("Invalid session_id", { status: 400, headers: preflightHeaders });
    }

    if (!csrfToken) {
      return new Response("Missing csrf_token", { status: 400, headers: preflightHeaders });
    }

    if (!checkRateLimit(`auth:${sessionId}`)) {
      return new Response("Too many requests", { status: 429, headers: preflightHeaders });
    }

    const safeAppOrigin = sanitizeAppOrigin(appOrigin || redirectUri, supabaseOrigin);
    const safeRedirect = sanitizeRedirectUri(redirectUri, safeAppOrigin);
    const state = await signJsonPayload<OAuthState>(
      {
        session_id: sessionId,
        redirect_uri: safeRedirect,
        app_origin: safeAppOrigin,
        csrf_token: csrfToken,
        ts: Date.now(),
      },
      stateSecret
    );

    const githubAuthUrl =
      `https://github.com/login/oauth/authorize?client_id=${clientId}` +
      `&scope=repo,user&state=${state}`;

    return new Response(null, {
      status: 302,
      headers: { ...preflightHeaders, Location: githubAuthUrl },
    });
  }

  if (path === "callback") {
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");

    if (!code || !stateParam) {
      return new Response("Missing code or state", { status: 400, headers: preflightHeaders });
    }

    const state = await readVerifiedState(stateParam, stateSecret);
    if (!state) {
      return new Response("Invalid state parameter", { status: 400, headers: preflightHeaders });
    }

    const safeAppOrigin = sanitizeAppOrigin(state.app_origin || "", supabaseOrigin);
    const safeRedirect = sanitizeRedirectUri(state.redirect_uri || "", safeAppOrigin);
    const redirectUrl = buildRedirectUrl(safeRedirect, supabaseUrl);

    if (!state.session_id || !isValidUUID(state.session_id)) {
      return new Response("Invalid session in state", { status: 400, headers: preflightHeaders });
    }

    if (state.ts && Date.now() - state.ts > 10 * 60 * 1000) {
      redirectUrl.searchParams.set("auth_error", "OAuth session expired. Please try again.");
      return new Response(null, {
        status: 302,
        headers: { ...preflightHeaders, Location: redirectUrl.toString() },
      });
    }

    if (!checkRateLimit(`cb:${state.session_id}`)) {
      return new Response("Too many requests", { status: 429, headers: preflightHeaders });
    }

    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      redirectUrl.searchParams.set("auth_error", tokenData.error_description || tokenData.error);
      return new Response(null, {
        status: 302,
        headers: { ...preflightHeaders, Location: redirectUrl.toString() },
      });
    }

    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!userResponse.ok) {
      redirectUrl.searchParams.set("auth_error", "Failed to fetch GitHub user info");
      return new Response(null, {
        status: 302,
        headers: { ...preflightHeaders, Location: redirectUrl.toString() },
      });
    }

    const userData = await userResponse.json();
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error: databaseError } = await supabase.from("github_tokens").upsert(
      {
        session_id: state.session_id,
        access_token: tokenData.access_token,
        github_username: userData.login,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" }
    );

    if (databaseError) {
      console.error("DB error storing token:", databaseError.message);
      redirectUrl.searchParams.set("auth_error", "Failed to save authentication");
      return new Response(null, {
        status: 302,
        headers: { ...preflightHeaders, Location: redirectUrl.toString() },
      });
    }

    const sessionProof = await signJsonPayload<SessionProofPayload>(
      {
        session_id: state.session_id,
        app_origin: safeAppOrigin,
        ts: Date.now(),
      },
      stateSecret
    );

    redirectUrl.searchParams.set("github_connected", "true");
    redirectUrl.searchParams.set("github_username", userData.login);
    if (state.csrf_token) {
      redirectUrl.searchParams.set("csrf_token", state.csrf_token);
    }
    if (shouldReturnProofInUrl(safeRedirect)) {
      redirectUrl.searchParams.set("session_proof", sessionProof);
    }

    return new Response(null, {
      status: 302,
      headers: {
        ...preflightHeaders,
        Location: redirectUrl.toString(),
        "Set-Cookie": createSessionProofCookie(sessionProof),
      },
    });
  }

  if (path === "status") {
    const sessionId = url.searchParams.get("session_id");
    if (!sessionId || !isValidUUID(sessionId)) {
      return responseJson({ connected: false }, 200, preflightHeaders);
    }

    if (!checkRateLimit(`status:${sessionId}`)) {
      return responseJson({ error: "Too many requests" }, 429, preflightHeaders);
    }

    const proof = await readVerifiedSessionProof(request, stateSecret);
    const originAllowed =
      isPublicWebOrigin(requestOrigin) && proof?.app_origin === requestOrigin && proof.session_id === sessionId;

    if (!originAllowed) {
      return responseJson({ connected: false }, 200, preflightHeaders);
    }

    const responseHeaders = createCorsHeaders(requestOrigin, true);
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data } = await supabase
      .from("github_tokens")
      .select("github_username, updated_at")
      .eq("session_id", sessionId)
      .single();

    let tokenStale = false;
    if (data?.updated_at) {
      const age = Date.now() - new Date(data.updated_at).getTime();
      tokenStale = age > 30 * 24 * 60 * 60 * 1000;
    }

    return responseJson(
      {
        connected: !!data,
        username: data?.github_username || null,
        token_stale: tokenStale,
      },
      200,
      responseHeaders
    );
  }

  if (path === "disconnect") {
    const body = await safeJson(request);
    const sessionId = body?.session_id;

    if (!sessionId || typeof sessionId !== "string" || !isValidUUID(sessionId)) {
      return responseJson({ error: "Invalid session_id" }, 400, preflightHeaders);
    }

    const proof = await readVerifiedSessionProof(request, stateSecret);
    const originAllowed =
      isPublicWebOrigin(requestOrigin) && proof?.app_origin === requestOrigin && proof.session_id === sessionId;

    const responseHeaders = createCorsHeaders(requestOrigin, Boolean(requestOrigin));

    if (!originAllowed) {
      return new Response(JSON.stringify({ error: "Unauthorized session proof" }), {
        status: 401,
        headers: {
          ...responseHeaders,
          "Content-Type": "application/json",
          "Set-Cookie": clearSessionProofCookie(),
        },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    await supabase.from("github_tokens").delete().eq("session_id", sessionId);

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        ...createCorsHeaders(requestOrigin, true),
        "Content-Type": "application/json",
        "Set-Cookie": clearSessionProofCookie(),
      },
    });
  }

  return new Response("Not found", { status: 404, headers: preflightHeaders });
});

async function readVerifiedState(stateParam: string, secret: string): Promise<OAuthState | null> {
  return parseSignedJsonPayload<OAuthState>(stateParam, secret);
}

async function safeJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
