import { GitBranch, Circle } from "lucide-react";

interface StatusBarProps {
  activeFile: string | null;
  language: string;
  lineCount: number;
}

export function StatusBar({ activeFile, language, lineCount }: StatusBarProps) {
  return (
    <div className="h-6 bg-ide-statusbar flex items-center justify-between px-3 text-[11px] text-primary-foreground/80 shrink-0">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <GitBranch className="h-3 w-3" />
          main
        </span>
        <span className="flex items-center gap-1">
          <Circle className="h-2 w-2 fill-ide-success text-ide-success" />
          Ready
        </span>
      </div>
      <div className="flex items-center gap-3">
        {activeFile && (
          <>
            <span>Ln {lineCount}</span>
            <span className="capitalize">{language || "Plain Text"}</span>
          </>
        )}
        <span>UTF-8</span>
        <span>Spaces: 2</span>
      </div>
    </div>
  );
}
