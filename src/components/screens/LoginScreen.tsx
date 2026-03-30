import { motion } from "framer-motion";
import { Github, LogIn, Loader2, AlertTriangle, RefreshCw, Wifi, WifiOff } from "lucide-react";

import { useAuthStore, type AuthErrorType } from "@/stores/authStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface LoginScreenProps {
  onContinue: () => void;
}

function getErrorIcon(type: AuthErrorType) {
  switch (type) {
    case "network":
      return <WifiOff className="h-5 w-5" />;
    case "csrf":
      return <AlertTriangle className="h-5 w-5" />;
    default:
      return <AlertTriangle className="h-5 w-5" />;
  }
}

export function LoginScreen({ onContinue }: LoginScreenProps) {
  const { username, isAuthenticated, isLoading, error, connect, clearError, retry } = useAuthStore();
  const isOnline = typeof navigator === "undefined" ? true : navigator.onLine;

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-background grain-overlay px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] pt-[calc(env(safe-area-inset-top,0px)+1rem)]" dir="rtl">
        <div className="mx-auto flex min-h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-2.5rem)] max-w-sm flex-col justify-center">
          <div className="mobile-hero-surface rounded-[30px] p-6 text-center">
            <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-[22px] border border-primary/18 bg-primary/10 text-primary">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <p className="mt-5 text-xs uppercase tracking-[0.24em] text-muted-foreground">الجلسة</p>
            <p className="mt-2 text-sm text-muted-foreground">جارِ التحقق من المصادقة...</p>
          </div>
        </div>
      </div>
    );
  }

  const mobileSteps = [
    { label: "1", title: "اتصال", detail: "صرح لـ GitHub في متصفح النظام." },
    { label: "2", title: "عودة", detail: "الرابط العميق يعيدك إلى التطبيق." },
    { label: "3", title: "برمجة", detail: "افتح المستودعات، عاين التغييرات، وارفعها." },
  ];

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background grain-overlay" dir="rtl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,208,74,0.12),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.05),_transparent_28%)]" />

      <div className="relative z-10 flex min-h-[100dvh] flex-col px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] pt-[calc(env(safe-area-inset-top,0px)+0.875rem)]">
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
              <div className="absolute inset-1 rounded-[14px] bg-primary/12 blur-md" />
              <img src="/app-icon.png" alt="" className="relative z-10 h-6 w-6 rounded-md" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-lg font-semibold tracking-tight text-foreground">
                Hug<span className="text-primary">Code</span>
              </p>
              <p className="truncate text-[11px] text-muted-foreground">محرر كود ذكي وبيئة تطوير GitHub</p>
            </div>
          </div>

          <Badge
            variant="outline"
            className="h-8 rounded-full border-white/10 bg-white/[0.03] px-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground"
          >
            {isAuthenticated ? "متصل" : "آمن"}
          </Badge>
        </header>

        <main className="flex flex-1 flex-col gap-4 pt-5">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="mobile-hero-surface mobile-grid-overlay rounded-[30px] p-5"
          >
            <div className="relative space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] border border-primary/18 bg-primary/10 text-primary shadow-[0_20px_36px_-28px_rgba(255,209,91,0.95)]">
                  {isAuthenticated ? <Github className="h-7 w-7" /> : <LogIn className="h-7 w-7" />}
                </div>
                <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-3 py-2 text-right">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">حالة الجلسة</p>
                  <p className="mt-1 text-sm font-semibold tracking-tight text-foreground">
                    {isAuthenticated ? "متصل" : "مرحبًا بك"}
                  </p>
                </div>
              </div>

              {error && (
                <div className="rounded-[22px] border border-destructive/25 bg-destructive/8 p-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-destructive">{getErrorIcon(error.type)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-destructive">{error.message}</p>
                      <button
                        onClick={() => {
                          clearError();
                          retry();
                        }}
                        className="mt-2 flex items-center gap-1.5 text-xs text-destructive/80 transition-colors hover:text-destructive"
                      >
                        <RefreshCw className="h-3 w-3" />
                        إعادة المحاولة
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!isAuthenticated ? (
                <>
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">وصول GitHub</p>
                    <h1 className="font-display text-[2rem] font-semibold tracking-tight text-foreground">مرحبًا</h1>
                    <p className="text-sm leading-6 text-muted-foreground">
                      اربط حسابك على GitHub لتصفح المستودعات وتعديل الأكواد ودفع التغييرات.
                    </p>
                  </div>

                  <Card className="mobile-quiet-surface rounded-[22px] border-white/8 bg-transparent">
                    <CardContent className="flex items-center gap-3 p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-primary">
                        {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium tracking-tight text-foreground">
                          {isOnline ? "جاهز للمصادقة" : "لا يوجد اتصال بالإنترنت"}
                        </p>
                        <p className="mt-1 text-[12px] leading-5 text-muted-foreground text-right">
                          {isOnline
                            ? "سيفتح GitHub في المتصفح الخارجي، ثم يعود بك إلى التطبيق."
                            : "يرجى الاتصال بالإنترنت أولاً، ثم أعد المحاولة."}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid gap-2.5">
                    <Button
                      onClick={connect}
                      disabled={!isOnline}
                      className="h-12 rounded-[18px] text-sm font-semibold shadow-[0_22px_44px_-28px_rgba(255,209,91,0.95)]"
                    >
                      <Github className="h-5 w-5 ml-2" />
                      تسجيل الدخول عبر GitHub
                    </Button>

                    <Button
                      onClick={onContinue}
                      variant="outline"
                      className="h-11 rounded-[18px] border-white/12 bg-white/[0.03] text-foreground hover:bg-white/[0.08] hover:text-foreground"
                    >
                      المتابعة كضيف
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">تم الاتصال بـ GitHub</p>
                    <h1 className="font-display text-[2rem] font-semibold tracking-tight text-foreground">أنت متصل</h1>
                    <p className="text-sm leading-6 text-muted-foreground">
                      تم تسجيل الدخول كـ <span className="font-medium text-primary">@{username}</span>
                    </p>
                  </div>

                  <Card className="mobile-quiet-surface rounded-[22px] border-white/8 bg-transparent">
                    <CardContent className="flex items-center gap-3 p-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                        <Github className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium tracking-tight text-foreground">@{username}</p>
                        <p className="mt-1 text-[12px] leading-5 text-muted-foreground text-right">
                          جلسة المصادقة نشطة والوصول للمستودعات جاهز على هذا الجهاز.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Button
                    onClick={onContinue}
                    className="h-12 rounded-[18px] text-sm font-semibold shadow-[0_22px_44px_-28px_rgba(255,209,91,0.95)]"
                  >
                    <LogIn className="h-4 w-4 ml-2" />
                    فتح المحرر
                  </Button>
                </>
              )}
            </div>
          </motion.section>

          <Card className="mobile-quiet-surface mobile-grid-overlay rounded-[28px] border-white/8 bg-transparent">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">خطوات الاتصال</p>
                <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">3 خطوات</p>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {mobileSteps.map((step) => (
                  <div key={step.label} className="rounded-[20px] border border-white/8 bg-white/[0.03] p-3 text-right">
                    <span className="text-[10px] uppercase tracking-[0.24em] text-primary">{step.label}</span>
                    <p className="mt-3 text-sm font-medium tracking-tight text-foreground">{step.title}</p>
                    <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{step.detail}</p>
                  </div>
                ))}
              </div>

              <Separator className="my-4 bg-white/8" />

              <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground/70">
                <span className="h-1.5 w-1.5 rounded-full bg-ide-success" />
                <span>OAuth 2.0</span>
                <span>·</span>
                <span>اتصال مشفر</span>
                <span>·</span>
                <span>CSRF محمي</span>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
