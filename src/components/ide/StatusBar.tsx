import { GitBranch, Circle } from "lucide-react";

interface StatusBarProps {
  activeFile: string | null;
  language: string;
  lineCount: number;
}

export function StatusBar({ activeFile, language, lineCount }: StatusBarProps) {
  return (
    <div className="h-6 bg-ide-statusbar flex items-center justify-between px-4 text-[10px] font-mono tracking-wide shrink-0 border-t border-border">
      <div className="flex items-center gap-4 text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <GitBranch className="h-2.5 w-2.5" />
          <span className="text-foreground/60">main</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Circle className="h-1.5 w-1.5 fill-ide-success text-ide-success" />
          <span className="text-ide-success/80">ready</span>
        </span>
      </div>
      <div className="flex items-center gap-4 text-muted-foreground">
        {activeFile && (
          <>
            <span>Ln {lineCount}</span>
            <span className="uppercase text-foreground/50">{language || "txt"}</span>
          </>
        )}
        <span>UTF-8</span>
      </div>
    </div>
  );
}
