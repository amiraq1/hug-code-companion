import { motion, useScroll, useTransform } from "framer-motion";
import { Sparkles, Code2, ArrowLeft, ArrowUpRight, Github, Eye, GitBranch } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface LandingScreenProps {
  onEnter: () => void;
}

export const LandingScreen = ({ onEnter }: LandingScreenProps) => {
  const { scrollYProgress } = useScroll();
  const yElement1 = useTransform(scrollYProgress, [0, 1], [0, -50]);
  const yElement2 = useTransform(scrollYProgress, [0, 1], [0, 50]);

  const mobileHighlights = [
    { label: "GitHub", value: "Sync", icon: Github },
    { label: "Preview", value: "Live", icon: Eye },
    { label: "Agent", value: "Ready", icon: Sparkles },
  ];

  const mobileBenefits = [
    {
      icon: Code2,
      title: "Focused workspace",
      description: "The current file, tab, and task stay visible without wasting vertical space.",
    },
    {
      icon: GitBranch,
      title: "Source control first",
      description: "Branches, commits, and repository access stay one motion away on small screens.",
    },
  ];

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-[#050505] text-white selection:bg-primary/30 selection:text-primary">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,208,74,0.16),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.06),_transparent_28%),linear-gradient(180deg,#050505_0%,#08080a_42%,#050505_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent)]" />

      <div className="relative z-10 flex min-h-[100dvh] flex-col px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] pt-[calc(env(safe-area-inset-top,0px)+0.875rem)]">
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_20px_36px_-28px_rgba(255,209,91,0.95)]">
              <div className="absolute inset-1 rounded-[14px] bg-primary/12 blur-md" />
              <span className="relative z-10 font-display text-sm font-bold tracking-tight text-white">HC</span>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.28em] text-white/50">Mobile Studio</p>
              <p className="truncate font-display text-lg font-semibold tracking-tight text-white">
                Hug<span className="text-primary">Code</span>
              </p>
            </div>
          </div>

          <Button
            onClick={onEnter}
            variant="ghost"
            className="h-11 rounded-full border border-white/10 bg-white/[0.03] px-4 text-white hover:bg-white/[0.08] hover:text-white"
          >
            Enter Studio
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </header>

        <main className="flex flex-1 flex-col gap-4 pt-5">
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mobile-hero-surface mobile-grid-overlay rounded-[30px] p-5"
            style={{ y: yElement1 }}
          >
            <div className="relative space-y-5">
              <div className="flex items-center justify-between gap-2">
                <Badge
                  variant="outline"
                  className="border-primary/20 bg-primary/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-primary"
                >
                  AI-Native IDE
                </Badge>
                <span className="text-[10px] uppercase tracking-[0.22em] text-white/45">GitHub • Preview • Agent</span>
              </div>

              <div className="space-y-3">
                <h1 className="font-display text-[2.55rem] leading-[0.92] tracking-[-0.08em] text-white">
                  Build with
                  <span className="block text-primary">clarity.</span>
                </h1>
                <p className="max-w-sm text-sm leading-6 text-white/68">
                  A phone-first coding surface that keeps files, preview, Git, and the AI assistant in one calm flow.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {mobileHighlights.map(({ label, value, icon: Icon }) => (
                  <Card key={label} className="mobile-quiet-surface rounded-[22px] border-white/8 bg-transparent">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        <span className="text-[10px] uppercase tracking-[0.22em] text-white/35">{label}</span>
                      </div>
                      <p className="mt-4 text-sm font-semibold tracking-tight text-white">{value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid gap-2">
                <Button
                  onClick={onEnter}
                  className="h-12 rounded-[18px] text-sm font-semibold shadow-[0_22px_44px_-28px_rgba(255,209,91,0.95)]"
                >
                  Launch IDE
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button
                  onClick={onEnter}
                  variant="outline"
                  className="h-11 rounded-[18px] border-white/12 bg-white/[0.03] text-white hover:bg-white/[0.08] hover:text-white"
                >
                  Sign In with GitHub
                  <Github className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.section>

          <section className="grid grid-cols-2 gap-3">
            {mobileBenefits.map(({ icon: Icon, title, description }) => (
              <Card key={title} className="mobile-quiet-surface rounded-[26px] border-white/8 bg-transparent">
                <CardContent className="flex h-full flex-col p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h2 className="mt-4 text-sm font-semibold tracking-tight text-white">{title}</h2>
                  <p className="mt-2 text-[12px] leading-5 text-white/58">{description}</p>
                </CardContent>
              </Card>
            ))}
          </section>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            style={{ y: yElement2 }}
          >
            <Card className="mobile-quiet-surface mobile-grid-overlay overflow-hidden rounded-[30px] border-white/8 bg-transparent">
              <CardContent className="p-0">
                <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                    <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
                  </div>
                  <div className="ml-auto rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-white/45">
                    Mobile workspace
                  </div>
                </div>

                <div className="grid grid-cols-[92px_minmax(0,1fr)]">
                  <div className="border-r border-white/8 px-3 py-4">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/32">Files</p>
                    <div className="mt-3 space-y-2 text-[11px] text-white/55">
                      <div className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-1">src</div>
                      <div className="rounded-full border border-primary/18 bg-primary/10 px-2 py-1 text-primary">App.tsx</div>
                      <div className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-1">preview</div>
                    </div>
                  </div>

                  <div className="px-4 py-4">
                    <div className="space-y-2 font-mono text-[11px] leading-5">
                      <div>
                        <span className="text-primary/90">const</span>{" "}
                        <span className="text-white">workspace</span>{" "}
                        <span className="text-white/45">=</span>{" "}
                        <span className="text-yellow-400">{"{"}</span>
                      </div>
                      <div className="pl-4 text-white/70">
                        view: <span className="text-primary">"focused"</span>,
                      </div>
                      <div className="pl-4 text-white/70">
                        repo: <span className="text-primary">"connected"</span>,
                      </div>
                      <div className="pl-4 text-white/70">
                        agent: <span className="text-primary">"inline"</span>,
                      </div>
                      <div>
                        <span className="text-yellow-400">{"}"}</span>
                      </div>
                    </div>

                    <div className="mt-4 rounded-[22px] border border-white/10 bg-white/[0.03] p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                          <Sparkles className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold tracking-tight text-white">AI suggestion</p>
                          <p className="mt-1 text-[11px] leading-5 text-white/58">
                            Keep the active file, preview, and Git status visible with less vertical noise.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>
    </div>
  );
};
