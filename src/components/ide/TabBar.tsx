import { X, File } from "lucide-react";
import type { FileNode } from "@/stores/editorStore";

interface TabBarProps {
  openFiles: FileNode[];
  activeFile: string | null;
  onTabSelect: (path: string) => void;
  onTabClose: (path: string) => void;
}

export function TabBar({ openFiles, activeFile, onTabSelect, onTabClose }: TabBarProps) {
  if (openFiles.length === 0) return null;

  const getTabColor = (name: string) => {
    if (name.endsWith(".tsx") || name.endsWith(".ts")) return "text-ide-info";
    if (name.endsWith(".json")) return "text-ide-warning";
    if (name.endsWith(".md")) return "text-foreground";
    return "text-muted-foreground";
  };

  return (
    <div className="flex bg-ide-tab-inactive border-b border-border overflow-x-auto">
      {openFiles.map((file) => {
        const isActive = activeFile === file.path;
        return (
          <div
            key={file.path}
            className={`group flex items-center gap-1.5 px-3 py-1.5 text-sm cursor-pointer border-r border-border shrink-0 transition-colors ${
              isActive
                ? "bg-ide-tab-active text-foreground border-t-2 border-t-primary"
                : "text-muted-foreground hover:bg-secondary/30 border-t-2 border-t-transparent"
            }`}
            onClick={() => onTabSelect(file.path)}
          >
            <File className={`h-3.5 w-3.5 shrink-0 ${getTabColor(file.name)}`} />
            <span className="truncate max-w-[120px]">{file.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(file.path);
              }}
              className="opacity-0 group-hover:opacity-100 hover:bg-secondary rounded p-0.5 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
