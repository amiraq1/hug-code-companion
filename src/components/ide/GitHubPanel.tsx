import { useState, useEffect, useCallback } from "react";
import {
  GitBranch,
  Github,
  Folder,
  File,
  ArrowLeft,
  Upload,
  LogOut,
  Loader2,
  RefreshCw,
  Lock,
  Globe,
  Sparkles,
} from "lucide-react";
import { useGitHub, type GitHubRepo, type GitHubContent } from "@/hooks/useGitHub";

interface GitHubPanelProps {
  onFileOpen?: (path: string, content: string, language: string) => void;
}

export function GitHubPanel({ onFileOpen }: GitHubPanelProps) {
  const {
    connected,
    username,
    loading: authLoading,
    connect,
    disconnect,
    listRepos,
    listContents,
    getFile,
    commitFile,
  } = useGitHub();

  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [contents, setContents] = useState<GitHubContent[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [commitMsg, setCommitMsg] = useState("");
  const [commitFilePath, setCommitFilePath] = useState("");
  const [commitContent, setCommitContent] = useState("");
  const [committing, setCommitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [view, setView] = useState<"repos" | "browser" | "commit">("repos");

  const handleAutoGenerate = async () => {
    if (!commitContent) return;
    setGenerating(true);
    let fullMessage = "";
    setCommitMsg("");
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "placeholder-project";
      const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (publishableKey) {
        headers.apikey = publishableKey;
        if (publishableKey.startsWith("eyJ")) headers.Authorization = `Bearer ${publishableKey}`;
      }
      
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/code-assist`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `You are a Git expert. Write a concise, professional Conventional Commit message (max 50 chars) for the following code update. Output ONLY the message text without quotes or explanation:\n\n${commitContent.substring(0, 5000)}`
          }]
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const data = JSON.parse(line.slice(6));
                fullMessage += data.choices[0]?.delta?.content || "";
                setCommitMsg(fullMessage.trim().replace(/^["']|["']$/g, ""));
              } catch {}
            }
          }
        }
      }
    } catch (e) {
      console.error("Auto-generate failed", e);
    } finally {
      setGenerating(false);
      setCommitMsg(fullMessage.trim().replace(/^["']|["']$/g, ""));
    }
  };

  const loadRepos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listRepos();
      setRepos(Array.isArray(data) ? data : []);
    } catch {
      setRepos([]);
    }
    setLoading(false);
  }, [listRepos]);

  useEffect(() => {
    if (connected && view === "repos") {
      loadRepos();
    }
  }, [connected, view, loadRepos]);

  const browseRepo = async (repo: GitHubRepo) => {
    setSelectedRepo(repo);
    setCurrentPath("");
    setView("browser");
    await loadContents(repo, "");
  };

  const loadContents = async (repo: GitHubRepo, path: string) => {
    setLoading(true);
    try {
      const [owner, repoName] = repo.full_name.split("/");
      const data = await listContents(owner, repoName, path);
      setContents(Array.isArray(data) ? data : []);
      setCurrentPath(path);
    } catch {
      setContents([]);
    }
    setLoading(false);
  };

  const navigateToDir = (path: string) => {
    if (selectedRepo) loadContents(selectedRepo, path);
  };

  const goBack = () => {
    if (!currentPath) {
      setView("repos");
      setSelectedRepo(null);
      return;
    }
    const parts = currentPath.split("/");
    parts.pop();
    navigateToDir(parts.join("/"));
  };

  const handleCommit = async () => {
    if (!selectedRepo || !commitFilePath || !commitContent || !commitMsg) return;
    setCommitting(true);
    try {
      const [owner, repoName] = selectedRepo.full_name.split("/");
      await commitFile(
        owner,
        repoName,
        commitFilePath,
        commitContent,
        commitMsg,
        selectedRepo.default_branch
      );
      setCommitMsg("");
      setCommitFilePath("");
      setCommitContent("");
      if (view === "browser") await loadContents(selectedRepo, currentPath);
    } catch (err) {
      console.error("Commit failed:", err);
    }
    setCommitting(false);
  };

  // Not connected
  if (authLoading) {
    return (
      <div className="h-full bg-ide-panel border-l border-border flex items-center justify-center">
        <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="h-full bg-ide-panel border-l border-border flex flex-col">
        <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
          <Github className="h-4 w-4 text-foreground" />
          <span className="text-sm font-medium text-foreground">GitHub</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
            <Github className="h-6 w-6 text-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-1">Connect to GitHub</p>
            <p className="text-xs text-muted-foreground">
              Browse repos, manage files, and push commits directly from the IDE.
            </p>
          </div>
          <button
            onClick={connect}
            className="px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Github className="h-4 w-4" />
            Connect GitHub
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-ide-panel border-l border-border flex flex-col">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
        <Github className="h-4 w-4 text-foreground" />
        <span className="text-sm font-medium text-foreground">GitHub</span>
        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-ide-success/15 text-ide-success font-medium">
          @{username}
        </span>
      </div>

      {/* Toolbar */}
      <div className="px-2 py-1.5 border-b border-border flex items-center gap-1">
        {view !== "repos" && (
          <button onClick={goBack} className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
        )}
        {view === "repos" && (
          <button onClick={loadRepos} className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        )}
        {selectedRepo && (
          <button
            onClick={() => setView("commit")}
            className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground ml-auto"
            title="Commit & Push"
          >
            <Upload className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={disconnect}
          className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          title="Disconnect"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
          </div>
        )}

        {/* Repos List */}
        {!loading && view === "repos" && (
          <div className="py-1">
            {repos.length === 0 && (
              <p className="text-xs text-muted-foreground px-4 py-3">No repositories found.</p>
            )}
            {repos.map((repo) => (
              <button
                key={repo.id}
                onClick={() => browseRepo(repo)}
                className="w-full text-left px-3 py-2 hover:bg-secondary/50 transition-colors flex items-start gap-2"
              >
                <div className="mt-0.5">
                  {repo.private ? (
                    <Lock className="h-3.5 w-3.5 text-ide-warning" />
                  ) : (
                    <Globe className="h-3.5 w-3.5 text-ide-success" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-foreground truncate">{repo.name}</div>
                  {repo.description && (
                    <div className="text-[11px] text-muted-foreground truncate">{repo.description}</div>
                  )}
                  <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    <GitBranch className="h-2.5 w-2.5" />
                    {repo.default_branch}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* File Browser */}
        {!loading && view === "browser" && (
          <div className="py-1">
            <div className="px-3 py-1.5 text-[11px] text-muted-foreground font-mono truncate border-b border-border">
              {selectedRepo?.full_name}/{currentPath}
            </div>
            {contents.map((item) => (
              <button
                key={item.sha}
                onClick={async () => {
                  if (item.type === "dir") {
                    navigateToDir(item.path);
                  } else if (selectedRepo && onFileOpen) {
                    // Fetch file content and open in editor
                    try {
                      const [owner, repoName] = selectedRepo.full_name.split("/");
                      const fileData = await getFile(owner, repoName, item.path);
                      if (fileData?.content && fileData?.encoding === "base64") {
                        const base64Content = fileData.content.replace(/\n/g, "");
                        const bytes = Uint8Array.from(atob(base64Content), (char) => char.charCodeAt(0));
                        const decoded = new TextDecoder().decode(bytes);
                        const ext = item.name.split(".").pop() || "";
                        const langMap: Record<string, string> = {
                          ts: "typescript", tsx: "typescript", js: "typescript", jsx: "typescript",
                          json: "json", md: "markdown", css: "css", html: "html",
                          py: "python", rs: "rust", go: "go", yml: "yaml", yaml: "yaml",
                        };
                        onFileOpen(
                          `github:${selectedRepo.full_name}/${item.path}`,
                          decoded,
                          langMap[ext] || "plaintext"
                        );
                      }
                    } catch (err) {
                      console.error("Failed to load file:", err);
                    }
                  }
                }}
                className="w-full text-left px-3 py-1 hover:bg-secondary/50 transition-colors flex items-center gap-2 text-sm"
              >
                {item.type === "dir" ? (
                  <Folder className="h-3.5 w-3.5 text-ide-warning shrink-0" />
                ) : (
                  <File className="h-3.5 w-3.5 text-ide-info shrink-0" />
                )}
                <span className="truncate text-sidebar-foreground">{item.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Commit Form */}
        {!loading && view === "commit" && selectedRepo && (
          <div className="p-3 space-y-3">
            <div>
              <label className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1 block">
                File Path
              </label>
              <input
                value={commitFilePath}
                onChange={(e) => setCommitFilePath(e.target.value)}
                placeholder="src/example.ts"
                className="w-full bg-secondary border border-border rounded px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1 block">
                Content
              </label>
              <textarea
                value={commitContent}
                onChange={(e) => setCommitContent(e.target.value)}
                placeholder="File content..."
                rows={6}
                className="w-full bg-secondary border border-border rounded px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono resize-none"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider block">
                  Commit Message
                </label>
                {commitContent && (
                  <button
                    type="button"
                    onClick={handleAutoGenerate}
                    disabled={generating}
                    className="text-[10px] text-primary/80 hover:text-primary flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    {generating ? <Loader2 className="h-3 w-3 animate-spin text-primary" /> : <Sparkles className="h-3 w-3 text-primary" />}
                    Auto Generate
                  </button>
                )}
              </div>
              <input
                value={commitMsg}
                onChange={(e) => setCommitMsg(e.target.value)}
                placeholder="feat: add new feature"
                className="w-full bg-secondary border border-border rounded px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <button
              onClick={handleCommit}
              disabled={committing || !commitFilePath || !commitContent || !commitMsg}
              className="w-full px-3 py-2 bg-ide-success text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
            >
              {committing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {committing ? "Pushing..." : "Commit & Push"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
