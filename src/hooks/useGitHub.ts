import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "github_session_id";

function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
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

export function useGitHub() {
  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionId = getSessionId();

  const checkStatus = useCallback(async () => {
    try {
      const { data } = await supabase.functions.invoke("github-auth/status", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        body: undefined,
      });
      // Use query params approach instead
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/github-auth/status?session_id=${sessionId}`,
        {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
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

    // Check if returning from OAuth
    const params = new URLSearchParams(window.location.search);
    if (params.get("github_connected") === "true") {
      setConnected(true);
      setUsername(params.get("github_username"));
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [checkStatus]);

  const connect = useCallback(() => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const redirectUri = window.location.origin;
    window.location.href = `https://${projectId}.supabase.co/functions/v1/github-auth/authorize?session_id=${sessionId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  }, [sessionId]);

  const disconnect = useCallback(async () => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
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
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
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
      return res.json();
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
        commit: {
          message: string;
          author: { name: string; date: string };
        };
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

  return {
    connected,
    username,
    loading,
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
  };
}
