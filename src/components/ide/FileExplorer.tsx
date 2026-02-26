import { useState } from "react";
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from "lucide-react";
import type { FileNode } from "@/stores/editorStore";

interface FileExplorerProps {
  files: FileNode[];
  activeFile: string | null;
  onFileSelect: (path: string) => void;
}

function FileTreeItem({
  node,
  depth,
  activeFile,
  onFileSelect,
}: {
  node: FileNode;
  depth: number;
  activeFile: string | null;
  onFileSelect: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const isActive = activeFile === node.path;

  if (node.type === "folder") {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center gap-1.5 px-2 py-[3px] text-[12px] hover:bg-secondary/40 transition-all duration-150"
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
        >
          {expanded ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground/60 shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground/60 shrink-0" />
          )}
          {expanded ? (
            <FolderOpen className="h-3.5 w-3.5 text-primary/70 shrink-0" />
          ) : (
            <Folder className="h-3.5 w-3.5 text-primary/50 shrink-0" />
          )}
          <span className="truncate text-sidebar-foreground font-medium">{node.name}</span>
        </button>
        {expanded && node.children && (
          <div>
            {node.children.map((child) => (
              <FileTreeItem
                key={child.path}
                node={child}
                depth={depth + 1}
                activeFile={activeFile}
                onFileSelect={onFileSelect}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const getFileColor = (name: string) => {
    if (name.endsWith(".tsx") || name.endsWith(".ts")) return "text-ide-info";
    if (name.endsWith(".json")) return "text-primary/60";
    if (name.endsWith(".md")) return "text-foreground/50";
    if (name.endsWith(".css")) return "text-accent/60";
    return "text-muted-foreground";
  };

  return (
    <button
      onClick={() => onFileSelect(node.path)}
      className={`flex w-full items-center gap-1.5 px-2 py-[3px] text-[12px] transition-all duration-150 ${
        isActive
          ? "bg-primary/8 text-foreground border-r-2 border-r-primary"
          : "hover:bg-secondary/40 text-sidebar-foreground"
      }`}
      style={{ paddingLeft: `${depth * 14 + 22}px` }}
    >
      <File className={`h-3.5 w-3.5 shrink-0 ${getFileColor(node.name)}`} />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

export function FileExplorer({ files, activeFile, onFileSelect }: FileExplorerProps) {
  return (
    <div className="h-full bg-ide-sidebar border-r border-border flex flex-col">
      <div className="px-4 py-3 text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        Explorer
      </div>
      <div className="flex-1 overflow-y-auto py-0.5">
        {files.map((node) => (
          <FileTreeItem
            key={node.path}
            node={node}
            depth={0}
            activeFile={activeFile}
            onFileSelect={onFileSelect}
          />
        ))}
      </div>
    </div>
  );
}
