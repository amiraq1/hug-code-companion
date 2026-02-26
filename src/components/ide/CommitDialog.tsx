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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-md animate-fade-in">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-[420px] max-w-[90vw] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <Github className="h-4 w-4 text-foreground/60" />
            <span className="text-[13px] font-display font-medium text-foreground tracking-tight">Commit & Push</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-secondary transition-all duration-150 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="flex gap-6">
            <div>
              <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-[0.15em] mb-1">Repo</div>
              <div className="text-[13px] text-foreground font-mono">{repoName}</div>
            </div>
            <div className="min-w-0">
              <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-[0.15em] mb-1">File</div>
              <div className="text-[13px] text-foreground font-mono truncate">{repoPath}</div>
            </div>
          </div>
          <div>
            <label className="text-[9px] font-mono text-muted-foreground uppercase tracking-[0.15em] mb-1.5 block">
              Message
            </label>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
              placeholder="describe your changes..."
              autoFocus
              className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/20 transition-all duration-200"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[12px] font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-150"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={committing || !message.trim()}
            className="px-5 py-2 bg-ide-success text-primary-foreground rounded-lg text-[12px] font-medium hover:opacity-90 disabled:opacity-20 transition-all duration-200 flex items-center gap-2"
          >
            {committing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {committing ? "Pushing..." : "Push"}
          </button>
        </div>
      </div>
    </div>
  );
}
