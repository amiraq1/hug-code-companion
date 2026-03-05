import { X, File, Upload } from "lucide-react";
import type { FileNode } from "@/stores/editorStore";

interface TabBarProps {
  openFiles: FileNode[];
  activeFile: string | null;
  onTabSelect: (path: string) => void;
  onTabClose: (path: string) => void;
  onCommitFile?: (path: string) => void;
}

export function TabBar({ openFiles, activeFile, onTabSelect, onTabClose, onCommitFile }: TabBarProps) {
  if (openFiles.length === 0) return null;

  const getTabColor = (name: string) => {
    if (name.endsWith(".tsx") || name.endsWith(".ts")) return "text-ide-info";
    if (name.endsWith(".json")) return "text-primary/70";
    if (name.endsWith(".md")) return "text-foreground/60";
    if (name.endsWith(".css")) return "text-accent/70";
    return "text-muted-foreground";
  };

  return (
    <div className="flex bg-ide-tab-inactive border-b border-border overflow-x-auto">
      {openFiles.map((file) => {
        const isActive = activeFile === file.path;
        const isGitHub = file.path.startsWith("github:");
        return (
          <div
            key={file.path}
            className={`tab-indicator group flex items-center gap-2 px-4 py-2 text-[12px] font-mono cursor-pointer border-r border-border/50 shrink-0 transition-all duration-200 ${
              isActive
                ? "active bg-ide-tab-active text-foreground"
                : "text-muted-foreground hover:bg-secondary/30 hover:text-secondary-foreground"
            }`}
            onClick={() => onTabSelect(file.path)}
          >
            <File className={`h-3 w-3 shrink-0 ${getTabColor(file.name)}`} />
            <span className="truncate max-w-[120px]">{file.name}</span>
            {isGitHub && onCommitFile && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCommitFile(file.path);
                }}
                className="opacity-0 group-hover:opacity-100 hover:bg-ide-success/20 text-ide-success rounded p-0.5 transition-all duration-150"
                aria-label={`Commit and push ${file.name}`}
                title="Commit & Push"
              >
                <Upload className="h-2.5 w-2.5" />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(file.path);
              }}
              className="opacity-0 group-hover:opacity-100 hover:bg-secondary rounded p-0.5 transition-all duration-150"
              aria-label={`Close ${file.name} tab`}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
