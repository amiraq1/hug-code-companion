import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";

/** Get session ID from auth store's secure storage */
function getSessionId(): string {
  // Read from secure storage (same key as authStore)
  const SESSION_KEY = "hc_session_id";
  const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
  if (raw) {
    try {
      return decodeURIComponent(atob(raw).split("").reverse().join(""));
    } catch {
      // Ignore format errors
    }
  }
  // Fallback
  const id = crypto.randomUUID();
  const encoded = btoa(encodeURIComponent(id).split("").reverse().join(""));
  localStorage.setItem(SESSION_KEY, encoded);
  return id;
}

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

/** Error types for structured error handling */
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

/** Detect if the browser is online */
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

/** Retry a function with exponential backoff */
async function withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 1000): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      if (i === retries) throw err;
      // Don't retry auth errors
      if (err instanceof GitHubError && (err.type === "auth" || err.type === "not_found")) throw err;
      await new Promise((r) => setTimeout(r, delay * Math.pow(2, i)));
    }
  }
  throw new Error("Retry exhausted");
}

export function useGitHub() {
  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const online = useOnlineStatus();
  const sessionId = getSessionId();

  const checkStatus = useCallback(async () => {
    if (!navigator.onLine) {
      setLoading(false);
      return;
    }
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "placeholder-project";
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/github-auth/status?session_id=${sessionId}`,
        {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        }
      );
      const statusData = await res.json();
      setConnected(statusData.connected);
      setUsername(statusData.username);
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    checkStatus();
    const params = new URLSearchParams(window.location.search);
    if (params.get("github_connected") === "true") {
      setConnected(true);
      setUsername(params.get("github_username"));
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [checkStatus]);

  const connect = useCallback(() => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "placeholder-project";
    const redirectUri = window.location.origin;
    window.location.href = `https://${projectId}.supabase.co/functions/v1/github-auth/authorize?session_id=${sessionId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  }, [sessionId]);

  const disconnect = useCallback(async () => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "placeholder-project";
    await fetch(`https://${projectId}.supabase.co/functions/v1/github-auth/disconnect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ session_id: sessionId }),
    });
    setConnected(false);
    setUsername(null);
  }, [sessionId]);

  const apiCall = useCallback(
    async (action: string, params: Record<string, unknown> = {}) => {
      if (!navigator.onLine) {
        throw new GitHubError("No internet connection. Please check your network.", "network");
      }

      return withRetry(async () => {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "placeholder-project";
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/github-api`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ session_id: sessionId, action, ...params }),
          }
        );

        if (!res.ok) {
          if (res.status === 401) throw new GitHubError("Authentication expired. Please reconnect GitHub.", "auth", 401);
          if (res.status === 403) throw new GitHubError("API rate limit exceeded. Try again later.", "rate_limit", 403);
          if (res.status === 404) throw new GitHubError("Resource not found.", "not_found", 404);
          if (res.status >= 500) throw new GitHubError("Server error. Please try again.", "server", res.status);
          throw new GitHubError(`Request failed (${res.status}).`, "unknown", res.status);
        }

        const data = await res.json();
        // GitHub API returns error objects
        if (data?.message && data?.documentation_url) {
          throw new GitHubError(data.message, "server");
        }
        return data;
      });
    },
    [sessionId]
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
    (owner: string, repo: string, path: string, content: string, message: string, branch = "main") =>
      apiCall("commit_file", { owner, repo, path, content, message, branch }),
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
      apiCall("list_commits", { owner, repo, branch }) as Promise<Array<{
        sha: string;
        commit: { message: string; author: { name: string; date: string } };
        author?: { login: string; avatar_url: string } | null;
      }>>,
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

  return {
    connected,
    username,
    loading,
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
  };
}
