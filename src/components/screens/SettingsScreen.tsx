import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
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

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: "editor", label: "Editor", icon: <Code2 className="h-4 w-4" /> },
    { id: "github", label: "GitHub", icon: <Github className="h-4 w-4" /> },
    { id: "about", label: "About", icon: <Info className="h-4 w-4" /> },
  ];

  const updateSetting = <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => {
    onSettingsChange({ ...editorSettings, [key]: value });
  };

  return (
    <div className="h-screen flex flex-col bg-background grain-overlay">
      {/* Header */}
      <div className="h-12 bg-ide-sidebar border-b border-border flex items-center px-4 gap-3 shrink-0">
        <button
          onClick={onBack}
          className="p-1.5 rounded-md hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Settings2 className="h-4 w-4 text-primary" />
        <span className="text-sm font-display font-semibold text-foreground">Settings</span>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Sidebar Tabs — horizontal on mobile, vertical on desktop */}
        <div className="md:w-48 shrink-0 bg-ide-sidebar md:border-r border-b md:border-b-0 border-border py-1 md:py-2 flex md:flex-col overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 md:gap-3 px-4 py-2 md:py-2.5 text-sm transition-all duration-150 whitespace-nowrap ${tab === t.id
                  ? "text-primary bg-primary/5 md:border-r-2 md:border-r-primary border-b-2 md:border-b-0 border-b-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-lg">
            {tab === "editor" && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-lg font-display font-semibold text-foreground mb-1">Editor</h2>
                  <p className="text-xs text-muted-foreground">Customize your coding experience.</p>
                </div>

                {/* Font Size */}
                <SettingRow
                  icon={<Type className="h-4 w-4" />}
                  label="Font Size"
                  description="Code editor font size in pixels"
                >
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateSetting("fontSize", Math.max(10, editorSettings.fontSize - 1))}
                      className="w-7 h-7 rounded border border-border flex items-center justify-center text-sm hover:bg-secondary transition-colors"
                    >
                      −
                    </button>
                    <span className="text-sm font-mono w-8 text-center text-foreground">{editorSettings.fontSize}</span>
                    <button
                      onClick={() => updateSetting("fontSize", Math.min(24, editorSettings.fontSize + 1))}
                      className="w-7 h-7 rounded border border-border flex items-center justify-center text-sm hover:bg-secondary transition-colors"
                    >
                      +
                    </button>
                  </div>
                </SettingRow>

                {/* Tab Size */}
                <SettingRow
                  icon={<Indent className="h-4 w-4" />}
                  label="Tab Size"
                  description="Number of spaces per tab"
                >
                  <div className="flex rounded-lg border border-border overflow-hidden">
                    {[2, 4].map((size) => (
                      <button
                        key={size}
                        onClick={() => updateSetting("tabSize", size)}
                        className={`px-3 py-1.5 text-xs font-mono transition-colors ${editorSettings.tabSize === size
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </SettingRow>

                {/* Toggles */}
                <ToggleSetting
                  icon={<WrapText className="h-4 w-4" />}
                  label="Word Wrap"
                  description="Wrap long lines"
                  value={editorSettings.wordWrap}
                  onChange={(v) => updateSetting("wordWrap", v)}
                />
                <ToggleSetting
                  icon={<Hash className="h-4 w-4" />}
                  label="Line Numbers"
                  description="Show line numbers in gutter"
                  value={editorSettings.lineNumbers}
                  onChange={(v) => updateSetting("lineNumbers", v)}
                />
                <ToggleSetting
                  icon={<Maximize2 className="h-4 w-4" />}
                  label="Minimap"
                  description="Show code minimap"
                  value={editorSettings.minimap}
                  onChange={(v) => updateSetting("minimap", v)}
                />
                <ToggleSetting
                  icon={<Code2 className="h-4 w-4" />}
                  label="Bracket Pairs"
                  description="Colorize matching brackets"
                  value={editorSettings.bracketPairs}
                  onChange={(v) => updateSetting("bracketPairs", v)}
                />
              </div>
            )}

            {tab === "github" && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-lg font-display font-semibold text-foreground mb-1">GitHub</h2>
                  <p className="text-xs text-muted-foreground">Manage your GitHub connection.</p>
                </div>

                <div className="bg-card border border-border rounded-xl p-5">
                  {connected ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-ide-success/10 flex items-center justify-center">
                          <Github className="h-5 w-5 text-ide-success" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Connected</p>
                          <p className="text-xs text-muted-foreground">@{username}</p>
                        </div>
                      </div>
                      <button
                        onClick={disconnect}
                        className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive rounded-lg text-sm font-medium hover:bg-destructive/20 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 text-center">
                      <Github className="h-8 w-8 text-muted-foreground mx-auto" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Not connected</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Connect to browse repos and push changes.
                        </p>
                      </div>
                      <button
                        onClick={connect}
                        className="px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2 mx-auto"
                      >
                        <Github className="h-4 w-4" />
                        Connect GitHub
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === "about" && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-lg font-display font-semibold text-foreground mb-1">About</h2>
                  <p className="text-xs text-muted-foreground">Application information.</p>
                </div>

                <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <img src="/app-icon.png" alt="HugCode" className="w-8 h-8 rounded-lg" />
                    <span className="text-xl font-display font-bold text-foreground">
                      Hug<span className="text-primary">Code</span>
                    </span>
                  </div>

                  <InfoRow label="Version" value="1.0.0" />
                  <InfoRow label="Engine" value="Monaco Editor" />
                  <InfoRow label="Framework" value="React 18 + TypeScript" />
                  <InfoRow label="Styling" value="Tailwind CSS" />
                  <InfoRow label="Theme" value="Cinematic Dark" />
                </div>

                <div className="bg-card border border-border rounded-xl p-5 space-y-3">
                  <p className="text-xs font-medium text-foreground">Features</p>
                  <ul className="space-y-1.5">
                    {[
                      "Multi-file code editor with syntax highlighting",
                      "AI chat assistant for coding help",
                      "GitHub integration — browse, edit, commit & push",
                      "Git panel with branches and commit history",
                      "Live preview for HTML, CSS, JS, Markdown, JSON",
                      "Cinematic dark theme with grain overlay",
                    ].map((f, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5">·</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──

function SettingRow({
  icon,
  label,
  description,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50">
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground">{icon}</span>
        <div>
          <p className="text-sm text-foreground font-medium">{label}</p>
          <p className="text-[11px] text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function ToggleSetting({
  icon,
  label,
  description,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <SettingRow icon={icon} label={label} description={description}>
      <Switch checked={value} onCheckedChange={onChange} aria-label={label} />
    </SettingRow>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs text-foreground font-mono">{value}</span>
    </div>
  );
}
