import { memo, useMemo, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { Loader2 } from "lucide-react";
import type { FileNode } from "@/stores/editorStore";
import type { EditorSettings } from "@/components/screens/settings.types";

interface CodeEditorProps {
  file: FileNode | null;
  onContentChange: (path: string, content: string) => void;
  settings?: EditorSettings;
  onValidateErrors?: (path: string, errors: string[]) => void;
}

function getMonacoLanguage(lang?: string): string {
  switch (lang) {
    case "typescript": return "typescript";
    case "json": return "json";
    case "markdown": return "markdown";
    case "css": return "css";
    case "html": return "html";
    case "python": return "python";
    case "rust": return "rust";
    case "go": return "go";
    case "yaml": return "yaml";
    default: return "plaintext";
  }
}

export const CodeEditor = memo(function CodeEditor({ file, onContentChange, settings, onValidateErrors }: CodeEditorProps) {
  const handleContentChange = useCallback((value?: string) => {
    if (file?.path) {
      onContentChange(file.path, value || "");
    }
  }, [file?.path, onContentChange]);

  const handleValidate = useCallback((markers: any[]) => {
    const errors = markers
      .filter(m => m.severity >= 8) // 8 is Error severity in Monaco
      .map(m => `سطر ${m.startLineNumber}: ${m.message}`);
      
    if (onValidateErrors) {
      onValidateErrors(file?.path || "", errors);
    }
  }, [file?.path, onValidateErrors]);

  const editorOptions = useMemo(() => ({
    fontSize: settings?.fontSize ?? 13,
    fontFamily: "'IBM Plex Mono', monospace",
    fontLigatures: true,
    minimap: { enabled: settings?.minimap ?? true, scale: 1, renderCharacters: false },
    padding: { top: 16, bottom: 16 },
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    cursorBlinking: "smooth" as const,
    cursorSmoothCaretAnimation: "on" as const,
    renderLineHighlight: "gutter" as const,
    bracketPairColorization: { enabled: settings?.bracketPairs ?? true },
    lineNumbers: (settings?.lineNumbers ?? true) ? "on" as const : "off" as const,
    wordWrap: (settings?.wordWrap ?? true) ? "on" as const : "off" as const,
    tabSize: settings?.tabSize ?? 2,
    lineHeight: 1.7,
    letterSpacing: 0.3,
    guides: {
      indentation: true,
      bracketPairs: true,
    },
  }), [
    settings?.fontSize,
    settings?.minimap,
    settings?.bracketPairs,
    settings?.lineNumbers,
    settings?.wordWrap,
    settings?.tabSize
  ]);

  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center bg-ide-editor">
        <div className="text-center space-y-3 animate-fade-in">
          <div className="text-6xl font-display font-light text-primary/8 select-none">{"</>"}</div>
          <p className="text-[12px] text-muted-foreground/40 font-mono tracking-wide">no file selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-ide-editor">
      <Editor
        height="100%"
        language={getMonacoLanguage(file.language)}
        value={file.content || ""}
        onChange={handleContentChange}
        onValidate={handleValidate}
        theme="vs-dark"
        options={editorOptions}
        loading={
          <div className="flex h-full items-center justify-center text-muted-foreground/50">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="ml-2 text-xs font-mono">Loading IDE...</span>
          </div>
        }
      />
    </div>
  );
});
