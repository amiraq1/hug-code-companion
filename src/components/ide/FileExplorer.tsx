import { useState } from "react";
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, FileJson, FileCode2, FileType, FileText, Image as ImageIcon } from "lucide-react";
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
          <span className="truncate text-sidebar-foreground font-medium text-[13px]">{node.name}</span>
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

  const getFileIcon = (name: string, colorClass: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    const props = { className: `h-4 w-4 shrink-0 ${colorClass}` };

    switch (ext) {
      case 'json': return <FileJson {...props} />;
      case 'ts':
      case 'tsx':
      case 'js':
      case 'jsx': return <FileCode2 {...props} />;
      case 'css':
      case 'scss': return <FileType {...props} />;
      case 'md':
      case 'txt': return <FileText {...props} />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'svg': return <ImageIcon {...props} />;
      default: return <File {...props} />;
    }
  };

  const fileColor = getFileColor(node.name);

  return (
    <button
      onClick={() => onFileSelect(node.path)}
      className={`group flex w-full items-center gap-2 px-2 py-1.5 text-[13px] transition-all duration-200 relative ${isActive
          ? "bg-primary/10 text-primary font-medium"
          : "hover:bg-secondary/60 text-sidebar-foreground/80 hover:text-foreground"
        }`}
      style={{ paddingLeft: `${depth * 14 + 22}px` }}
    >
      {isActive && (
        <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-r-full" />
      )}
      {getFileIcon(node.name, isActive ? 'text-primary' : fileColor)}
      <span className="truncate">{node.name}</span>
    </button>
  );
}

export function FileExplorer({ files, activeFile, onFileSelect }: FileExplorerProps) {
  return (
    <div className="h-full bg-ide-sidebar/95 backdrop-blur-sm border-r border-border flex flex-col shadow-sm">
      <div className="px-4 py-3 flex items-center justify-between">
        <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-muted-foreground/80">
          Explorer
        </span>
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
