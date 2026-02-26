import { useState } from "react";
import { Upload, X, Loader2, Github } from "lucide-react";

interface CommitDialogProps {
  filePath: string;
  onCommit: (message: string) => Promise<void>;
  onClose: () => void;
}

export function CommitDialog({ filePath, onCommit, onClose }: CommitDialogProps) {
  const [message, setMessage] = useState("");
  const [committing, setCommitting] = useState(false);

  // Extract display path: "github:owner/repo/path" → "owner/repo  ›  path"
  const parts = filePath.replace("github:", "").split("/");
  const repoName = parts.slice(0, 2).join("/");
  const repoPath = parts.slice(2).join("/");

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setCommitting(true);
    try {
      await onCommit(message.trim());
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-xl w-[420px] max-w-[90vw]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Github className="h-4 w-4 text-foreground" />
            <span className="text-sm font-medium text-foreground">Commit & Push</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <div>
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Repository</div>
            <div className="text-sm text-foreground font-mono">{repoName}</div>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">File</div>
            <div className="text-sm text-foreground font-mono truncate">{repoPath}</div>
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1 block">
              Commit Message
            </label>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
              placeholder="Update file via Code Agent Studio"
              autoFocus
              className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={committing || !message.trim()}
            className="px-4 py-1.5 bg-ide-success text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center gap-2"
          >
            {committing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {committing ? "Pushing..." : "Commit & Push"}
          </button>
        </div>
      </div>
    </div>
  );
}
