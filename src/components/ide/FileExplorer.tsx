import { useState, useMemo, useCallback, useEffect } from "react";
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

function renderFileIcon(kind: string, colorClass: string) {
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
}

export function FileExplorer({ files, activeFile, onFileSelect }: FileExplorerProps) {
  const initialExpanded = useMemo(() => {
    const expanded = new Set<string>();

    const traverse = (nodes: FileNode[], depth: number) => {
      if (depth >= 2) return;

      for (const node of nodes) {
        if (node.type === "folder") {
          expanded.add(node.path);
          if (node.children) {
            traverse(node.children, depth + 1);
          }
        }
      }
    };

    traverse(files, 0);
    return expanded;
  }, [files]);

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(initialExpanded);

  useEffect(() => {
    setExpandedFolders(initialExpanded);
  }, [initialExpanded]);

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
      const meta = getFileMeta(node.name, node.language);
      const fileColor = meta.accentClass;

      if (node.type === "folder") {
        return (
          <button
            onClick={() => toggleFolder(node.path)}
            aria-expanded={isExpanded}
            title={node.name}
            className="flex h-full w-full items-center gap-1.5 px-2 py-[3px] text-[12px] transition-all duration-150 hover:bg-secondary/40"
            style={{ paddingLeft: `${depth * 14 + 8}px` }}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground/60" />
            ) : (
              <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
            )}

            {isExpanded ? (
              <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary/70" />
            ) : (
              <Folder className="h-3.5 w-3.5 shrink-0 text-primary/50" />
            )}

            <span className="truncate font-medium text-sidebar-foreground">{node.name}</span>
          </button>
        );
      }

      return (
        <button
          onClick={() => onFileSelect(node.path)}
          aria-current={isActive ? "page" : undefined}
          title={node.name}
          className={`group relative flex h-full w-full items-center gap-2 px-2 py-1.5 text-[13px] transition-all duration-200 ${
            isActive
              ? "border-l-2 border-l-primary bg-primary/10 font-medium text-primary"
              : "text-sidebar-foreground/80 hover:bg-secondary/60 hover:text-foreground"
          }`}
          style={{ paddingLeft: `${depth * 14 + 22}px` }}
        >
          {renderFileIcon(meta.kind, isActive ? "text-primary" : fileColor)}
          <span className="truncate">{node.name}</span>
        </button>
      );
    },
    [activeFile, expandedFolders, onFileSelect, toggleFolder],
  );

  return (
    <div className="isolate flex h-full flex-col border-r border-border bg-ide-sidebar/95 shadow-sm backdrop-blur-sm">
      <div className="relative z-10 flex items-center justify-between px-4 py-3 shadow-sm">
        <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80">
          Explorer
        </span>
      </div>

      <div className="flex-1 overflow-hidden">
        {flattenedFiles.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <div className="space-y-2">
              <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground/60">
                Explorer
              </p>
              <p className="text-sm text-muted-foreground">No files available</p>
            </div>
          </div>
        ) : (
          <NativeFlatList
            data={flattenedFiles}
            renderItem={renderItem}
            keyExtractor={(item) => item.node.path}
            itemHeight={32}
            className="h-full w-full"
          />
        )}
      </div>
    </div>
  );
}

