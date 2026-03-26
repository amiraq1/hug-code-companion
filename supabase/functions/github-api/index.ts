import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  createCorsHeaders,
  isPublicWebOrigin,
  readVerifiedSessionProof,
} from "../_shared/sessionSecurity.ts";

const ALLOWED_ACTIONS = new Set([
  "list_repos",
  "get_repo",
  "list_contents",
  "get_file",
  "list_branches",
  "create_branch",
  "delete_branch",
  "list_commits",
  "get_status",
  "commit_file",
  "create_repo",
  "compare_commits",
  "get_commit_diff",
  "merge_branch",
  "pull_status",
  "get_tree",
]);

function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function toBase64Utf8(value: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(value)));
}

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
  console.log(`[GitHub API] ${options.method || "GET"} ${endpoint}`);
  const response = await fetch(`https://api.github.com${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    },
  });

  console.log(`[GitHub API] Response: ${response.status}`);
  return response;
}

function jsonResponse(body: unknown, status: number, headers: Record<string, string>) {
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

  const stateSecret =
    Deno.env.get("OAUTH_STATE_SECRET") || Deno.env.get("GITHUB_CLIENT_SECRET") || "fallback-secret";

  try {
    const body = await request.json();
    const { session_id, action, ...params } = body;
    console.log(`[Action] ${action}`, params);

    if (!session_id || typeof session_id !== "string" || !isValidUUID(session_id)) {
      return jsonResponse({ error: "session_id required" }, 400, preflightHeaders);
    }

    if (!action || typeof action !== "string" || !ALLOWED_ACTIONS.has(action)) {
      return jsonResponse({ error: "Unknown or blocked action" }, 400, preflightHeaders);
    }

    const proof = await readVerifiedSessionProof(request, stateSecret);
    const originAllowed =
      isPublicWebOrigin(requestOrigin) && proof?.app_origin === requestOrigin && proof.session_id === session_id;

    if (!originAllowed) {
      return jsonResponse({ error: "Unauthorized session proof" }, 401, preflightHeaders);
    }

    const responseHeaders = createCorsHeaders(requestOrigin, true);
    const token = await getToken(session_id);
    if (!token) {
      return jsonResponse({ error: "Not connected to GitHub" }, 401, responseHeaders);
    }

    let result: unknown;

    switch (action) {
      case "list_repos": {
        const response = await githubFetch(token, "/user/repos?sort=updated&per_page=30&type=all");
        result = await response.json();
        break;
      }

      case "get_repo": {
        const response = await githubFetch(token, `/repos/${params.owner}/${params.repo}`);
        result = await response.json();
        break;
      }

      case "list_contents": {
        const path = params.path || "";
        const ref = params.ref || "";
        const query = ref ? `?ref=${ref}` : "";
        const response = await githubFetch(
          token,
          `/repos/${params.owner}/${params.repo}/contents/${path}${query}`
        );
        result = await response.json();
        break;
      }

      case "get_file": {
        const response = await githubFetch(
          token,
          `/repos/${params.owner}/${params.repo}/contents/${params.path}`
        );
        result = await response.json();
        break;
      }

      case "list_branches": {
        const response = await githubFetch(
          token,
          `/repos/${params.owner}/${params.repo}/branches?per_page=100`
        );
        result = await response.json();
        break;
      }

      case "get_tree": {
        const branch = params.branch || "main";
        const response = await githubFetch(
          token,
          `/repos/${params.owner}/${params.repo}/git/trees/${branch}?recursive=1`
        );
        result = await response.json();
        break;
      }

      case "create_branch": {
        const refResponse = await githubFetch(
          token,
          `/repos/${params.owner}/${params.repo}/git/ref/heads/${params.from || "main"}`
        );

        if (!refResponse.ok) {
          result = { error: "Source branch not found" };
          break;
        }

        const refData = await refResponse.json();
        const sha = refData.object.sha;
        const response = await githubFetch(token, `/repos/${params.owner}/${params.repo}/git/refs`, {
          method: "POST",
          body: JSON.stringify({
            ref: `refs/heads/${params.branch}`,
            sha,
          }),
        });
        result = await response.json();
        break;
      }

      case "delete_branch": {
        const response = await githubFetch(
          token,
          `/repos/${params.owner}/${params.repo}/git/refs/heads/${params.branch}`,
          { method: "DELETE" }
        );
        result = response.ok ? { success: true } : await response.json();
        break;
      }

      case "list_commits": {
        const sha = params.branch ? `?sha=${params.branch}&per_page=30` : "?per_page=30";
        const response = await githubFetch(
          token,
          `/repos/${params.owner}/${params.repo}/commits${sha}`
        );
        result = await response.json();
        break;
      }

      case "get_status": {
        const commitResponse = await githubFetch(
          token,
          `/repos/${params.owner}/${params.repo}/commits?per_page=1`
        );
        const commits = await commitResponse.json();

        if (Array.isArray(commits) && commits.length > 0) {
          const detailResponse = await githubFetch(
            token,
            `/repos/${params.owner}/${params.repo}/commits/${commits[0].sha}`
          );
          result = await detailResponse.json();
        } else {
          result = { files: [] };
        }
        break;
      }

      case "commit_file": {
        let sha: string | undefined;
        let branch = params.branch ? String(params.branch) : "";

        if (!branch) {
          const repoResponse = await githubFetch(token, `/repos/${params.owner}/${params.repo}`);
          if (repoResponse.ok) {
            const repoData = await repoResponse.json();
            branch = repoData.default_branch || "main";
          } else {
            branch = "main";
          }
        }

        const existingResponse = await githubFetch(
          token,
          `/repos/${params.owner}/${params.repo}/contents/${params.path}`
        );
        if (existingResponse.ok) {
          const existing = await existingResponse.json();
          sha = existing.sha;
        }

        const response = await githubFetch(
          token,
          `/repos/${params.owner}/${params.repo}/contents/${params.path}`,
          {
            method: "PUT",
            body: JSON.stringify({
              message: params.message || `Update ${params.path}`,
              content: toBase64Utf8(String(params.content ?? "")),
              sha,
              branch,
            }),
          }
        );
        result = await response.json();
        break;
      }

      case "create_repo": {
        const response = await githubFetch(token, "/user/repos", {
          method: "POST",
          body: JSON.stringify({
            name: params.name,
            description: params.description || "",
            private: params.is_private ?? true,
            auto_init: true,
          }),
        });
        result = await response.json();
        break;
      }

      case "compare_commits": {
        const base = params.base || "main";
        const head = params.head || "HEAD";
        const response = await githubFetch(
          token,
          `/repos/${params.owner}/${params.repo}/compare/${base}...${head}`
        );

        if (!response.ok) {
          result = { error: `Compare failed (${response.status})` };
          break;
        }

        const compareData = await response.json();
        result = {
          ahead_by: compareData.ahead_by,
          behind_by: compareData.behind_by,
          total_commits: compareData.total_commits,
          files: (compareData.files || []).map((file: any) => ({
            filename: file.filename,
            status: file.status,
            additions: file.additions,
            deletions: file.deletions,
            changes: file.changes,
            patch: file.patch?.substring(0, 2_000) || "",
          })),
        };
        break;
      }

      case "get_commit_diff": {
        const response = await githubFetch(
          token,
          `/repos/${params.owner}/${params.repo}/commits/${params.sha}`
        );

        if (!response.ok) {
          result = { error: `Failed to get commit (${response.status})` };
          break;
        }

        const commitData = await response.json();
        result = {
          sha: commitData.sha,
          message: commitData.commit?.message,
          author: commitData.commit?.author,
          files: (commitData.files || []).map((file: any) => ({
            filename: file.filename,
            status: file.status,
            additions: file.additions,
            deletions: file.deletions,
            patch: file.patch?.substring(0, 3_000) || "",
          })),
        };
        break;
      }

      case "merge_branch": {
        const response = await githubFetch(token, `/repos/${params.owner}/${params.repo}/merges`, {
          method: "POST",
          body: JSON.stringify({
            base: params.base,
            head: params.head,
            commit_message: params.message || `Merge ${params.head} into ${params.base}`,
          }),
        });

        if (response.status === 409) {
          result = {
            error: "merge_conflict",
            message: "Merge conflict detected. Please resolve conflicts manually.",
          };
          break;
        }

        if (response.status === 204) {
          result = { message: "Nothing to merge - already up to date." };
          break;
        }

        result = await response.json();
        break;
      }

      case "pull_status": {
        const branch = params.branch || "main";
        const commitsResponse = await githubFetch(
          token,
          `/repos/${params.owner}/${params.repo}/commits?sha=${branch}&per_page=1`
        );
        const latestCommits = await commitsResponse.json();
        result = {
          latest_sha: (Array.isArray(latestCommits) && latestCommits[0]?.sha) || null,
          branch,
        };
        break;
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400, responseHeaders);
    }

    return jsonResponse(result, 200, responseHeaders);
  } catch (error: unknown) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : String(error) },
      500,
      preflightHeaders
    );
  }
});
