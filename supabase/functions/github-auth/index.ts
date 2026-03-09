import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-session-id",
};

/** Rate limiting - simple in-memory tracker */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // requests per window
const RATE_WINDOW = 60_000; // 1 minute

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

/** Validate session_id format */
function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

/** Sanitize redirect URI */
function sanitizeRedirectUri(uri: string, fallback: string): string {
  try {
    const parsed = new URL(uri);
    // Only allow https (or http for localhost)
    if (parsed.protocol === "https:" || (parsed.protocol === "http:" && parsed.hostname === "localhost")) {
      return parsed.origin;
    }
  } catch {}
  return fallback;
}

function toBase64Url(bytes: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function secureEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
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

type OAuthState = {
  session_id: string;
  redirect_uri: string;
  csrf_token?: string;
  ts?: number;
};

async function buildSignedState(payload: OAuthState, secret: string): Promise<string> {
  const encodedPayload = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await signValue(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

async function parseAndVerifyState(stateParam: string, secret: string): Promise<OAuthState | null> {
  const [encodedPayload, signature] = stateParam.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = await signValue(encodedPayload, secret);
  if (!secureEqual(signature, expectedSignature)) return null;

  try {
    const payloadJson = new TextDecoder().decode(fromBase64Url(encodedPayload));
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.split("/").pop();

  const clientId = Deno.env.get("GITHUB_CLIENT_ID")!;
  const clientSecret = Deno.env.get("GITHUB_CLIENT_SECRET")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const stateSecret = Deno.env.get("OAUTH_STATE_SECRET") || clientSecret;

  // ─── Step 1: Start OAuth ──────────────────────────────────────────
  if (path === "authorize") {
    const sessionId = url.searchParams.get("session_id");
    const redirectUri = url.searchParams.get("redirect_uri") || "";
    const csrfToken = url.searchParams.get("csrf_token") || "";

    if (!sessionId || !isValidUUID(sessionId)) {
      return new Response("Invalid session_id", { status: 400, headers: corsHeaders });
    }

    if (!csrfToken) {
      return new Response("Missing csrf_token", { status: 400, headers: corsHeaders });
    }

    if (!checkRateLimit(`auth:${sessionId}`)) {
      return new Response("Too many requests", { status: 429, headers: corsHeaders });
    }

    const safeRedirect = sanitizeRedirectUri(redirectUri, supabaseUrl);

    // Include CSRF token in state for round-trip verification
    const state = await buildSignedState(
      {
        session_id: sessionId,
        redirect_uri: safeRedirect,
        csrf_token: csrfToken,
        ts: Date.now(),
      },
      stateSecret
    );

    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo,user&state=${state}`;

    return new Response(null, {
      status: 302,
      headers: { Location: githubAuthUrl, ...corsHeaders },
    });
  }

  // ─── Step 2: Callback from GitHub ──────────────────────────────────
  if (path === "callback") {
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");

    if (!code || !stateParam) {
      return new Response("Missing code or state", { status: 400, headers: corsHeaders });
    }

    const state = await parseAndVerifyState(stateParam, stateSecret);
    if (!state) {
      return new Response("Invalid state parameter", { status: 400, headers: corsHeaders });
    }

    const safeRedirect = sanitizeRedirectUri(state.redirect_uri || "", supabaseUrl);

    // Validate session_id
    if (!state.session_id || !isValidUUID(state.session_id)) {
      return new Response("Invalid session in state", { status: 400, headers: corsHeaders });
    }

    // Check state age (max 10 minutes)
    if (state.ts && Date.now() - state.ts > 10 * 60 * 1000) {
      const redirectUrl = new URL(safeRedirect);
      redirectUrl.searchParams.set("auth_error", "OAuth session expired. Please try again.");
      return new Response(null, { status: 302, headers: { Location: redirectUrl.toString() } });
    }

    // Rate limit callback
    if (!checkRateLimit(`cb:${state.session_id}`)) {
      return new Response("Too many requests", { status: 429, headers: corsHeaders });
    }

    // Exchange code for access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      const redirectUrl = new URL(safeRedirect);
      redirectUrl.searchParams.set("auth_error", tokenData.error_description || tokenData.error);
      return new Response(null, { status: 302, headers: { Location: redirectUrl.toString() } });
    }

    // Get GitHub user info
    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: "application/vnd.github.v3+json" },
    });

    if (!userRes.ok) {
      const redirectUrl = new URL(safeRedirect);
      redirectUrl.searchParams.set("auth_error", "Failed to fetch GitHub user info");
      return new Response(null, { status: 302, headers: { Location: redirectUrl.toString() } });
    }

    const userData = await userRes.json();

    // Store token in database
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error: dbError } = await supabase.from("github_tokens").upsert(
      {
        session_id: state.session_id,
        access_token: tokenData.access_token,
        github_username: userData.login,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" }
    );

    if (dbError) {
      console.error("DB error storing token:", dbError.message);
      const redirectUrl = new URL(safeRedirect);
      redirectUrl.searchParams.set("auth_error", "Failed to save authentication");
      return new Response(null, { status: 302, headers: { Location: redirectUrl.toString() } });
    }

    // Redirect back to app with CSRF token for client verification
    const redirectUrl = new URL(safeRedirect);
    redirectUrl.searchParams.set("github_connected", "true");
    redirectUrl.searchParams.set("github_username", userData.login);
    if (state.csrf_token) {
      redirectUrl.searchParams.set("csrf_token", state.csrf_token);
    }

    return new Response(null, {
      status: 302,
      headers: { Location: redirectUrl.toString() },
    });
  }

  // ─── Status check ──────────────────────────────────────────────────
  if (path === "status") {
    const sessionId = url.searchParams.get("session_id");
    if (!sessionId || !isValidUUID(sessionId)) {
      return new Response(JSON.stringify({ connected: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!checkRateLimit(`status:${sessionId}`)) {
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data } = await supabase
      .from("github_tokens")
      .select("github_username, updated_at")
      .eq("session_id", sessionId)
      .single();

    // Check if token is stale (older than 30 days → suggest re-auth)
    let tokenStale = false;
    if (data?.updated_at) {
      const age = Date.now() - new Date(data.updated_at).getTime();
      tokenStale = age > 30 * 24 * 60 * 60 * 1000;
    }

    return new Response(
      JSON.stringify({
        connected: !!data,
        username: data?.github_username || null,
        token_stale: tokenStale,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ─── Disconnect ────────────────────────────────────────────────────
  if (path === "disconnect") {
    try {
      const { session_id } = await req.json();

      if (!session_id || !isValidUUID(session_id)) {
        return new Response(JSON.stringify({ error: "Invalid session_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase.from("github_tokens").delete().eq("session_id", session_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Not found", { status: 404, headers: corsHeaders });
});
