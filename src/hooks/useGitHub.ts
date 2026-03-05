import { useState, useEffect, useCallback } from "react";

const SESSION_KEY = "hc_session_id";
const CSRF_KEY = "hc_oauth_csrf";

function encode(value: string): string {
  return btoa(encodeURIComponent(value).split("").reverse().join(""));
}

function decode(value: string): string {
  try {
    return decodeURIComponent(atob(value).split("").reverse().join(""));
  } catch {
    return "";
  }
}

function getSecureItem(key: string): string | null {
  const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
  if (!raw) return null;
  const decoded = decode(raw);
  return decoded || null;
}

function setSecureItem(key: string, value: string, persistent = false): void {
  const encoded = encode(value);
  if (persistent) {
    localStorage.setItem(key, encoded);
    return;
  }
  sessionStorage.setItem(key, encoded);
}

function removeSecureItem(key: string): void {
  sessionStorage.removeItem(key);
  localStorage.removeItem(key);
}

/** Get session ID from auth store's secure storage */
function getSessionId(): string {
  const existing = getSecureItem(SESSION_KEY);
  if (existing) return existing;

  // Fallback
  const id = crypto.randomUUID();
  setSecureItem(SESSION_KEY, id, true);
  return id;
}

function generateCsrfToken(): string {
  const csrf = crypto.randomUUID();
  setSecureItem(CSRF_KEY, csrf);
  return csrf;
}

function validateAndConsumeCsrf(token: string): boolean {
  const expected = getSecureItem(CSRF_KEY);
  removeSecureItem(CSRF_KEY);
  return expected === token;
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
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

  const getFunctionHeaders = useCallback((): HeadersInit => {
    const headers: Record<string, string> = {};
    if (publishableKey) {
      headers.apikey = publishableKey;
      // Supabase publishable keys (sb_publishable_*) are not JWTs.
      // Only send Authorization when the key looks like a JWT.
      if (publishableKey.startsWith("eyJ")) {
        headers.Authorization = `Bearer ${publishableKey}`;
      }
    }
    return headers;
  }, [publishableKey]);

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
          headers: getFunctionHeaders(),
        }
      );
      if (!res.ok) {
        throw new Error(`Status check failed (${res.status})`);
      }
      const statusData = await res.json();
      const isConnected = Boolean(statusData?.connected && statusData?.username);
      setConnected(isConnected);
      setUsername(isConnected ? statusData.username : null);
    } catch {
      setConnected(false);
      setUsername(null);
    } finally {
      setLoading(false);
    }
  }, [sessionId, getFunctionHeaders]);

  useEffect(() => {
    const initialize = async () => {
      const params = new URLSearchParams(window.location.search);
      const csrfToken = params.get("csrf_token");
      const githubConnected = params.get("github_connected") === "true";

      if (githubConnected) {
        if (csrfToken && !validateAndConsumeCsrf(csrfToken)) {
          setConnected(false);
          setUsername(null);
          setLoading(false);
          window.history.replaceState({}, "", window.location.pathname);
          return;
        }
        // Do not optimistically mark connected from URL params.
        // Confirm from backend first to avoid false-positive 401 calls.
        window.history.replaceState({}, "", window.location.pathname);
      }

      await checkStatus();
    };

    void initialize();
  }, [checkStatus]);

  const connect = useCallback(() => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "placeholder-project";
    const redirectUri = window.location.origin;
    const csrfToken = generateCsrfToken();
    window.location.href = `https://${projectId}.supabase.co/functions/v1/github-auth/authorize?session_id=${sessionId}&redirect_uri=${encodeURIComponent(redirectUri)}&csrf_token=${csrfToken}`;
  }, [sessionId]);

  const disconnect = useCallback(async () => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "placeholder-project";
    await fetch(`https://${projectId}.supabase.co/functions/v1/github-auth/disconnect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getFunctionHeaders(),
      },
      body: JSON.stringify({ session_id: sessionId }),
    });
    setConnected(false);
    setUsername(null);
  }, [sessionId, getFunctionHeaders]);

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
              ...getFunctionHeaders(),
            },
            body: JSON.stringify({ session_id: sessionId, action, ...params }),
          }
        );

        if (!res.ok) {
          if (res.status === 401) {
            setConnected(false);
            setUsername(null);
            throw new GitHubError("Authentication expired. Please reconnect GitHub.", "auth", 401);
          }
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
    [sessionId, getFunctionHeaders]
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
