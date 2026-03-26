import { useState, useEffect, useCallback, memo } from "react";
import {
  GitBranch,
  GitCommitHorizontal,
  GitMerge,
  GitCompare,
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  FileEdit,
  FilePlus,
  FileMinus,
  Clock,
  AlertTriangle,
  ChevronDown,
  Github,
  WifiOff,
  ArrowDownToLine,
  Eye,
} from "lucide-react";
import { useGitHub, type GitHubRepo, GitHubError } from "@/hooks/useGitHub";

type GitTab = "status" | "branches" | "log" | "diff";

interface GitPanelProps {
  currentRepo?: { owner: string; repo: string } | null;
}

/** Diff patch viewer */
const DiffViewer = memo(function DiffViewer({ patch, filename }: { patch: string; filename: string }) {
  if (!patch) return <p className="text-[10px] text-muted-foreground px-3 py-1">No diff available</p>;

  const lines = patch.split("\n");
  return (
    <div className="font-mono text-[10px] leading-relaxed overflow-x-auto">
      {lines.map((line, i) => {
        let bgClass = "";
        let textClass = "text-foreground/70";
        if (line.startsWith("+") && !line.startsWith("+++")) {
          bgClass = "bg-ide-success/10";
          textClass = "text-ide-success";
        } else if (line.startsWith("-") && !line.startsWith("---")) {
          bgClass = "bg-destructive/10";
          textClass = "text-destructive";
        } else if (line.startsWith("@@")) {
          bgClass = "bg-ide-info/10";
          textClass = "text-ide-info";
        }
        return (
          <div key={i} className={`px-3 py-px ${bgClass} ${textClass}`}>
            {line || " "}
          </div>
        );
      })}
    </div>
  );
});

/** Memoized commit item */
const CommitItem = memo(function CommitItem({ commit, isFirst, isLast, onViewDiff }: {
  commit: { sha: string; commit: { message: string; author: { name: string; date: string } }; author?: { login: string } | null };
  isFirst: boolean;
  isLast: boolean;
  onViewDiff?: (sha: string) => void;
}) {
  return (
    <div className="px-3 py-2 border-b border-border/30 hover:bg-secondary/20 transition-colors group">
      <div className="flex items-start gap-2">
        <div className="mt-1.5 shrink-0 flex flex-col items-center">
          <div className={`w-2 h-2 rounded-full ${isFirst ? "bg-primary" : "bg-muted-foreground/30"}`} />
          {!isLast && <div className="w-px h-6 bg-border mt-0.5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-foreground leading-snug line-clamp-2">{commit.commit.message}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-muted-foreground font-mono">{commit.sha.slice(0, 7)}</span>
            <span className="text-[10px] text-muted-foreground">{commit.author?.login || commit.commit.author.name}</span>
            {onViewDiff && (
              <button
                onClick={() => onViewDiff(commit.sha)}
                className="flex items-center gap-0.5 text-[10px] text-primary/60 transition-colors opacity-100 hover:text-primary md:opacity-0 md:group-hover:opacity-100"
              >
                <Eye className="h-2.5 w-2.5" />
                diff
              </button>
            )}
            <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              {formatRelativeTime(commit.commit.author.date)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

export function GitPanel({ currentRepo }: GitPanelProps) {
  const {
    connected,
    username,
    loading: authLoading,
    online,
    connect,
    listRepos,
    listBranches,
    createBranch,
    deleteBranch,
    listCommits,
    getStatus,
    compareCommits,
    getCommitDiff,
    mergeBranch,
  } = useGitHub();

  const [tab, setTab] = useState<GitTab>("status");
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<{ owner: string; repo: string } | null>(currentRepo || null);
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Status tab
  const [statusFiles, setStatusFiles] = useState<Array<{ filename: string; status: string; additions: number; deletions: number }>>([]);

  // Branches tab
  const [branches, setBranches] = useState<Array<{ name: string; commit: { sha: string } }>>([]);
  const [activeBranch, setActiveBranch] = useState("main");
  const [newBranchName, setNewBranchName] = useState("");
  const [creatingBranch, setCreatingBranch] = useState(false);
  const [mergingFrom, setMergingFrom] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);

  // Log tab
  const [commits, setCommits] = useState<Array<{
    sha: string;
    commit: { message: string; author: { name: string; date: string } };
    author?: { login: string; avatar_url: string } | null;
  }>>([]);

  // Diff tab
  const [diffFiles, setDiffFiles] = useState<Array<{ filename: string; status: string; additions: number; deletions: number; patch: string }>>([]);
  const [diffSummary, setDiffSummary] = useState<{ ahead_by: number; behind_by: number } | null>(null);
  const [expandedDiff, setExpandedDiff] = useState<string | null>(null);
  const [diffSource, setDiffSource] = useState<string>(""); // "compare:base...head" or "commit:sha"

  useEffect(() => {
    if (connected && online) {
      listRepos().then((data) => {
        if (Array.isArray(data)) setRepos(data);
      }).catch(() => { });
    }
  }, [connected, online, listRepos]);

  useEffect(() => {
    if (currentRepo) setSelectedRepo(currentRepo);
  }, [currentRepo]);

  // Auto-clear success message
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  const refresh = useCallback(async () => {
    if (!selectedRepo || !online) return;
    setLoading(true);
    setError(null);
    try {
      if (tab === "status") {
        const data = await getStatus(selectedRepo.owner, selectedRepo.repo);
        setStatusFiles(data?.files || []);
      } else if (tab === "branches") {
        const data = await listBranches(selectedRepo.owner, selectedRepo.repo);
        if (Array.isArray(data)) setBranches(data);
      } else if (tab === "log") {
        const data = await listCommits(selectedRepo.owner, selectedRepo.repo, activeBranch);
        if (Array.isArray(data)) setCommits(data);
      } else if (tab === "diff") {
        // Compare active branch with default (main)
        if (activeBranch !== "main") {
          const data = await compareCommits(selectedRepo.owner, selectedRepo.repo, "main", activeBranch);
          setDiffFiles(data.files || []);
          setDiffSummary({ ahead_by: data.ahead_by, behind_by: data.behind_by });
          setDiffSource(`${activeBranch} vs main`);
        } else {
          setDiffFiles([]);
          setDiffSummary(null);
          setDiffSource("");
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof GitHubError ? e.message : "Failed to load data";
      setError(msg);
    }
    setLoading(false);
  }, [selectedRepo, tab, activeBranch, online, getStatus, listBranches, listCommits, compareCommits]);

  useEffect(() => {
    if (selectedRepo) refresh();
  }, [selectedRepo, tab, refresh]);

  const handleCreateBranch = async () => {
    if (!selectedRepo || !newBranchName.trim()) return;
    setCreatingBranch(true);
    setError(null);
    try {
      await createBranch(selectedRepo.owner, selectedRepo.repo, newBranchName.trim(), activeBranch);
      setNewBranchName("");
      setSuccessMsg(`Branch "${newBranchName.trim()}" created`);
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof GitHubError ? e.message : "Failed to create branch");
    }
    setCreatingBranch(false);
  };

  const handleDeleteBranch = async (branch: string) => {
    if (!selectedRepo) return;
    setError(null);
    try {
      await deleteBranch(selectedRepo.owner, selectedRepo.repo, branch);
      setSuccessMsg(`Branch "${branch}" deleted`);
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof GitHubError ? e.message : "Failed to delete branch");
    }
  };

  const handleMerge = async (head: string) => {
    if (!selectedRepo) return;
    setMerging(true);
    setError(null);
    try {
      const result = await mergeBranch(selectedRepo.owner, selectedRepo.repo, activeBranch, head);
      if (result?.error === "merge_conflict") {
        setError("⚠️ تعارض في الدمج! يرجى حل التعارضات يدوياً على GitHub.");
      } else {
        setSuccessMsg(`Merged "${head}" into "${activeBranch}"`);
        setMergingFrom(null);
      }
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof GitHubError ? e.message : "Merge failed");
    }
    setMerging(false);
  };

  const handleViewCommitDiff = async (sha: string) => {
    if (!selectedRepo) return;
    setTab("diff");
    setLoading(true);
    setError(null);
    try {
      const data = await getCommitDiff(selectedRepo.owner, selectedRepo.repo, sha);
      setDiffFiles(data.files || []);
      setDiffSummary(null);
      setDiffSource(`commit ${sha.slice(0, 7)}`);
    } catch (e: unknown) {
      setError(e instanceof GitHubError ? e.message : "Failed to load diff");
    }
    setLoading(false);
  };

  const handleSelectRepo = (repo: GitHubRepo) => {
    const [owner, repoName] = repo.full_name.split("/");
    setSelectedRepo({ owner, repo: repoName });
    setRepoDropdownOpen(false);
    setActiveBranch(repo.default_branch || "main");
  };

  if (authLoading) {
    return (
      <div className="h-full bg-ide-panel flex items-center justify-center">
        <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="h-full bg-ide-panel flex flex-col items-center justify-center px-6 text-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
          <Github className="h-6 w-6 text-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground mb-1">Connect GitHub</p>
          <p className="text-xs text-muted-foreground">Connect to manage branches, view history, and track changes.</p>
        </div>
        <button
          onClick={connect}
          className="px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <Github className="h-4 w-4" />
          Connect
        </button>
      </div>
    );
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case "added": return <FilePlus className="h-3 w-3 text-ide-success" />;
      case "removed": return <FileMinus className="h-3 w-3 text-destructive" />;
      case "modified": return <FileEdit className="h-3 w-3 text-ide-warning" />;
      case "renamed": return <FileEdit className="h-3 w-3 text-ide-info" />;
      default: return <FileEdit className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const tabs: { id: GitTab; label: string; icon: React.ReactNode }[] = [
    { id: "status", label: "Status", icon: <CheckCircle2 className="h-3 w-3" /> },
    { id: "branches", label: "Branches", icon: <GitBranch className="h-3 w-3" /> },
    { id: "log", label: "Log", icon: <GitCommitHorizontal className="h-3 w-3" /> },
    { id: "diff", label: "Diff", icon: <GitCompare className="h-3 w-3" /> },
  ];

  return (
    <div className="h-full bg-ide-panel flex flex-col">
      {/* Offline banner */}
      {!online && (
        <div className="px-3 py-1.5 bg-destructive/10 border-b border-destructive/20 flex items-center gap-2 shrink-0">
          <WifiOff className="h-3 w-3 text-destructive" />
          <span className="text-[10px] text-destructive font-medium">Offline</span>
        </div>
      )}

      {/* Success banner */}
      {successMsg && (
        <div className="px-3 py-1.5 bg-ide-success/10 border-b border-ide-success/20 flex items-center gap-2 shrink-0">
          <CheckCircle2 className="h-3 w-3 text-ide-success" />
          <span className="text-[10px] text-ide-success font-medium">{successMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="px-3 py-2 border-b border-border flex items-center gap-2 shrink-0">
        <GitBranch className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Git</span>
        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-ide-success/15 text-ide-success font-medium">
          @{username}
        </span>
      </div>

      {/* Repo selector */}
      <div className="px-3 py-1.5 border-b border-border shrink-0 relative">
        <button
          onClick={() => setRepoDropdownOpen(!repoDropdownOpen)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md bg-secondary/50 hover:bg-secondary transition-colors text-sm"
        >
          <span className="truncate text-foreground flex-1 text-left font-mono text-xs">
            {selectedRepo ? `${selectedRepo.owner}/${selectedRepo.repo}` : "Select repository..."}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
        </button>
        {repoDropdownOpen && (
          <div className="absolute top-full left-3 right-3 z-50 mt-1 bg-popover border border-border rounded-lg shadow-xl max-h-48 overflow-y-auto">
            {repos.map((repo) => (
              <button
                key={repo.id}
                onClick={() => handleSelectRepo(repo)}
                className="w-full text-left px-3 py-2 hover:bg-secondary/50 transition-colors text-xs font-mono truncate text-foreground"
              >
                {repo.full_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border shrink-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1 px-1 py-2 text-[10px] font-medium transition-all ${tab === t.id
                ? "text-primary border-b border-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
              }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
        <button
          onClick={refresh}
          disabled={!online}
          className="px-2 py-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-2 bg-destructive/10 border-b border-destructive/20 flex items-center gap-2 shrink-0">
          <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
          <span className="text-[11px] text-destructive truncate">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <XCircle className="h-3 w-3 text-destructive/60 hover:text-destructive" />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
          </div>
        )}

        {!loading && !selectedRepo && (
          <div className="flex items-center justify-center py-8">
            <p className="text-xs text-muted-foreground">Select a repository above</p>
          </div>
        )}

        {/* STATUS TAB */}
        {!loading && selectedRepo && tab === "status" && (
          <div className="py-1">
            <div className="px-3 py-2 flex items-center gap-2 border-b border-border/50">
              <GitBranch className="h-3 w-3 text-primary" />
              <span className="text-xs font-mono text-foreground">{activeBranch}</span>
            </div>
            {statusFiles.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <CheckCircle2 className="h-6 w-6 text-ide-success mx-auto mb-2 opacity-40" />
                <p className="text-xs text-muted-foreground">Working tree clean</p>
              </div>
            ) : (
              statusFiles.map((f, i) => (
                <div key={i} className="px-3 py-1.5 flex items-center gap-2 hover:bg-secondary/30 transition-colors">
                  {statusIcon(f.status)}
                  <span className="text-xs font-mono text-foreground truncate flex-1">{f.filename}</span>
                  <span className="text-[10px] text-ide-success">+{f.additions}</span>
                  <span className="text-[10px] text-destructive">-{f.deletions}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* BRANCHES TAB */}
        {!loading && selectedRepo && tab === "branches" && (
          <div className="py-1">
            {/* Create branch */}
            <div className="px-3 py-2 border-b border-border/50 flex gap-1.5">
              <input
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateBranch()}
                placeholder="new-branch-name"
                className="flex-1 bg-secondary border border-border rounded px-2 py-1 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={handleCreateBranch}
                disabled={creatingBranch || !newBranchName.trim() || !online}
                className="p-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40 transition-colors"
                title="Create branch"
              >
                {creatingBranch ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              </button>
            </div>
            <div className="px-3 py-1 text-[10px] text-muted-foreground">
              from <span className="text-foreground">{activeBranch}</span>
            </div>

            {/* Branch list */}
            {branches.map((b) => (
              <div
                key={b.name}
                className={`px-3 py-1.5 flex items-center gap-2 hover:bg-secondary/30 transition-colors cursor-pointer group ${b.name === activeBranch ? "bg-primary/5" : ""
                  }`}
                onClick={() => setActiveBranch(b.name)}
              >
                <GitBranch className={`h-3 w-3 shrink-0 ${b.name === activeBranch ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-xs font-mono truncate flex-1 ${b.name === activeBranch ? "text-primary font-medium" : "text-foreground"}`}>
                  {b.name}
                </span>
                {b.name === activeBranch && (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-primary/15 text-primary font-medium">HEAD</span>
                )}
                {b.name !== activeBranch && (
                  <div className="flex items-center gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                    <button
                      onClick={(e) => { e.stopPropagation(); setMergingFrom(b.name); }}
                      className="p-0.5 rounded hover:bg-ide-info/20 text-muted-foreground hover:text-ide-info transition-colors"
                      title={`Merge ${b.name} into ${activeBranch}`}
                    >
                      <GitMerge className="h-2.5 w-2.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteBranch(b.name); }}
                      className="p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete branch"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Merge confirmation */}
            {mergingFrom && (
              <div className="mx-3 mt-2 p-2 rounded-lg bg-ide-info/10 border border-ide-info/20">
                <p className="text-[11px] text-ide-info mb-2">
                  Merge <span className="font-mono font-medium">{mergingFrom}</span> into <span className="font-mono font-medium">{activeBranch}</span>?
                </p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleMerge(mergingFrom)}
                    disabled={merging}
                    className="flex-1 px-2 py-1 rounded bg-ide-info/20 text-ide-info text-[10px] font-medium hover:bg-ide-info/30 disabled:opacity-40 flex items-center justify-center gap-1"
                  >
                    {merging ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <GitMerge className="h-2.5 w-2.5" />}
                    Merge
                  </button>
                  <button
                    onClick={() => setMergingFrom(null)}
                    className="px-2 py-1 rounded bg-secondary text-muted-foreground text-[10px] hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* LOG TAB */}
        {!loading && selectedRepo && tab === "log" && (
          <div className="py-1">
            <div className="px-3 py-1.5 flex items-center gap-2 border-b border-border/50 text-[10px] text-muted-foreground">
              <GitBranch className="h-2.5 w-2.5" />
              {activeBranch} · {commits.length} commits
            </div>
            {commits.map((c, i) => (
              <CommitItem
                key={c.sha}
                commit={c}
                isFirst={i === 0}
                isLast={i === commits.length - 1}
                onViewDiff={handleViewCommitDiff}
              />
            ))}
          </div>
        )}

        {/* DIFF TAB */}
        {!loading && selectedRepo && tab === "diff" && (
          <div className="py-1">
            {diffSource && (
              <div className="px-3 py-1.5 flex items-center gap-2 border-b border-border/50">
                <GitCompare className="h-3 w-3 text-ide-info" />
                <span className="text-[10px] text-muted-foreground font-mono">{diffSource}</span>
                {diffSummary && (
                  <span className="ml-auto text-[10px]">
                    <span className="text-ide-success">↑{diffSummary.ahead_by}</span>
                    {" "}
                    <span className="text-destructive">↓{diffSummary.behind_by}</span>
                  </span>
                )}
              </div>
            )}

            {diffFiles.length === 0 && !diffSource && activeBranch === "main" ? (
              <div className="px-3 py-6 text-center">
                <GitCompare className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Switch to a non-main branch to compare</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">or click "diff" on a commit in the Log tab</p>
              </div>
            ) : diffFiles.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <CheckCircle2 className="h-6 w-6 text-ide-success/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No differences found</p>
              </div>
            ) : (
              diffFiles.map((f) => (
                <div key={f.filename}>
                  <button
                    onClick={() => setExpandedDiff(expandedDiff === f.filename ? null : f.filename)}
                    className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-secondary/30 transition-colors text-left"
                  >
                    {statusIcon(f.status)}
                    <span className="text-xs font-mono text-foreground truncate flex-1">{f.filename}</span>
                    <span className="text-[10px] text-ide-success">+{f.additions}</span>
                    <span className="text-[10px] text-destructive">-{f.deletions}</span>
                    <ChevronDown className={`h-2.5 w-2.5 text-muted-foreground transition-transform ${expandedDiff === f.filename ? "rotate-180" : ""}`} />
                  </button>
                  {expandedDiff === f.filename && (
                    <div className="border-y border-border/30 bg-background/50">
                      <DiffViewer patch={f.patch} filename={f.filename} />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
