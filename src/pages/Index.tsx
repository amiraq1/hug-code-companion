import { useState, useCallback, useMemo, lazy, Suspense, useEffect, useTransition } from "react";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Eye,
  GitBranch,
  Loader2,
  Code2,
  FolderTree,
  Sparkles,
  FolderGit2,
  Settings,
} from "lucide-react";

import { FileExplorer } from "@/components/ide/FileExplorer";
import { TabBar } from "@/components/ide/TabBar";
import { CommitDialog } from "@/components/ide/CommitDialog";
import { LoginScreen } from "@/components/screens/LoginScreen";
import { SettingsScreen } from "@/components/screens/SettingsScreen";
import { DEFAULT_EDITOR_SETTINGS, type EditorSettings } from "@/components/screens/settings.types";
import { useGitHub, type GitHubRepo } from "@/hooks/useGitHub";
import { useMobileViewport } from "@/hooks/use-mobile";
import { useSwipe, type SwipeDirection } from "@/hooks/useSwipe";
import { AsyncStorage } from "@/lib/asyncStorage";
import { detectFileLanguage } from "@/lib/fileMeta";
import { getSessionId } from "@/lib/session";
import { cn } from "@/lib/utils";
import { MobileStack } from "@/components/native/MobileStack";
import { DEFAULT_FILES, flattenFiles } from "@/stores/editorStore";
import type { FileNode, ChatMessage } from "@/stores/editorStore";

const CodeEditor = lazy(() => import("@/components/ide/CodeEditor").then((m) => ({ default: m.CodeEditor })));
const AIChatPanel = lazy(() => import("@/components/ide/AIChatPanel").then((m) => ({ default: m.AIChatPanel })));
const GitPanel = lazy(() => import("@/components/ide/GitPanel").then((m) => ({ default: m.GitPanel })));
const PreviewPanel = lazy(() => import("@/components/ide/PreviewPanel").then((m) => ({ default: m.PreviewPanel })));
const ReposScreen = lazy(() => import("@/components/screens/ReposScreen").then((m) => ({ default: m.ReposScreen })));
const AIProjectPlanner = lazy(() => import("@/components/screens/AIProjectPlanner").then((m) => ({ default: m.AIProjectPlanner })));
const LandingScreen = lazy(() => import("@/components/screens/LandingScreen").then((m) => ({ default: m.LandingScreen })));

const LazyFallback = () => (
  <div className="flex flex-1 items-center justify-center bg-ide-editor">
    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
  </div>
);

type AppScreen = "landing" | "login" | "repos" | "editor" | "settings" | "ai-planner";
type MobileTab = "files" | "editor" | "preview" | "chat" | "git";

const MOBILE_TABS: MobileTab[] = ["files", "editor", "preview", "chat", "git"];
const MOBILE_NAV_ITEMS: Array<{ id: MobileTab; icon: typeof FolderTree; label: string }> = [
  { id: "files", icon: FolderTree, label: "Files" },
  { id: "editor", icon: Code2, label: "Code" },
  { id: "preview", icon: Eye, label: "Preview" },
  { id: "chat", icon: MessageSquare, label: "Agent" },
  { id: "git", icon: GitBranch, label: "Git" },
];

const Index = () => {
  const { isCompactMobile, isLandscapeMobile, isShortMobileHeight, prefersReducedMotion } = useMobileViewport();
  const appSessionId = useMemo(() => getSessionId(), []);

  const [isLoaded, setIsLoaded] = useState(false);
  const [isPending, startFileTransition] = useTransition();
  const [screen, setScreen] = useState<AppScreen>("landing");
  const [files, setFiles] = useState<FileNode[]>(DEFAULT_FILES);
  const [activeFilePath, setActiveFilePath] = useState<string | null>("src/App.tsx");
  const [openFilePaths, setOpenFilePaths] = useState<string[]>(["src/App.tsx"]);
  const [commitDialogPath, setCommitDialogPath] = useState<string | null>(null);
  const [editorSettings, setEditorSettings] = useState<EditorSettings>(DEFAULT_EDITOR_SETTINGS);
  const [selectedGitHubRepo, setSelectedGitHubRepo] = useState<GitHubRepo | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("editor");
  const [slideDirection, setSlideDirection] = useState<SwipeDirection>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "مرحبًا بك في HugCode. أستطيع مساعدتك في كتابة الكود، إصلاح الأخطاء، وشرح الحلول داخل مساحة العمل الحالية.",
      timestamp: new Date(),
    },
  ]);
  const [editorErrors, setEditorErrors] = useState<{ path: string; errors: string[] }>({ path: "", errors: [] });
  const [notifiedErrors, setNotifiedErrors] = useState<Set<string>>(new Set());

  const { commitFile } = useGitHub();

  useEffect(() => {
    const loadState = async () => {
      try {
        const savedFiles = await AsyncStorage.getItem<FileNode[]>("files_state");
        if (savedFiles) setFiles(savedFiles);

        const savedActive = await AsyncStorage.getItem<string>("active_file");
        if (savedActive) setActiveFilePath(savedActive);

        const savedTabs = await AsyncStorage.getItem<string[]>("open_tabs");
        if (savedTabs) setOpenFilePaths(savedTabs);
      } catch (err) {
        console.warn("Offline state loading failed:", err);
      } finally {
        setIsLoaded(true);
      }
    };

    loadState();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    AsyncStorage.setItem("files_state", files).catch(() => {});
    AsyncStorage.setItem("active_file", activeFilePath).catch(() => {});
    AsyncStorage.setItem("open_tabs", openFilePaths).catch(() => {});
  }, [files, activeFilePath, openFilePaths, isLoaded]);

  const handleValidateErrors = useCallback((path: string, errors: string[]) => {
    setEditorErrors({ path, errors });
  }, []);

  useEffect(() => {
    if (editorErrors.errors.length === 0 || !editorErrors.path) return;

    const timer = setTimeout(() => {
      const errorFingerprint = `${editorErrors.path}:${editorErrors.errors[0]}`;
      if (notifiedErrors.has(errorFingerprint)) return;

      setNotifiedErrors((prev) => new Set(prev).add(errorFingerprint));
      setMessages((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage?.role === "assistant" && lastMessage.content.includes("Proactive Watcher")) {
          return prev;
        }

        return [
          ...prev,
          {
            id: `${Date.now()}-err`,
            role: "assistant",
            content: `Proactive Watcher: detected an issue in \`${editorErrors.path}\`.\n\n\`\`\`text\n${editorErrors.errors[0]}\n\`\`\``,
            timestamp: new Date(),
          },
        ];
      });
    }, 4000);

    return () => clearTimeout(timer);
  }, [editorErrors, notifiedErrors]);

  useEffect(() => {
    // @ts-expect-error Vite injects `import.meta.hot` in HMR mode only.
    const hot = import.meta.hot;
    if (!hot) return;

    hot.on("vite:error", (payload: any) => {
      const errorMessage = payload.err?.message || "Unknown system error";
      let errorPath = payload.err?.id || payload.err?.loc?.file || "Terminal";

      if (errorPath.includes("hug-code-companion")) {
        errorPath = errorPath.split("hug-code-companion").pop();
      }

      const snippet = payload.err?.frame || "";
      const fullError = snippet ? `${errorMessage}\n\nCode snippet:\n${snippet}` : errorMessage;

      setEditorErrors({
        path: `Terminal: ${errorPath}`,
        errors: [fullError],
      });
    });
  }, []);

  const navigateTab = useCallback((direction: "left" | "right") => {
    setMobileTab((prev) => {
      const currentIndex = MOBILE_TABS.indexOf(prev);

      if (direction === "left" && currentIndex < MOBILE_TABS.length - 1) {
        setSlideDirection("left");
        return MOBILE_TABS[currentIndex + 1];
      }

      if (direction === "right" && currentIndex > 0) {
        setSlideDirection("right");
        return MOBILE_TABS[currentIndex - 1];
      }

      return prev;
    });
  }, []);

  const switchToTab = useCallback((tab: MobileTab) => {
    setMobileTab((prev) => {
      const fromIndex = MOBILE_TABS.indexOf(prev);
      const toIndex = MOBILE_TABS.indexOf(tab);
      setSlideDirection(toIndex > fromIndex ? "left" : toIndex < fromIndex ? "right" : null);
      return tab;
    });
  }, []);

  const { onTouchStart, onTouchMove, onTouchEnd, x } = useSwipe({
    onSwipeLeft: () => navigateTab("left"),
    onSwipeRight: () => navigateTab("right"),
    threshold: 60,
  });

  const allFiles = flattenFiles(files);
  const activeFile = allFiles.find((file) => file.path === activeFilePath) || null;
  const openFiles = openFilePaths
    .map((path) => allFiles.find((file) => file.path === path))
    .filter(Boolean) as FileNode[];

  const handleFileSelect = useCallback(
    (path: string) => {
      setOpenFilePaths((prev) => (prev.includes(path) ? prev : [...prev, path]));
      setMobileTab("editor");

      startFileTransition(() => {
        setActiveFilePath(path);
      });
    },
    [startFileTransition],
  );

  const handleTabClose = useCallback((path: string) => {
    setOpenFilePaths((prev) => {
      const remaining = prev.filter((currentPath) => currentPath !== path);
      setActiveFilePath((current) =>
        current === path ? (remaining.length > 0 ? remaining[remaining.length - 1] : null) : current,
      );
      return remaining;
    });
  }, []);

  const handleContentChange = useCallback((path: string, content: string) => {
    setFiles((prev) => {
      const updateNode = (nodes: FileNode[]): FileNode[] =>
        nodes.map((node) => {
          if (node.path === path) return { ...node, content };
          if (node.children) return { ...node, children: updateNode(node.children) };
          return node;
        });

      return updateNode(prev);
    });
  }, []);

  const handleSendMessage = useCallback((content: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
  }, []);

  const handleStreamMessage = useCallback((id: string, content: string, done: boolean) => {
    void done;
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.id === id) {
        return prev.map((message) => (message.id === id ? { ...message, content } : message));
      }

      return [...prev, { id, role: "assistant", content, timestamp: new Date() }];
    });
  }, []);

  const projectContext = useMemo(
    () => ({
      active_file: activeFile
        ? { path: activeFile.path, content: activeFile.content, language: activeFile.language }
        : null,
      open_files: openFilePaths,
      file_tree: files.map((file) => file.name).join(", "),
    }),
    [activeFile, openFilePaths, files],
  );

  const handleInsertCode = useCallback(
    (code: string, replace = false) => {
      if (!activeFile || !activeFilePath) return;

      const currentContent = activeFile.content || "";
      const newContent = replace ? code : `${currentContent}\n${code}`;
      handleContentChange(activeFilePath, newContent);
    },
    [activeFile, activeFilePath, handleContentChange],
  );

  const handleCreateFile = useCallback(
    (path: string, content: string) => {
      const updateTree = (nodes: FileNode[], parts: string[], currentPath: string): FileNode[] => {
        if (parts.length === 1) {
          const fileName = parts[0];
          const existingNodeIndex = nodes.findIndex((node) => node.name === fileName && node.type === "file");
          const newNode: FileNode = {
            name: fileName,
            path,
            type: "file",
            language: detectFileLanguage(fileName),
            content,
          };

          if (existingNodeIndex >= 0) {
            const nextNodes = [...nodes];
            nextNodes[existingNodeIndex] = newNode;
            return nextNodes;
          }

          return [...nodes, newNode];
        }

        const folderName = parts[0];
        const nextPath = currentPath ? `${currentPath}/${folderName}` : folderName;
        const existingFolderIndex = nodes.findIndex((node) => node.name === folderName && node.type === "folder");

        if (existingFolderIndex >= 0) {
          const nextNodes = [...nodes];
          nextNodes[existingFolderIndex] = {
            ...nodes[existingFolderIndex],
            children: updateTree(nodes[existingFolderIndex].children || [], parts.slice(1), nextPath),
          };
          return nextNodes;
        }

        const newFolder: FileNode = {
          name: folderName,
          path: nextPath,
          type: "folder",
          children: updateTree([], parts.slice(1), nextPath),
        };

        return [...nodes, newFolder];
      };

      setFiles((prev) => updateTree(prev, path.split("/").filter(Boolean), ""));
      setActiveFilePath(path);
      setOpenFilePaths((prev) => (prev.includes(path) ? prev : [...prev, path]));
      setMobileTab("editor");
    },
    [],
  );

  const handleToolCall = useCallback(
    async (name: string, args: any) => {
      if (name === "read_file") {
        const file = flattenFiles(files).find((currentFile) => currentFile.path === args.path);

        if (file) {
          setOpenFilePaths((prev) => (prev.includes(args.path) ? prev : [...prev, args.path]));
          setActiveFilePath(args.path);
          setMobileTab("editor");
          setMessages((prev) => [
            ...prev,
            {
              id: `${Date.now()}-sys`,
              role: "assistant",
              content: `Opened \`${args.path}\` in the editor.`,
              timestamp: new Date(),
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: `${Date.now()}-sys`,
              role: "assistant",
              content: `Could not find \`${args.path}\`.`,
              timestamp: new Date(),
            },
          ]);
        }

        return;
      }

      if (name === "write_file") {
        handleCreateFile(args.path, args.content);
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-sys`,
            role: "assistant",
            content: `Created or updated \`${args.path}\`.`,
            timestamp: new Date(),
          },
        ]);
      }
    },
    [files, handleCreateFile],
  );

  const handleCommitGitHubFile = useCallback(
    async (message: string) => {
      if (!commitDialogPath) return;

      const strippedPath = commitDialogPath.replace("github:", "");
      const parts = strippedPath.split("/");
      const owner = parts[0];
      const repo = parts[1];
      const filePath = parts.slice(2).join("/");
      const file = flattenFiles(files).find((currentFile) => currentFile.path === commitDialogPath);

      if (!file?.content) return;

      await commitFile(owner, repo, filePath, file.content, message);
      setCommitDialogPath(null);
    },
    [commitDialogPath, files, commitFile],
  );

  const handleSelectRepo = useCallback((repo: GitHubRepo) => {
    setSelectedGitHubRepo(repo);
    setMobileTab("editor");
    setScreen("editor");
  }, []);

  const activeMobileItem = MOBILE_NAV_ITEMS.find((item) => item.id === mobileTab) ?? MOBILE_NAV_ITEMS[1];
  const activeMobileFileLabel = activeFile?.name ?? "Select a file";
  const mobileWorkspaceLabel = selectedGitHubRepo?.full_name ?? "Local workspace";
  const activeMobileDetail =
    mobileTab === "editor"
      ? activeMobileFileLabel
      : mobileTab === "files"
        ? `${allFiles.length} files available`
        : mobileTab === "chat"
          ? `${messages.length} messages in context`
          : mobileTab === "preview"
            ? activeFile?.name ?? "Preview waiting for a file"
            : "Branches, history, and diff tools";
  const mobileFlowLabel =
    mobileTab === "editor"
      ? `${openFiles.length} open tabs`
      : mobileTab === "files"
        ? `${allFiles.length} tracked files`
        : mobileTab === "chat"
          ? `${messages.length} active messages`
          : mobileTab === "preview"
            ? "Live render surface"
            : "Commit and branch tools";

  const mobileShellPaddingClass = cn("flex-1 min-h-0", isLandscapeMobile ? "px-0" : "mobile-safe-shell");
  const mobileStageClass = cn(
    "mobile-panel flex min-h-0 flex-1 flex-col",
    isLandscapeMobile ? "rounded-none border-x-0 border-b-0" : isCompactMobile ? "rounded-[18px]" : "rounded-[24px]",
  );
  const mobileMotionClass = prefersReducedMotion
    ? "animate-none"
    : slideDirection === "left"
      ? "animate-slide-from-right"
      : slideDirection === "right"
        ? "animate-slide-from-left"
        : "animate-fade-in";
  const ActiveMobileIcon = activeMobileItem.icon;

  const mobileScreens = {
    landing: <LandingScreen onEnter={() => setScreen("login")} />,
    login: <LoginScreen onContinue={() => setScreen("editor")} />,
    repos: <ReposScreen onSelectRepo={handleSelectRepo} onBack={() => setScreen("editor")} />,
    settings: (
      <SettingsScreen
        onBack={() => setScreen("editor")}
        editorSettings={editorSettings}
        onSettingsChange={setEditorSettings}
      />
    ),
    "ai-planner": <AIProjectPlanner onBack={() => setScreen("editor")} sessionId={appSessionId} />,
    editor: (
      <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-background grain-overlay">
        <div className={cn("mobile-safe-shell shrink-0", isLandscapeMobile ? "pt-2" : "mobile-safe-top")}>
          <div
            className={cn(
              "mobile-hero-surface mobile-grid-overlay flex flex-col gap-2 border-white/8 px-3 py-2.5",
              isCompactMobile ? "rounded-[20px]" : "rounded-[24px]",
            )}
          >
            <div className="flex items-start gap-2.5">
              <div className="min-w-0 flex flex-1 items-center gap-2.5">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.04]">
                  <div className="absolute inset-1 rounded-[12px] bg-primary/12 blur-md" />
                  <img src="/app-icon.png" alt="" className="relative z-10 h-5 w-5 rounded-md" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase tracking-[0.24em] text-muted-foreground">Workspace</span>
                    {!isShortMobileHeight && (
                      <span className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-0.5 text-[8px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
                        Mobile
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 truncate font-display text-sm font-semibold tracking-tight text-foreground">
                    {mobileWorkspaceLabel}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[9px] uppercase tracking-[0.22em] text-muted-foreground/80">
                    <span className="font-display tracking-[0.16em] text-foreground/90">
                      Hug<span className="text-primary">Code</span>
                    </span>
                    <span className="h-1 w-1 rounded-full bg-white/15" />
                    <span className="truncate">{activeMobileDetail}</span>
                  </div>
                </div>
              </div>

              <div className="grid shrink-0 grid-cols-3 gap-1.5">
                <button
                  onClick={() => setScreen("ai-planner")}
                  aria-label="Open AI planner"
                  title="AI Planner"
                  className="flex h-10 w-10 items-center justify-center rounded-[18px] border border-primary/15 bg-primary/8 text-primary transition-all duration-300 hover:bg-primary/14"
                >
                  <Sparkles className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setScreen("repos")}
                  aria-label="Open repositories"
                  title="Repositories"
                  className="flex h-10 w-10 items-center justify-center rounded-[18px] border border-white/8 bg-white/[0.03] text-muted-foreground transition-all duration-300 hover:bg-white/[0.07] hover:text-foreground"
                >
                  <FolderGit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setScreen("settings")}
                  aria-label="Open settings"
                  title="Settings"
                  className="flex h-10 w-10 items-center justify-center rounded-[18px] border border-white/8 bg-white/[0.03] text-muted-foreground transition-all duration-300 hover:bg-white/[0.07] hover:text-foreground"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div
              className={cn(
                "mobile-quiet-surface flex gap-2 rounded-[18px] border-white/8 bg-transparent px-3 py-2.5",
                isCompactMobile ? "flex-col" : "items-center justify-between",
              )}
            >
              <div className="min-w-0 flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-primary/18 bg-primary/10 text-primary">
                  <ActiveMobileIcon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground">{activeMobileItem.label}</p>
                    <span className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-0.5 text-[8px] uppercase tracking-[0.2em] text-muted-foreground">
                      Active
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-foreground/80">{activeMobileFileLabel}</p>
                </div>
              </div>

              <div className={cn("text-[10px] text-muted-foreground", isCompactMobile ? "pl-10" : "text-right")}>
                <p className="uppercase tracking-[0.2em]">{isLandscapeMobile ? "Touch-ready" : "Swipe tabs"}</p>
                <p className="mt-1 text-[11px] text-foreground/72">{mobileFlowLabel}</p>
              </div>
            </div>
          </div>
        </div>

        <div
          className={cn(
            mobileShellPaddingClass,
            isLandscapeMobile
              ? "pb-[calc(env(safe-area-inset-bottom,0px)+4.75rem)]"
              : "pb-[calc(env(safe-area-inset-bottom,0px)+6rem)]",
          )}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ touchAction: "pan-y", overflowX: "hidden" }}
        >
          <motion.div key={mobileTab} style={{ x }} className={cn("flex h-full w-full min-h-0 flex-col", mobileMotionClass)}>
            {mobileTab === "files" && (
              <div className={cn(mobileStageClass, "overflow-hidden")}>
                <FileExplorer files={files} activeFile={activeFilePath} onFileSelect={handleFileSelect} />
              </div>
            )}

            {mobileTab === "editor" && (
              <div className={mobileStageClass}>
                <TabBar
                  openFiles={openFiles}
                  activeFile={activeFilePath}
                  onTabSelect={setActiveFilePath}
                  onTabClose={handleTabClose}
                  onCommitFile={setCommitDialogPath}
                />
                <div className="relative flex-1 min-h-0">
                  <Suspense fallback={<LazyFallback />}>
                    {isPending ? (
                      <LazyFallback />
                    ) : (
                      <CodeEditor
                        file={activeFile}
                        onContentChange={handleContentChange}
                        settings={editorSettings}
                        onValidateErrors={handleValidateErrors}
                      />
                    )}
                  </Suspense>
                </div>
              </div>
            )}

            {mobileTab === "preview" && (
              <div className={mobileStageClass}>
                <Suspense fallback={<LazyFallback />}>
                  <PreviewPanel file={activeFile} />
                </Suspense>
              </div>
            )}

            {mobileTab === "chat" && (
              <div className={mobileStageClass}>
                <Suspense fallback={<LazyFallback />}>
                  <AIChatPanel
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    onStreamMessage={handleStreamMessage}
                    onInsertCode={handleInsertCode}
                    projectContext={projectContext}
                    onCreateFile={handleCreateFile}
                    onToolCall={handleToolCall}
                  />
                </Suspense>
              </div>
            )}

            {mobileTab === "git" && (
              <div className={cn(mobileStageClass, "overflow-hidden")}>
                <Suspense fallback={<LazyFallback />}>
                  <GitPanel />
                </Suspense>
              </div>
            )}
          </motion.div>
        </div>

        <div
          className={cn(
            "mobile-dock absolute z-50 border border-white/10",
            isLandscapeMobile
              ? "bottom-2 left-2 right-2 rounded-[20px]"
              : isCompactMobile
                ? "left-2.5 right-2.5 rounded-[22px]"
                : "left-4 right-4 rounded-[26px]",
          )}
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)" }}
        >
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          <div className="grid grid-cols-5 gap-1 p-1.5">
            {MOBILE_NAV_ITEMS.map(({ id, icon: Icon, label }) => {
              const isActive = mobileTab === id;

              return (
                <button
                  key={id}
                  onClick={() => switchToTab(id)}
                  aria-label={label}
                  title={label}
                  className={cn(
                    "group relative flex min-h-[52px] flex-col items-center justify-center rounded-[18px] px-1 text-center transition-all duration-300",
                    isActive
                      ? "bg-primary/12 text-primary shadow-inner"
                      : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground",
                  )}
                >
                  {isActive && <div className="absolute inset-0 rounded-[18px] bg-primary/18 blur-md" />}
                  <Icon
                    className={cn(
                      "relative z-10 h-5 w-5 transition-transform duration-300",
                      isActive ? "scale-110" : "group-hover:scale-105",
                    )}
                    strokeWidth={isActive ? 2.4 : 2}
                  />
                  <span
                    className={cn(
                      "relative z-10 mt-1 text-[9px] uppercase tracking-[0.2em]",
                      isActive ? "text-primary/90" : "text-muted-foreground/70",
                    )}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {commitDialogPath && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-fade-in">
            <CommitDialog
              filePath={commitDialogPath}
              fileContent={flattenFiles(files).find((file) => file.path === commitDialogPath)?.content || ""}
              onCommit={handleCommitGitHubFile}
              onClose={() => setCommitDialogPath(null)}
            />
          </div>
        )}
      </div>
    ),
  };

  return <MobileStack activeScreen={screen} screens={mobileScreens} onBack={() => setScreen("editor")} />;
};

export default Index;
