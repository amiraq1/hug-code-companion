import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Lock,
  Globe,
  GitBranch,
  Star,
  ArrowRight,
  Loader2,
  RefreshCw,
  ArrowLeft,
  Filter,
} from "lucide-react";
import { useGitHub, type GitHubRepo } from "@/hooks/useGitHub";

interface ReposScreenProps {
  onSelectRepo: (repo: GitHubRepo) => void;
  onBack: () => void;
}

export function ReposScreen({ onSelectRepo, onBack }: ReposScreenProps) {
  const { listRepos, connected } = useGitHub();
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "public" | "private">("all");

  const loadRepos = async () => {
    setLoading(true);
    try {
      const data = await listRepos();
      if (Array.isArray(data)) setRepos(data);
    } catch {
      setRepos([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (connected) loadRepos();
  }, [connected]);

  const filtered = useMemo(() => {
    let result = repos;
    if (filter === "public") result = result.filter((r) => !r.private);
    if (filter === "private") result = result.filter((r) => r.private);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [repos, search, filter]);

  return (
    <div className="h-screen flex flex-col bg-background grain-overlay">
      {/* Header */}
      <div className="h-12 bg-ide-sidebar border-b border-border flex items-center px-4 gap-3 shrink-0">
        <button
          onClick={onBack}
          className="p-1.5 rounded-md hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
          <span className="text-[13px] font-display font-semibold tracking-tight text-foreground">
            code<span className="text-primary">agent</span>
          </span>
        </div>
        <span className="text-xs text-muted-foreground font-mono">/ repositories</span>
      </div>

      {/* Search & Filter */}
      <div className="px-4 md:px-8 lg:px-16 py-4 border-b border-border bg-ide-sidebar/50 shrink-0">
        <div className="max-w-3xl mx-auto flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search repositories..."
              className="w-full bg-secondary border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-shadow"
            />
          </div>
          <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
            {(["all", "public", "private"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-2 text-xs font-medium capitalize transition-colors ${
                  filter === f
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            onClick={loadRepos}
            className="p-2.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Repos Grid */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-16 py-6">
        <div className="max-w-3xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm text-muted-foreground">
                {search ? "No repositories match your search." : "No repositories found."}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filtered.map((repo) => (
                <button
                  key={repo.id}
                  onClick={() => onSelectRepo(repo)}
                  className="group w-full text-left p-4 bg-card border border-border rounded-xl hover:border-primary/30 hover:bg-card/80 transition-all duration-200 active:scale-[0.995]"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {repo.private ? (
                        <Lock className="h-4 w-4 text-ide-warning" />
                      ) : (
                        <Globe className="h-4 w-4 text-ide-success" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground truncate">
                          {repo.name}
                        </h3>
                        <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      {repo.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {repo.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <GitBranch className="h-2.5 w-2.5" />
                          {repo.default_branch}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(repo.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
