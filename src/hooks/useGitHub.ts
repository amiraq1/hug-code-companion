import { useState, useEffect, useCallback } from "react";
import { getSupabaseFunctionHeaders } from "@/integrations/supabase/functionHeaders";
import { useAuthStore } from "@/stores/authStore";

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  html_url: string;
  default_branch: string;
  updated_at: string;
}

export interface GitHubContent {
  name: string;
  path: string;
  type: "file" | "dir";
  sha: string;
  size: number;
  download_url: string | null;
  content?: string;
  encoding?: string;
}

export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url: string;
}

export interface GitHubTree {
  sha: string;
  url: string;
  tree: GitHubTreeItem[];
  truncated: boolean;
}

export type GitHubErrorType = "network" | "auth" | "rate_limit" | "not_found" | "server" | "unknown";

export class GitHubError extends Error {
  type: GitHubErrorType;
  status?: number;

  constructor(message: string, type: GitHubErrorType, status?: number) {
    super(message);
    this.name = "GitHubError";
    this.type = type;
    this.status = status;
  }
}

function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return online;
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 1_000): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error: unknown) {
      if (attempt === retries) throw error;
      if (error instanceof GitHubError && (error.type === "auth" || error.type === "not_found")) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, attempt)));
    }
  }

  throw new Error("Retry exhausted");
}

export function useGitHub() {
  const online = useOnlineStatus();
  const {
    username,
    sessionId,
    isAuthenticated,
    isLoading,
    connect,
    disconnect,
  } = useAuthStore();

  const apiCall = useCallback(
    async (action: string, params: Record<string, unknown> = {}) => {
      if (!navigator.onLine) {
        throw new GitHubError("No internet connection. Please check your network.", "network");
      }

      return withRetry(async () => {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "placeholder-project";
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/github-api`, {
          method: "POST",
          credentials: "include",
          headers: getSupabaseFunctionHeaders("application/json"),
          body: JSON.stringify({ session_id: sessionId, action, ...params }),
        });

        if (!response.ok) {
          if (response.status === 401) {
            await disconnect();
            throw new GitHubError("Authentication expired. Please reconnect GitHub.", "auth", 401);
          }

          if (response.status === 403) {
            throw new GitHubError("API rate limit exceeded. Try again later.", "rate_limit", 403);
          }

          if (response.status === 404) {
            throw new GitHubError("Resource not found.", "not_found", 404);
          }

          if (response.status >= 500) {
            throw new GitHubError("Server error. Please try again.", "server", response.status);
          }

          throw new GitHubError(`Request failed (${response.status}).`, "unknown", response.status);
        }

        const data = await response.json();
        if (data?.message && data?.documentation_url) {
          throw new GitHubError(data.message, "server");
        }

        return data;
      });
    },
    [disconnect, sessionId]
  );

  const listRepos = useCallback(() => apiCall("list_repos") as Promise<GitHubRepo[]>, [apiCall]);

  const listContents = useCallback(
    (owner: string, repo: string, path = "", ref = "") =>
      apiCall("list_contents", { owner, repo, path, ref }) as Promise<GitHubContent[]>,
    [apiCall]
  );

  const getFile = useCallback(
    (owner: string, repo: string, path: string) =>
      apiCall("get_file", { owner, repo, path }) as Promise<GitHubContent>,
    [apiCall]
  );

  const commitFile = useCallback(
    (owner: string, repo: string, path: string, content: string, message: string, branch?: string) =>
      apiCall("commit_file", { owner, repo, path, content, message, ...(branch ? { branch } : {}) }),
    [apiCall]
  );

  const createRepo = useCallback(
    (name: string, description = "", isPrivate = true) =>
      apiCall("create_repo", { name, description, is_private: isPrivate }),
    [apiCall]
  );

  const listBranches = useCallback(
    (owner: string, repo: string) =>
      apiCall("list_branches", { owner, repo }) as Promise<Array<{ name: string; commit: { sha: string } }>>,
    [apiCall]
  );

  const createBranch = useCallback(
    (owner: string, repo: string, branch: string, from = "main") =>
      apiCall("create_branch", { owner, repo, branch, from }),
    [apiCall]
  );

  const deleteBranch = useCallback(
    (owner: string, repo: string, branch: string) =>
      apiCall("delete_branch", { owner, repo, branch }),
    [apiCall]
  );

  const listCommits = useCallback(
    (owner: string, repo: string, branch?: string) =>
      apiCall("list_commits", { owner, repo, branch }) as Promise<
        Array<{
          sha: string;
          commit: { message: string; author: { name: string; date: string } };
          author?: { login: string; avatar_url: string } | null;
        }>
      >,
    [apiCall]
  );

  const getStatus = useCallback(
    (owner: string, repo: string) =>
      apiCall("get_status", { owner, repo }) as Promise<{
        files?: Array<{ filename: string; status: string; additions: number; deletions: number }>;
      }>,
    [apiCall]
  );

  const compareCommits = useCallback(
    (owner: string, repo: string, base: string, head: string) =>
      apiCall("compare_commits", { owner, repo, base, head }) as Promise<{
        ahead_by: number;
        behind_by: number;
        total_commits: number;
        files: Array<{ filename: string; status: string; additions: number; deletions: number; patch: string }>;
      }>,
    [apiCall]
  );

  const getCommitDiff = useCallback(
    (owner: string, repo: string, sha: string) =>
      apiCall("get_commit_diff", { owner, repo, sha }) as Promise<{
        sha: string;
        message: string;
        author: { name: string; date: string };
        files: Array<{ filename: string; status: string; additions: number; deletions: number; patch: string }>;
      }>,
    [apiCall]
  );

  const mergeBranch = useCallback(
    (owner: string, repo: string, base: string, head: string, message?: string) =>
      apiCall("merge_branch", { owner, repo, base, head, message }),
    [apiCall]
  );

  const pullStatus = useCallback(
    (owner: string, repo: string, branch?: string) =>
      apiCall("pull_status", { owner, repo, branch }) as Promise<{ latest_sha: string | null; branch: string }>,
    [apiCall]
  );

  const getTree = useCallback(
    (owner: string, repo: string, branch?: string) =>
      apiCall("get_tree", { owner, repo, branch }) as Promise<GitHubTree>,
    [apiCall]
  );

  return {
    connected: isAuthenticated,
    username,
    loading: isLoading,
    online,
    connect,
    disconnect,
    listRepos,
    listContents,
    getFile,
    commitFile,
    createRepo,
    listBranches,
    createBranch,
    deleteBranch,
    listCommits,
    getStatus,
    compareCommits,
    getCommitDiff,
    mergeBranch,
    pullStatus,
    getTree,
  };
}
