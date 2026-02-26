import { useState } from "react";
import { Github, LogIn, Loader2, ExternalLink } from "lucide-react";
import { useGitHub } from "@/hooks/useGitHub";

interface LoginScreenProps {
  onContinue: () => void;
}

export function LoginScreen({ onContinue }: LoginScreenProps) {
  const { connected, username, loading, connect } = useGitHub();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background grain-overlay">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center bg-background grain-overlay">
      <div className="w-full max-w-sm mx-4">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-primary animate-pulse-glow" />
            <span className="text-2xl font-display font-bold tracking-tight text-foreground">
              code<span className="text-primary">agent</span>
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            AI-Powered Code Editor & GitHub IDE
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-6">
          {!connected ? (
            <>
              <div className="text-center space-y-2">
                <h2 className="text-lg font-display font-semibold text-foreground">Welcome</h2>
                <p className="text-xs text-muted-foreground">
                  Connect your GitHub account to browse repositories, edit code, and push changes.
                </p>
              </div>

              <button
                onClick={connect}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-foreground text-background rounded-lg text-sm font-semibold hover:opacity-90 transition-all duration-200 active:scale-[0.98]"
              >
                <Github className="h-5 w-5" />
                Sign in with GitHub
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
                  <span className="bg-card px-3 text-muted-foreground">or</span>
                </div>
              </div>

              <button
                onClick={onContinue}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-all duration-200"
              >
                Continue without GitHub
              </button>
            </>
          ) : (
            <>
              <div className="text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-ide-success/10 border-2 border-ide-success/30 flex items-center justify-center mx-auto">
                  <Github className="h-7 w-7 text-ide-success" />
                </div>
                <div>
                  <h2 className="text-lg font-display font-semibold text-foreground">Connected</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Signed in as <span className="text-primary font-medium">@{username}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={onContinue}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-all duration-200 active:scale-[0.98]"
              >
                <LogIn className="h-4 w-4" />
                Open Editor
              </button>
            </>
          )}
        </div>

        <p className="text-center text-[10px] text-muted-foreground/50 mt-6">
          Code Agent Studio · v1.0.0
        </p>
      </div>
    </div>
  );
}
