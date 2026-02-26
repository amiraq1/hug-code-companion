import { GitBranch, Circle, WifiOff } from "lucide-react";

interface StatusBarProps {
  activeFile: string | null;
  language: string;
  lineCount: number;
  online?: boolean;
}

export function StatusBar({ activeFile, language, lineCount, online = true }: StatusBarProps) {
  return (
    <div className="h-6 bg-ide-statusbar flex items-center justify-between px-4 text-[10px] font-mono tracking-wide shrink-0 border-t border-border">
      <div className="flex items-center gap-4 text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <GitBranch className="h-2.5 w-2.5" />
          <span className="text-foreground/60">main</span>
        </span>
        <span className="flex items-center gap-1.5">
          {online ? (
            <>
              <Circle className="h-1.5 w-1.5 fill-ide-success text-ide-success" />
              <span className="text-ide-success/80">ready</span>
            </>
          ) : (
            <>
              <WifiOff className="h-2.5 w-2.5 text-destructive" />
              <span className="text-destructive/80">offline</span>
            </>
          )}
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
