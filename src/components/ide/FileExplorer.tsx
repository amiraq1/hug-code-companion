import { useState, useMemo, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  Database,
  File,
  Folder,
  FolderOpen,
  FileJson,
  FileCode2,
  FileType,
  FileText,
  Image as ImageIcon,
  Package,
  TerminalSquare,
} from "lucide-react";
import type { FileNode } from "@/stores/editorStore";
import { NativeFlatList } from "@/components/native/NativeFlatList";
import { getFileMeta } from "@/lib/fileMeta";

interface FileExplorerProps {
  files: FileNode[];
  activeFile: string | null;
  onFileSelect: (path: string) => void;
}

type FlattenedFileNode = {
  node: FileNode;
  depth: number;
};

const renderFileIcon = (name: string, language: string | undefined, colorClass: string) => {
  const { kind } = getFileMeta(name, language);
  const props = { className: `h-4 w-4 shrink-0 ${colorClass}` };

  switch (kind) {
    case "package":
      return <Package {...props} />;
    case "json":
      return <FileJson {...props} />;
    case "typescript":
    case "javascript":
    case "python":
    case "rust":
    case "go":
      return <FileCode2 {...props} />;
    case "styles":
    case "markup":
    case "config":
    case "yaml":
      return <FileType {...props} />;
    case "shell":
      return <TerminalSquare {...props} />;
    case "markdown":
    case "text":
    case "git":
      return <FileText {...props} />;
    case "image":
      return <ImageIcon {...props} />;
    case "database":
      return <Database {...props} />;
    default:
      return <File {...props} />;
  }
};

export function FileExplorer({ files, activeFile, onFileSelect }: FileExplorerProps) {
  // Extract initial expanded paths efficiently
  const initialExpanded = useMemo(() => {
    const expanded = new Set<string>();
    const traverse = (nodes: FileNode[], depth: number) => {
      if (depth >= 2) return;
      nodes.forEach((n) => {
        if (n.type === "folder") {
          expanded.add(n.path);
          if (n.children) traverse(n.children, depth + 1);
        }
      });
    };
    traverse(files, 0);
    return expanded;
  }, [files]);

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(initialExpanded);

  const toggleFolder = useCallback((folderPath: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  }, []);

  // Elite approach: Deep tree flattening into O(1) rendering virtual bounds
  const flattenedFiles = useMemo(() => {
    const list: FlattenedFileNode[] = [];
    const traverse = (nodes: FileNode[], depth: number) => {
      for (const node of nodes) {
        list.push({ node, depth });
        if (node.type === "folder" && expandedFolders.has(node.path) && node.children) {
          traverse(node.children, depth + 1);
        }
      }
    };
    traverse(files, 0);
    return list;
  }, [files, expandedFolders]);

  const renderItem = useCallback(
    (item: FlattenedFileNode) => {
      const { node, depth } = item;
      const isExpanded = expandedFolders.has(node.path);
      const isActive = activeFile === node.path;
      const fileColor = getFileMeta(node.name, node.language).accentClass;

      if (node.type === "folder") {
        return (
          <button
            onClick={() => toggleFolder(node.path)}
            className="flex w-full items-center gap-1.5 px-2 py-[3px] text-[12px] hover:bg-secondary/40 transition-all duration-150 h-full"
            style={{ paddingLeft: `${depth * 14 + 8}px` }}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground/60 shrink-0" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground/60 shrink-0" />
            )}
            {isExpanded ? (
              <FolderOpen className="h-3.5 w-3.5 text-primary/70 shrink-0" />
            ) : (
              <Folder className="h-3.5 w-3.5 text-primary/50 shrink-0" />
            )}
            <span className="truncate text-sidebar-foreground font-medium">{node.name}</span>
          </button>
        );
      }

      return (
        <button
          onClick={() => onFileSelect(node.path)}
          className={`group flex w-full items-center gap-2 px-2 py-1.5 text-[13px] transition-all duration-200 relative h-full ${isActive
            ? "bg-primary/10 text-primary font-medium border-l-2 border-l-primary"
            : "hover:bg-secondary/60 text-sidebar-foreground/80 hover:text-foreground"
            }`}
          style={{ paddingLeft: `${depth * 14 + 22}px` }}
        >
          {renderFileIcon(node.name, node.language, isActive ? "text-primary" : fileColor)}
          <span className="truncate">{node.name}</span>
        </button>
      );
    },
    [activeFile, expandedFolders, onFileSelect, toggleFolder]
  );

  return (
    <div className="h-full bg-ide-sidebar/95 backdrop-blur-sm border-r border-border flex flex-col shadow-sm isolate">
      <div className="px-4 py-3 flex items-center justify-between shadow-sm z-10 relative">
        <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-muted-foreground/80">
          Explorer
        </span>
      </div>
      <div className="flex-1 overflow-hidden">
        <NativeFlatList
          data={flattenedFiles}
          renderItem={renderItem}
          keyExtractor={(item) => item.node.path}
          itemHeight={32}
          className="h-full w-full"
        />
      </div>
    </div>
  );
}
