import { useEffect } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  AlertTriangle,
  XCircle,
  Trash2,
  Eye,
} from "lucide-react";
import type { FileNode } from "@/stores/editorStore";
import { usePreview } from "@/hooks/usePreview";

interface PreviewPanelProps {
  file: FileNode | null;
}

export function PreviewPanel({ file }: PreviewPanelProps) {
  const {
    iframeRef,
    zoom,
    isFullscreen,
    errors,
    warnings,
    clearErrors,
    injectPreview,
    zoomIn,
    zoomOut,
    resetZoom,
    toggleFullscreen,
  } = usePreview();

  // Re-inject on file change
  useEffect(() => {
    injectPreview(file);
  }, [file, file?.content, injectPreview]);

  const hasIssues = errors.length > 0 || warnings.length > 0;

  return (
    <div
      className={`flex flex-col bg-ide-editor/90 backdrop-blur-xl border-l border-border/80 shadow-2xl transition-all duration-300 ${isFullscreen
        ? "fixed inset-0 z-50"
        : "h-full"
        }`}
    >
      {/* Toolbar */}
      <div className="h-9 shrink-0 flex items-center justify-between px-3 border-b border-border bg-ide-sidebar/50">
        <div className="flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-mono font-bold text-foreground/80 tracking-widest uppercase">
            Preview
          </span>
          {file && (
            <span className="text-[10px] text-muted-foreground/50 ml-1 truncate max-w-[120px]">
              {file.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          {hasIssues && (
            <button
              onClick={clearErrors}
              className="p-1 rounded hover:bg-secondary/60 text-destructive/70 hover:text-destructive transition-colors"
              title="Clear errors"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
          <div className="flex items-center gap-0.5 mx-1">
            <button
              onClick={zoomOut}
              className="p-1 rounded hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={resetZoom}
              className="px-1.5 py-0.5 rounded hover:bg-secondary/60 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors min-w-[36px] text-center"
              title="Reset zoom"
            >
              {zoom}%
            </button>
            <button
              onClick={zoomIn}
              className="p-1 rounded hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            onClick={toggleFullscreen}
            className="p-1 rounded hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Preview iframe */}
      <div className="flex-1 relative overflow-auto bg-[#0d0d0d]">
        {!file ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3 animate-pulse">
              <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto border border-border/50 shadow-xl">
                <Eye className="h-8 w-8 text-primary/30" />
              </div>
              <p className="text-[11px] text-muted-foreground/40 font-mono">
                Awaiting Output Signal
              </p>
            </div>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            title="Live Preview"
            sandbox="allow-scripts"
            className="w-full h-full border-0 bg-[#0d0d0d]"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: "top left",
              width: `${10000 / zoom}%`,
              height: `${10000 / zoom}%`,
            }}
          />
        )}
      </div>

      {/* Error/Warning bar */}
      {hasIssues && (
        <div className="max-h-32 overflow-y-auto border-t border-border bg-ide-sidebar/80 shrink-0">
          {errors.map((err, i) => (
            <div
              key={i}
              className="flex items-start gap-2 px-3 py-1.5 text-[11px] font-mono border-b border-border/50"
            >
              <XCircle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
              <span className="text-destructive/90 break-all">
                {err.message}
                {err.line ? ` (line ${err.line})` : ""}
              </span>
            </div>
          ))}
          {warnings.map((w, i) => (
            <div
              key={`w-${i}`}
              className="flex items-start gap-2 px-3 py-1.5 text-[11px] font-mono border-b border-border/50"
            >
              <AlertTriangle className="h-3 w-3 text-yellow-500 shrink-0 mt-0.5" />
              <span className="text-yellow-500/80 break-all">{w}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
