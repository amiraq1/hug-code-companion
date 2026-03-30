import { X, File, Upload } from "lucide-react";
import type { FileNode } from "@/stores/editorStore";
import { getFileAccentClass } from "@/lib/fileMeta";

interface TabBarProps {
  openFiles: FileNode[];
  activeFile: string | null;
  onTabSelect: (path: string) => void;
  onTabClose: (path: string) => void;
  onCommitFile?: (path: string) => void;
}

export function TabBar({ openFiles, activeFile, onTabSelect, onTabClose, onCommitFile }: TabBarProps) {
  if (openFiles.length === 0) return null;

  return (
    <div className="flex snap-x snap-mandatory bg-ide-tab-inactive border-b border-border overflow-x-auto" dir="rtl">
      {openFiles.map((file) => {
        const isActive = activeFile === file.path;
        const isGitHub = file.path.startsWith("github:");
        return (
          <div
            key={file.path}
            className={`tab-indicator group snap-start flex min-h-11 items-center gap-2 border-l border-border/50 px-3 py-2 text-[11px] font-mono cursor-pointer shrink-0 transition-all duration-200 md:px-4 md:text-[12px] ${
              isActive
                ? "active bg-ide-tab-active text-foreground"
                : "text-muted-foreground hover:bg-secondary/30 hover:text-secondary-foreground"
            }`}
            onClick={() => onTabSelect(file.path)}
          >
            <File className={`h-3 w-3 shrink-0 ${getFileAccentClass(file.name, file.language)}`} />
            <span className="truncate max-w-[88px] sm:max-w-[120px]">{file.name}</span>
            {isGitHub && onCommitFile && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCommitFile(file.path);
                }}
                className="rounded p-1 text-ide-success opacity-100 transition-all duration-150 hover:bg-ide-success/20 md:opacity-0 md:group-hover:opacity-100"
                aria-label={`Commit and push ${file.name}`}
                title="حفظ ورفع"
              >
                <Upload className="h-3 w-3" />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(file.path);
              }}
              className="rounded p-1 opacity-100 transition-all duration-150 hover:bg-secondary md:opacity-0 md:group-hover:opacity-100"
              aria-label={`Close ${file.name} tab`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>

  );
}
