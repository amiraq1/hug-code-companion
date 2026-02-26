import Editor from "@monaco-editor/react";
import type { FileNode } from "@/stores/editorStore";

interface CodeEditorProps {
  file: FileNode | null;
  onContentChange: (path: string, content: string) => void;
}

function getMonacoLanguage(lang?: string): string {
  switch (lang) {
    case "typescript": return "typescript";
    case "json": return "json";
    case "markdown": return "markdown";
    case "css": return "css";
    case "html": return "html";
    default: return "plaintext";
  }
}

export function CodeEditor({ file, onContentChange }: CodeEditorProps) {
  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center bg-ide-editor">
        <div className="text-center space-y-4">
          <div className="text-5xl font-mono font-bold text-primary/20">{"</>"}</div>
          <p className="text-muted-foreground text-sm">Select a file to start editing</p>
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
          fontSize: 14,
          fontFamily: "'JetBrains Mono', monospace",
          minimap: { enabled: true, scale: 1 },
          padding: { top: 12 },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          renderLineHighlight: "all",
          bracketPairColorization: { enabled: true },
          lineNumbers: "on",
          wordWrap: "on",
          tabSize: 2,
        }}
      />
    </div>
  );
}
