import { useState } from "react";
import { Github, LogIn, Loader2, AlertTriangle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useAuthStore, type AuthErrorType } from "@/stores/authStore";

interface LoginScreenProps {
  onContinue: () => void;
}

function getErrorIcon(type: AuthErrorType) {
  switch (type) {
    case "network": return <WifiOff className="h-5 w-5" />;
    case "csrf": return <AlertTriangle className="h-5 w-5" />;
    default: return <AlertTriangle className="h-5 w-5" />;
  }
}

export function LoginScreen({ onContinue }: LoginScreenProps) {
  const { status, username, isAuthenticated, isLoading, error, connect, clearError, retry } = useAuthStore();

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background grain-overlay gap-3">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
        <p className="text-xs text-muted-foreground">جارٍ التحقق من المصادقة...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center bg-background grain-overlay">
      <div className="w-full max-w-sm mx-4">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src="/app-icon.png" alt="Hug Code" className="w-10 h-10 rounded-lg" />
            <span className="text-2xl font-display font-bold tracking-tight text-foreground">
              Hug<span className="text-primary">Code</span>
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            AI-Powered Code Editor & GitHub IDE
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
            <div className="text-destructive mt-0.5">{getErrorIcon(error.type)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-destructive font-medium">{error.message}</p>
              <button
                onClick={() => { clearError(); retry(); }}
                className="mt-2 flex items-center gap-1.5 text-xs text-destructive/80 hover:text-destructive transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                إعادة المحاولة
              </button>
            </div>
          </div>
        )}

        <div className="bg-card border border-border rounded-xl p-6 space-y-6">
          {!isAuthenticated ? (
            <>
              <div className="text-center space-y-2">
                <h2 className="text-lg font-display font-semibold text-foreground">مرحباً</h2>
                <p className="text-xs text-muted-foreground">
                  اربط حسابك على GitHub لتصفح المستودعات وتعديل الأكواد ودفع التغييرات.
                </p>
              </div>

              <button
                onClick={connect}
                disabled={!navigator.onLine}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-foreground text-background rounded-lg text-sm font-semibold hover:opacity-90 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Github className="h-5 w-5" />
                تسجيل الدخول عبر GitHub
              </button>

              {!navigator.onLine && (
                <p className="text-xs text-center text-destructive flex items-center justify-center gap-1">
                  <WifiOff className="h-3 w-3" />
                  لا يوجد اتصال بالإنترنت
                </p>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
                  <span className="bg-card px-3 text-muted-foreground">أو</span>
                </div>
              </div>

              <button
                onClick={onContinue}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-all duration-200"
              >
                المتابعة بدون GitHub
              </button>
            </>
          ) : (
            <>
              <div className="text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-ide-success/10 border-2 border-ide-success/30 flex items-center justify-center mx-auto">
                  <Github className="h-7 w-7 text-ide-success" />
                </div>
                <div>
                  <h2 className="text-lg font-display font-semibold text-foreground">متصل</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    تم تسجيل الدخول كـ <span className="text-primary font-medium">@{username}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={onContinue}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-all duration-200 active:scale-[0.98]"
              >
                <LogIn className="h-4 w-4" />
                فتح المحرر
              </button>
            </>
          )}
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-1.5 mt-6">
          <div className="w-1.5 h-1.5 rounded-full bg-ide-success" />
          <p className="text-[10px] text-muted-foreground/50">
            OAuth 2.0 · اتصال مشفر · CSRF محمي
          </p>
        </div>
      </div>
    </div>
  );
}
