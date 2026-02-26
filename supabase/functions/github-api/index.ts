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
        const res = await githubFetch(token, `/repos/${params.owner}/${params.repo}/branches?per_page=100`);
        result = await res.json();
        break;
      }

      case "create_branch": {
        // Get SHA of source branch
        const refRes = await githubFetch(
          token,
          `/repos/${params.owner}/${params.repo}/git/ref/heads/${params.from || "main"}`
        );
        if (!refRes.ok) {
          result = { error: "Source branch not found" };
          break;
        }
        const refData = await refRes.json();
        const sha = refData.object.sha;
        const res = await githubFetch(
          token,
          `/repos/${params.owner}/${params.repo}/git/refs`,
          {
            method: "POST",
            body: JSON.stringify({
              ref: `refs/heads/${params.branch}`,
              sha,
            }),
          }
        );
        result = await res.json();
        break;
      }

      case "delete_branch": {
        const res = await githubFetch(
          token,
          `/repos/${params.owner}/${params.repo}/git/refs/heads/${params.branch}`,
          { method: "DELETE" }
        );
        result = res.ok ? { success: true } : await res.json();
        break;
      }

      case "list_commits": {
        const sha = params.branch ? `?sha=${params.branch}&per_page=30` : "?per_page=30";
        const res = await githubFetch(
          token,
          `/repos/${params.owner}/${params.repo}/commits${sha}`
        );
        result = await res.json();
        break;
      }

      case "get_status": {
        // Get the latest commit diff to simulate "status"
        const commitRes = await githubFetch(
          token,
          `/repos/${params.owner}/${params.repo}/commits?per_page=1`
        );
        const commits = await commitRes.json();
        if (Array.isArray(commits) && commits.length > 0) {
          const detailRes = await githubFetch(
            token,
            `/repos/${params.owner}/${params.repo}/commits/${commits[0].sha}`
          );
          result = await detailRes.json();
        } else {
          result = { files: [] };
        }
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

      case "compare_commits": {
        // Compare two refs (branches, commits) for diff view
        const base = params.base || "main";
        const head = params.head || "HEAD";
        const res = await githubFetch(
          token,
          `/repos/${params.owner}/${params.repo}/compare/${base}...${head}`
        );
        if (!res.ok) {
          result = { error: `Compare failed (${res.status})` };
          break;
        }
        const compareData = await res.json();
        // Return a summary with files changed
        result = {
          ahead_by: compareData.ahead_by,
          behind_by: compareData.behind_by,
          total_commits: compareData.total_commits,
          files: (compareData.files || []).map((f: any) => ({
            filename: f.filename,
            status: f.status,
            additions: f.additions,
            deletions: f.deletions,
            changes: f.changes,
            patch: f.patch?.substring(0, 2000) || "", // Limit patch size
          })),
        };
        break;
      }

      case "get_commit_diff": {
        // Get diff for a specific commit
        const res = await githubFetch(
          token,
          `/repos/${params.owner}/${params.repo}/commits/${params.sha}`
        );
        if (!res.ok) {
          result = { error: `Failed to get commit (${res.status})` };
          break;
        }
        const commitData = await res.json();
        result = {
          sha: commitData.sha,
          message: commitData.commit?.message,
          author: commitData.commit?.author,
          files: (commitData.files || []).map((f: any) => ({
            filename: f.filename,
            status: f.status,
            additions: f.additions,
            deletions: f.deletions,
            patch: f.patch?.substring(0, 3000) || "",
          })),
        };
        break;
      }

      case "merge_branch": {
        // Merge head branch into base branch
        const res = await githubFetch(
          token,
          `/repos/${params.owner}/${params.repo}/merges`,
          {
            method: "POST",
            body: JSON.stringify({
              base: params.base,
              head: params.head,
              commit_message: params.message || `Merge ${params.head} into ${params.base}`,
            }),
          }
        );
        if (res.status === 409) {
          result = { error: "merge_conflict", message: "Merge conflict detected. Please resolve conflicts manually." };
          break;
        }
        if (res.status === 204) {
          result = { message: "Nothing to merge — already up to date." };
          break;
        }
        result = await res.json();
        break;
      }

      case "pull_status": {
        // Check if local branch is behind remote (compare default branch)
        const branch = params.branch || "main";
        const commitsRes = await githubFetch(
          token,
          `/repos/${params.owner}/${params.repo}/commits?sha=${branch}&per_page=1`
        );
        const latestCommits = await commitsRes.json();
        result = {
          latest_sha: Array.isArray(latestCommits) && latestCommits[0]?.sha || null,
          branch,
        };
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
