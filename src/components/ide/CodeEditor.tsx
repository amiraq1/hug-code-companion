import Editor from "@monaco-editor/react";
import type { FileNode } from "@/stores/editorStore";
import type { EditorSettings } from "@/components/screens/SettingsScreen";

interface CodeEditorProps {
  file: FileNode | null;
  onContentChange: (path: string, content: string) => void;
  settings?: EditorSettings;
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

export function CodeEditor({ file, onContentChange, settings }: CodeEditorProps) {
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
        onChange={(value) => onContentChange(file.path, value || "")}
        theme="vs-dark"
        options={{
          fontSize: settings?.fontSize ?? 13,
          fontFamily: "'IBM Plex Mono', monospace",
          fontLigatures: true,
          minimap: { enabled: settings?.minimap ?? true, scale: 1, renderCharacters: false },
          padding: { top: 16, bottom: 16 },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          renderLineHighlight: "gutter",
          bracketPairColorization: { enabled: settings?.bracketPairs ?? true },
          lineNumbers: (settings?.lineNumbers ?? true) ? "on" : "off",
          wordWrap: (settings?.wordWrap ?? true) ? "on" : "off",
          tabSize: settings?.tabSize ?? 2,
          lineHeight: 1.7,
          letterSpacing: 0.3,
          guides: {
            indentation: true,
            bracketPairs: true,
          },
        }}
      />
    </div>
  );
}
