import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

  // Step 1: Start OAuth - redirect to GitHub
  if (path === "authorize") {
    const sessionId = url.searchParams.get("session_id");
    const redirectUri = url.searchParams.get("redirect_uri") || "";
    const state = btoa(JSON.stringify({ session_id: sessionId, redirect_uri: redirectUri }));
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo,user&state=${state}`;

    return new Response(null, {
      status: 302,
      headers: { Location: githubAuthUrl, ...corsHeaders },
    });
  }

  // Step 2: Callback from GitHub
  if (path === "callback") {
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");

    if (!code || !stateParam) {
      return new Response("Missing code or state", { status: 400, headers: corsHeaders });
    }

    let state: { session_id: string; redirect_uri: string };
    try {
      state = JSON.parse(atob(stateParam));
    } catch {
      return new Response("Invalid state", { status: 400, headers: corsHeaders });
    }

    // Exchange code for access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      return new Response(`GitHub error: ${tokenData.error_description}`, {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Get GitHub user info
    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: "application/vnd.github.v3+json" },
    });
    const userData = await userRes.json();

    // Store token in database
    const supabase = createClient(supabaseUrl, supabaseKey);
    await supabase.from("github_tokens").upsert(
      {
        session_id: state.session_id,
        access_token: tokenData.access_token,
        github_username: userData.login,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" }
    );

    // Redirect back to app
    const redirectUrl = new URL(state.redirect_uri || supabaseUrl);
    redirectUrl.searchParams.set("github_connected", "true");
    redirectUrl.searchParams.set("github_username", userData.login);

    return new Response(null, {
      status: 302,
      headers: { Location: redirectUrl.toString() },
    });
  }

  // Status check
  if (path === "status") {
    const sessionId = url.searchParams.get("session_id");
    if (!sessionId) {
      return new Response(JSON.stringify({ connected: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data } = await supabase
      .from("github_tokens")
      .select("github_username")
      .eq("session_id", sessionId)
      .single();

    return new Response(
      JSON.stringify({ connected: !!data, username: data?.github_username || null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Disconnect
  if (path === "disconnect") {
    const { session_id } = await req.json();
    const supabase = createClient(supabaseUrl, supabaseKey);
    await supabase.from("github_tokens").delete().eq("session_id", session_id);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response("Not found", { status: 404, headers: corsHeaders });
});
