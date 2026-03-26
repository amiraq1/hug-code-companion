import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Settings2,
  Code2,
  Github,
  Info,
  Type,
  Maximize2,
  WrapText,
  Hash,
  Indent,
  LogOut,
} from "lucide-react";

import { useGitHub } from "@/hooks/useGitHub";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { EditorSettings } from "./settings.types";

interface SettingsScreenProps {
  onBack: () => void;
  editorSettings: EditorSettings;
  onSettingsChange: (settings: EditorSettings) => void;
}

type SettingsTab = "editor" | "github" | "about";

export function SettingsScreen({ onBack, editorSettings, onSettingsChange }: SettingsScreenProps) {
  const [tab, setTab] = useState<SettingsTab>("editor");
  const { connected, username, disconnect, connect } = useGitHub();

  const tabs: { id: SettingsTab; label: string; icon: ReactNode }[] = [
    { id: "editor", label: "Editor", icon: <Code2 className="h-4 w-4" /> },
    { id: "github", label: "GitHub", icon: <Github className="h-4 w-4" /> },
    { id: "about", label: "About", icon: <Info className="h-4 w-4" /> },
  ];

  const updateSetting = <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => {
    onSettingsChange({ ...editorSettings, [key]: value });
  };

  const enabledEditorToggles =
    Number(editorSettings.wordWrap) +
    Number(editorSettings.lineNumbers) +
    Number(editorSettings.minimap) +
    Number(editorSettings.bracketPairs);

  const tabDescription =
    tab === "editor"
      ? "Tune the editor for focus, readability, and quick code work."
      : tab === "github"
        ? "Manage repository access and account connection from this device."
        : "Application details, stack, and built-in capabilities.";

  return (
    <div className="min-h-[100dvh] overflow-hidden bg-background grain-overlay">
      <div className="mobile-safe-shell mobile-safe-top flex min-h-[100dvh] flex-col pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
        <header className="flex items-center justify-between gap-3 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={onBack}
              aria-label="Back"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] border border-white/8 bg-white/[0.03] text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Preferences</p>
              <p className="truncate font-display text-lg font-semibold tracking-tight text-foreground">Settings</p>
            </div>
          </div>

          <Badge
            variant="outline"
            className="h-8 rounded-full border-white/10 bg-white/[0.03] px-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground"
          >
            {tab}
          </Badge>
        </header>

        <main className="flex-1 overflow-y-auto pt-3">
          <div className="space-y-3">
            <Card className="mobile-hero-surface mobile-grid-overlay rounded-[28px] border-white/8 bg-transparent">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] border border-primary/18 bg-primary/10 text-primary shadow-[0_20px_36px_-28px_rgba(255,209,91,0.95)]">
                    <Settings2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Workspace control</p>
                        <h1 className="mt-1 font-display text-[1.6rem] font-semibold tracking-tight text-foreground">
                          Settings
                        </h1>
                      </div>
                      <Badge
                        variant="outline"
                        className="border-primary/18 bg-primary/10 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-primary"
                      >
                        {tab}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{tabDescription}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {tabs.map((currentTab) => {
                    const isActive = tab === currentTab.id;
                    return (
                      <button
                        key={currentTab.id}
                        onClick={() => setTab(currentTab.id)}
                        className={cn(
                          "rounded-[18px] border px-3 py-3 text-left transition-all",
                          isActive
                            ? "border-primary/20 bg-primary/10 text-primary"
                            : "border-white/8 bg-white/[0.03] text-muted-foreground",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {currentTab.icon}
                          <span className="truncate text-xs font-medium">{currentTab.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {tab === "editor" && (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <MobileMetricCard label="Font Size" value={`${editorSettings.fontSize}px`} />
                    <MobileMetricCard label="Tab Size" value={`${editorSettings.tabSize}`} />
                    <MobileMetricCard label="Enabled" value={`${enabledEditorToggles}/4`} />
                  </div>
                )}
              </CardContent>
            </Card>

            {tab === "editor" && (
              <div className="space-y-3">
                <MobileSettingCard icon={<Type className="h-4 w-4" />} label="Font Size" description="Code editor font size in pixels">
                  <div className="flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] p-1">
                    <button
                      onClick={() => updateSetting("fontSize", Math.max(10, editorSettings.fontSize - 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-sm text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground"
                    >
                      -
                    </button>
                    <span className="w-10 text-center font-mono text-sm text-foreground">{editorSettings.fontSize}</span>
                    <button
                      onClick={() => updateSetting("fontSize", Math.min(24, editorSettings.fontSize + 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-sm text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground"
                    >
                      +
                    </button>
                  </div>
                </MobileSettingCard>

                <MobileSettingCard icon={<Indent className="h-4 w-4" />} label="Tab Size" description="Number of spaces per tab">
                  <div className="flex rounded-full border border-white/8 bg-white/[0.03] p-1">
                    {[2, 4].map((size) => (
                      <button
                        key={size}
                        onClick={() => updateSetting("tabSize", size)}
                        className={cn(
                          "min-w-[42px] rounded-full px-3 py-1.5 text-xs font-mono transition-colors",
                          editorSettings.tabSize === size ? "bg-primary/12 text-primary" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </MobileSettingCard>

                <MobileToggleCard
                  icon={<WrapText className="h-4 w-4" />}
                  label="Word Wrap"
                  description="Wrap long lines"
                  value={editorSettings.wordWrap}
                  onChange={(value) => updateSetting("wordWrap", value)}
                />
                <MobileToggleCard
                  icon={<Hash className="h-4 w-4" />}
                  label="Line Numbers"
                  description="Show line numbers in gutter"
                  value={editorSettings.lineNumbers}
                  onChange={(value) => updateSetting("lineNumbers", value)}
                />
                <MobileToggleCard
                  icon={<Maximize2 className="h-4 w-4" />}
                  label="Minimap"
                  description="Show code minimap"
                  value={editorSettings.minimap}
                  onChange={(value) => updateSetting("minimap", value)}
                />
                <MobileToggleCard
                  icon={<Code2 className="h-4 w-4" />}
                  label="Bracket Pairs"
                  description="Colorize matching brackets"
                  value={editorSettings.bracketPairs}
                  onChange={(value) => updateSetting("bracketPairs", value)}
                />
              </div>
            )}

            {tab === "github" && (
              <div className="space-y-3">
                <Card className="mobile-quiet-surface rounded-[24px] border-white/8 bg-transparent">
                  <CardContent className="p-4">
                    {connected ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-emerald-500/18 bg-emerald-500/10 text-emerald-400">
                            <Github className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-medium tracking-tight text-foreground">Connected</p>
                            <p className="mt-1 text-xs text-muted-foreground">@{username}</p>
                          </div>
                        </div>

                        <Separator className="bg-white/8" />

                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            Repository access is active on this device. You can browse, edit, and push changes.
                          </p>
                          <Button
                            onClick={disconnect}
                            variant="outline"
                            className="h-11 w-full rounded-[18px] border-destructive/20 bg-destructive/8 text-destructive hover:bg-destructive/14 hover:text-destructive"
                          >
                            <LogOut className="h-4 w-4" />
                            Disconnect
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[22px] border border-white/8 bg-white/[0.03] text-muted-foreground">
                          <Github className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-sm font-medium tracking-tight text-foreground">Not connected</p>
                          <p className="mt-2 text-xs leading-5 text-muted-foreground">
                            Connect GitHub to browse repositories and push commits from the phone.
                          </p>
                        </div>
                        <Button onClick={connect} className="h-11 w-full rounded-[18px]">
                          <Github className="h-4 w-4" />
                          Connect GitHub
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {tab === "about" && (
              <div className="space-y-3">
                <Card className="mobile-quiet-surface rounded-[24px] border-white/8 bg-transparent">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <img src="/app-icon.png" alt="HugCode" className="h-10 w-10 rounded-xl" />
                      <div>
                        <p className="font-display text-lg font-semibold tracking-tight text-foreground">
                          Hug<span className="text-primary">Code</span>
                        </p>
                        <p className="text-xs text-muted-foreground">Mobile-first AI coding workspace</p>
                      </div>
                    </div>

                    <Separator className="my-4 bg-white/8" />

                    <div className="space-y-3">
                      <InfoRow label="Version" value="1.0.0" />
                      <InfoRow label="Engine" value="Monaco Editor" />
                      <InfoRow label="Framework" value="React 18 + TypeScript" />
                      <InfoRow label="Styling" value="Tailwind CSS" />
                      <InfoRow label="Theme" value="Cinematic Dark" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="mobile-quiet-surface rounded-[24px] border-white/8 bg-transparent">
                  <CardContent className="p-4">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Features</p>
                    <ul className="mt-4 space-y-3">
                      {[
                        "Multi-file code editor with syntax highlighting",
                        "AI chat assistant for coding help",
                        "GitHub integration - browse, edit, commit, and push",
                        "Git panel with branches and commit history",
                        "Live preview for HTML, CSS, JS, Markdown, and JSON",
                        "Cinematic dark theme with grain overlay",
                      ].map((feature) => (
                        <li key={feature} className="flex items-start gap-3 text-sm text-muted-foreground">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function MobileMetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="mobile-quiet-surface rounded-[18px] border-white/8 bg-transparent px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-sm font-semibold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

function MobileSettingCard({
  icon,
  label,
  description,
  children,
}: {
  icon: ReactNode;
  label: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="mobile-quiet-surface rounded-[24px] border-white/8 bg-transparent">
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] text-primary">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium tracking-tight text-foreground">{label}</p>
            <p className="mt-1 text-[12px] leading-5 text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="shrink-0">{children}</div>
      </CardContent>
    </Card>
  );
}

function MobileToggleCard({
  icon,
  label,
  description,
  value,
  onChange,
}: {
  icon: ReactNode;
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <MobileSettingCard icon={icon} label={label} description={description}>
      <Switch checked={value} onCheckedChange={onChange} aria-label={label} />
    </MobileSettingCard>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-mono text-foreground">{value}</span>
    </div>
  );
}
