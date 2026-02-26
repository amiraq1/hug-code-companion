import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getToken(sessionId: string): Promise<string | null> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const { data } = await supabase
    .from("github_tokens")
    .select("access_token")
    .eq("session_id", sessionId)
    .single();
  return data?.access_token || null;
}

async function githubFetch(token: string, endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`https://api.github.com${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    },
  });
  return res;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { session_id, action, ...params } = body;

    if (!session_id) {
      return new Response(JSON.stringify({ error: "session_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = await getToken(session_id);
    if (!token) {
      return new Response(JSON.stringify({ error: "Not connected to GitHub" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: unknown;

    switch (action) {
      case "list_repos": {
        const res = await githubFetch(token, "/user/repos?sort=updated&per_page=30&type=all");
        result = await res.json();
        break;
      }

      case "get_repo": {
        const res = await githubFetch(token, `/repos/${params.owner}/${params.repo}`);
        result = await res.json();
        break;
      }

      case "list_contents": {
        const path = params.path || "";
        const ref = params.ref || "";
        const query = ref ? `?ref=${ref}` : "";
        const res = await githubFetch(
          token,
          `/repos/${params.owner}/${params.repo}/contents/${path}${query}`
        );
        result = await res.json();
        break;
      }

      case "get_file": {
        const res = await githubFetch(
          token,
          `/repos/${params.owner}/${params.repo}/contents/${params.path}`
        );
        result = await res.json();
        break;
      }

      case "list_branches": {
        const res = await githubFetch(token, `/repos/${params.owner}/${params.repo}/branches`);
        result = await res.json();
        break;
      }

      case "commit_file": {
        // Get current file SHA if it exists
        let sha: string | undefined;
        const existingRes = await githubFetch(
          token,
          `/repos/${params.owner}/${params.repo}/contents/${params.path}`
        );
        if (existingRes.ok) {
          const existing = await existingRes.json();
          sha = existing.sha;
        }

        const res = await githubFetch(
          token,
          `/repos/${params.owner}/${params.repo}/contents/${params.path}`,
          {
            method: "PUT",
            body: JSON.stringify({
              message: params.message || `Update ${params.path}`,
              content: btoa(params.content),
              sha,
              branch: params.branch || "main",
            }),
          }
        );
        result = await res.json();
        break;
      }

      case "create_repo": {
        const res = await githubFetch(token, "/user/repos", {
          method: "POST",
          body: JSON.stringify({
            name: params.name,
            description: params.description || "",
            private: params.is_private ?? true,
            auto_init: true,
          }),
        });
        result = await res.json();
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
