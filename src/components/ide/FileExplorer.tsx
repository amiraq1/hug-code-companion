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
          className="flex w-full items-center gap-1 px-2 py-0.5 text-sm hover:bg-secondary/50 transition-colors"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
          {expanded ? (
            <FolderOpen className="h-4 w-4 text-ide-warning shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-ide-warning shrink-0" />
          )}
          <span className="truncate text-sidebar-foreground">{node.name}</span>
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
    if (name.endsWith(".json")) return "text-ide-warning";
    if (name.endsWith(".md")) return "text-foreground";
    if (name.endsWith(".css")) return "text-accent";
    return "text-muted-foreground";
  };

  return (
    <button
      onClick={() => onFileSelect(node.path)}
      className={`flex w-full items-center gap-1 px-2 py-0.5 text-sm transition-colors ${
        isActive ? "bg-secondary text-foreground" : "hover:bg-secondary/50 text-sidebar-foreground"
      }`}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
    >
      <File className={`h-4 w-4 shrink-0 ${getFileColor(node.name)}`} />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

export function FileExplorer({ files, activeFile, onFileSelect }: FileExplorerProps) {
  return (
    <div className="h-full bg-ide-sidebar border-r border-border flex flex-col">
      <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Explorer
      </div>
      <div className="flex-1 overflow-y-auto py-1">
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
