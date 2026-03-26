import { useEffect } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  AlertTriangle,
  XCircle,
  Trash2,
  Eye,
  Shield,
  TerminalSquare,
} from "lucide-react";
import type { FileNode } from "@/stores/editorStore";
import { usePreview } from "@/hooks/usePreview";
import { Switch } from "@/components/ui/switch";

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
    scriptExecutionEnabled,
    clearErrors,
    injectPreview,
    zoomIn,
    zoomOut,
    resetZoom,
    toggleFullscreen,
    toggleScriptExecution,
  } = usePreview();

  // Re-inject on file change
  useEffect(() => {
    injectPreview(file);
  }, [file, file?.content, injectPreview]);

  const hasIssues = errors.length > 0 || warnings.length > 0;

  return (
    <div
      className={`flex flex-col bg-ide-editor/90 backdrop-blur-xl border-t border-border/80 md:border-t-0 md:border-l shadow-2xl transition-all duration-300 ${isFullscreen
        ? "fixed inset-0 z-50"
        : "h-full"
        }`}
    >
      {/* Toolbar */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-border bg-ide-sidebar/50">
        <div className="flex min-w-0 items-center gap-1.5">
          <Eye className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-mono font-bold text-foreground/80 tracking-widest uppercase">
            Preview
          </span>
          {file && (
            <span className="ml-1 truncate text-[10px] text-muted-foreground/50 max-w-[96px] sm:max-w-[120px]">
              {file.name}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1">
          <div className="mr-1 hidden sm:flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-2 py-1">
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              {scriptExecutionEnabled ? (
                <TerminalSquare className="h-3 w-3 text-primary" />
              ) : (
                <Shield className="h-3 w-3 text-emerald-400" />
              )}
              <span>{scriptExecutionEnabled ? "Scripts" : "Safe"}</span>
            </div>
            <Switch
              checked={scriptExecutionEnabled}
              onCheckedChange={toggleScriptExecution}
              aria-label="Toggle script execution in preview"
            />
          </div>
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
              className="min-w-[32px] rounded px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground text-center transition-colors hover:bg-secondary/60 hover:text-foreground sm:min-w-[36px] sm:text-[10px]"
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
            sandbox={scriptExecutionEnabled ? "allow-scripts" : ""}
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
