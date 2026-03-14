import { useState, useCallback, useMemo, lazy, Suspense, useEffect, useTransition } from "react";
import { FileExplorer } from "@/components/ide/FileExplorer";
import { TabBar } from "@/components/ide/TabBar";
import { StatusBar } from "@/components/ide/StatusBar";
import { CommitDialog } from "@/components/ide/CommitDialog";
import { DEFAULT_FILES, flattenFiles } from "@/stores/editorStore";
import type { FileNode, ChatMessage } from "@/stores/editorStore";
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
import { useGitHub, type GitHubRepo } from "@/hooks/useGitHub";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSwipe, type SwipeDirection } from "@/hooks/useSwipe";
import { LoginScreen } from "@/components/screens/LoginScreen";
import { DEFAULT_EDITOR_SETTINGS, type EditorSettings } from "@/components/screens/settings.types";
import { HeaderActions } from "@/components/ide/HeaderActions";

// Lazy load heavy components
const CodeEditor = lazy(() => import("@/components/ide/CodeEditor").then(m => ({ default: m.CodeEditor })));
const AIChatPanel = lazy(() => import("@/components/ide/AIChatPanel").then(m => ({ default: m.AIChatPanel })));
const GitHubPanel = lazy(() => import("@/components/ide/GitHubPanel").then(m => ({ default: m.GitHubPanel })));
const GitPanel = lazy(() => import("@/components/ide/GitPanel").then(m => ({ default: m.GitPanel })));
const PreviewPanel = lazy(() => import("@/components/ide/PreviewPanel").then(m => ({ default: m.PreviewPanel })));
const ReposScreen = lazy(() => import("@/components/screens/ReposScreen").then(m => ({ default: m.ReposScreen })));
const SettingsScreen = lazy(() => import("@/components/screens/SettingsScreen").then(m => ({ default: m.SettingsScreen })));
const AIProjectPlanner = lazy(() => import("@/components/screens/AIProjectPlanner").then(m => ({ default: m.AIProjectPlanner })));
const DashboardScreen = lazy(() => import("@/components/screens/DashboardScreen").then(m => ({ default: m.DashboardScreen })));
const ProfileScreen = lazy(() => import("@/components/screens/ProfileScreen").then(m => ({ default: m.ProfileScreen })));
const LandingScreen = lazy(() => import("@/components/screens/LandingScreen").then(m => ({ default: m.LandingScreen })));

const LazyFallback = () => (
  <div className="flex-1 flex items-center justify-center bg-ide-editor">
    <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
  </div>
);

const ScreenFallback = () => (
  <div className="h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
  </div>
);

type AppScreen = "landing" | "login" | "repos" | "editor" | "settings" | "ai-planner" | "dashboard" | "profile";
type MobileTab = "files" | "editor" | "preview" | "chat" | "git";
const MOBILE_TABS: MobileTab[] = ["files", "editor", "preview", "chat", "git"];

import { MobileStack } from "@/components/native/MobileStack";
import { AsyncStorage } from "@/lib/asyncStorage";
import { getSessionId } from "@/lib/session";
import { motion } from "framer-motion";

const Index = () => {
  const isMobile = useIsMobile();
  const appSessionId = useMemo(() => getSessionId(), []);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPending, startFileTransition] = useTransition();
  const [screen, setScreen] = useState<AppScreen>("landing");
  const [files, setFiles] = useState<FileNode[]>(DEFAULT_FILES);
  const [activeFilePath, setActiveFilePath] = useState<string | null>("src/App.tsx");
  const [openFilePaths, setOpenFilePaths] = useState<string[]>(["src/App.tsx"]);

  // Elite Offline Support Initialization
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
        console.warn("Elite M-Store loading error:", err);
      } finally {
        setIsLoaded(true);
      }
    };
    loadState();
  }, []);

  // Elite Offline Support Syncing Layer
  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem("files_state", files).catch(() => { });
      AsyncStorage.setItem("active_file", activeFilePath).catch(() => { });
      AsyncStorage.setItem("open_tabs", openFilePaths).catch(() => { });
    }
  }, [files, activeFilePath, openFilePaths, isLoaded]);

  const [chatVisible, setChatVisible] = useState(!isMobile);
  const [sidebarVisible, setSidebarVisible] = useState(!isMobile);
  const [rightPanel, setRightPanel] = useState<"chat" | "github" | "git">("chat");
  const [previewVisible, setPreviewVisible] = useState(false);
  const [commitDialogPath, setCommitDialogPath] = useState<string | null>(null);
  const [editorSettings, setEditorSettings] = useState<EditorSettings>(DEFAULT_EDITOR_SETTINGS);
  const [selectedGitHubRepo, setSelectedGitHubRepo] = useState<GitHubRepo | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("editor");
  const [slideDirection, setSlideDirection] = useState<SwipeDirection>(null);

  const [editorErrors, setEditorErrors] = useState<{ path: string; errors: string[] }>({ path: "", errors: [] });
  const [notifiedErrors, setNotifiedErrors] = useState<Set<string>>(new Set());

  const handleValidateErrors = useCallback((path: string, errors: string[]) => {
    setEditorErrors({ path, errors });
  }, []);

  useEffect(() => {
    if (editorErrors.errors.length === 0 || !editorErrors.path) return;
    
    const timer = setTimeout(() => {
      const errorFingerprint = `${editorErrors.path}:${editorErrors.errors[0]}`;
      // Allow re-notifying if we cleared the set, but practically we hold it to avoid spam.
      if (!notifiedErrors.has(errorFingerprint)) {
        setNotifiedErrors(prev => new Set(prev).add(errorFingerprint));
        setMessages((prev) => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.role === "assistant" && lastMsg.content.includes("تنبيه استباقي")) {
             return prev; 
          }
          return [...prev, {
            id: Date.now().toString() + "-err",
            role: "assistant",
            content: `⚠️ **تنبيه استباقي (Proactive Watcher)**: لقد لاحظت وجود خطأ برمجي (Syntax/Type Error) في ملف \`${editorErrors.path}\`:\n\`\`\`text\n${editorErrors.errors[0]}\n\`\`\`\nهل ترغب أن أقوم بإصلاح هذا الخطأ فوراً باستخدام قدراتي البرمجية؟`,
            timestamp: new Date()
          }];
        });
      }
    }, 4000); // 4 seconds delay to avoid typing noise
    
    return () => clearTimeout(timer);
  }, [editorErrors, notifiedErrors]);

  // Terminal & Server Error Watcher (Vite HMR Hook)
  useEffect(() => {
    // @ts-expect-error Vite injects `import.meta.hot` only in HMR-enabled environments.
    const hot = import.meta.hot;
    if (hot) {
      hot.on("vite:error", (payload: any) => {
        const errorMsg = payload.err?.message || "Unknown System Error";
        let errorPath = payload.err?.id || payload.err?.loc?.file || "Terminal";
        // Clean up messy absolute paths to be readable
        if (errorPath.includes("hug-code-companion")) {
           errorPath = errorPath.split("hug-code-companion").pop();
        }
        const snippet = payload.err?.frame || "";
        
        const fullError = snippet ? `${errorMsg}\n\nCode snippet:\n${snippet}` : errorMsg;
        
        setEditorErrors({
          path: `🖥️ Terminal: ${errorPath}`,
          errors: [fullError]
        });
      });
    }
  }, []);

  const navigateTab = useCallback((direction: "left" | "right") => {
    setMobileTab(prev => {
      const i = MOBILE_TABS.indexOf(prev);
      if (direction === "left" && i < MOBILE_TABS.length - 1) {
        setSlideDirection("left");
        return MOBILE_TABS[i + 1];
      }
      if (direction === "right" && i > 0) {
        setSlideDirection("right");
        return MOBILE_TABS[i - 1];
      }
      return prev;
    });
  }, []);

  const switchToTab = useCallback((tab: MobileTab) => {
    setMobileTab(prev => {
      const fromIdx = MOBILE_TABS.indexOf(prev);
      const toIdx = MOBILE_TABS.indexOf(tab);
      setSlideDirection(toIdx > fromIdx ? "left" : toIdx < fromIdx ? "right" : null);
      return tab;
    });
  }, []);

  const { onTouchStart, onTouchMove, onTouchEnd, x } = useSwipe({
    onSwipeLeft: () => navigateTab("left"),
    onSwipeRight: () => navigateTab("right"),
    threshold: 60,
  });
  const { commitFile, online } = useGitHub();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "👋 مرحباً بك في **HugCode**! أنا مساعدك الذكي للبرمجة. يمكنني مساعدتك في:\n\n- ✏️ كتابة وتحسين الكود\n- 🐛 تصحيح الأخطاء\n- 📖 شرح المفاهيم\n- 🏗️ تصميم الحلول\n\nماذا تريد أن نعمل عليه؟",
      timestamp: new Date(),
    },
  ]);

  const allFiles = flattenFiles(files);
  const activeFile = allFiles.find((f) => f.path === activeFilePath) || null;
  const openFiles = openFilePaths
    .map((p) => allFiles.find((f) => f.path === p))
    .filter(Boolean) as FileNode[];

  // Elite Concurrent Path Render
  const handleFileSelect = useCallback((path: string) => {
    setOpenFilePaths((prev) => (prev.includes(path) ? prev : [...prev, path]));
    if (isMobile) setMobileTab("editor");

    // Yield the main thread via startTransition
    // Monaco Editor is incredibly heavy; mounting an entirely new editor
    // block JS Thread. We tell React this update is non-urgent to keep UI silky smooth limit drops in UI framepacing.
    startFileTransition(() => {
      setActiveFilePath(path);
    });
  }, [isMobile]);

  const handleTabClose = useCallback(
    (path: string) => {
      setOpenFilePaths((prev) => {
        const remaining = prev.filter((p) => p !== path);
        setActiveFilePath((current) =>
          current === path ? (remaining.length > 0 ? remaining[remaining.length - 1] : null) : current
        );
        return remaining;
      });
    },
    []
  );

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
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
  }, []);

  const handleStreamMessage = useCallback((id: string, content: string, done: boolean) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.id === id) {
        return prev.map((m) => (m.id === id ? { ...m, content } : m));
      }
      return [...prev, { id, role: "assistant" as const, content, timestamp: new Date() }];
    });
  }, []);

  const projectContext = useMemo(() => ({
    active_file: activeFile ? { path: activeFile.path, content: activeFile.content, language: activeFile.language } : null,
    open_files: openFilePaths,
    file_tree: files.map((f) => f.name).join(", "),
  }), [activeFile, openFilePaths, files]);

  const handleInsertCode = useCallback((code: string, replace = false) => {
    if (activeFile && activeFilePath) {
      const currentContent = activeFile.content || "";
      const newContent = replace ? code : currentContent + "\n" + code;
      handleContentChange(activeFilePath, newContent);
    }
  }, [activeFile, activeFilePath, handleContentChange]);

  const handleCreateFile = useCallback((path: string, content: string) => {
    const updateTree = (nodes: FileNode[], parts: string[], currentPath: string): FileNode[] => {
      if (parts.length === 1) {
        const fileName = parts[0];
        const existingNodeIdx = nodes.findIndex((n) => n.name === fileName && n.type === "file");
        const ext = fileName.split(".").pop() || "txt";
        let language = ext;
        if (ext === "tsx" || ext === "ts") language = "typescript";
        else if (ext === "js" || ext === "jsx") language = "javascript";
        else if (ext === "md") language = "markdown";

        const newNode: FileNode = {
          name: fileName,
          path, // The requested full path
          type: "file",
          language,
          content,
        };

        if (existingNodeIdx >= 0) {
          const newNodes = [...nodes];
          newNodes[existingNodeIdx] = newNode;
          return newNodes;
        } else {
          return [...nodes, newNode];
        }
      } else {
        const folderName = parts[0];
        const nextPath = currentPath ? `${currentPath}/${folderName}` : folderName;
        const existingFolderIdx = nodes.findIndex((n) => n.name === folderName && n.type === "folder");

        if (existingFolderIdx >= 0) {
          const newNodes = [...nodes];
          newNodes[existingFolderIdx] = {
            ...nodes[existingFolderIdx],
            children: updateTree(nodes[existingFolderIdx].children || [], parts.slice(1), nextPath)
          };
          return newNodes;
        } else {
          const newFolder: FileNode = {
            name: folderName,
            path: nextPath,
            type: "folder",
            children: updateTree([], parts.slice(1), nextPath)
          };
          return [...nodes, newFolder];
        }
      }
    };

    setFiles((prev) => updateTree(prev, path.split("/").filter(Boolean), ""));
    setActiveFilePath(path);
    setOpenFilePaths((prev) => (prev.includes(path) ? prev : [...prev, path]));
    if (isMobile) setMobileTab("editor");
  }, [isMobile]);

  const handleToolCall = useCallback(async (name: string, args: any) => {
    if (name === "read_file") {
      const file = flattenFiles(files).find((f) => f.path === args.path);
      if (file) {
        setOpenFilePaths((prev) => (prev.includes(args.path) ? prev : [...prev, args.path]));
        setActiveFilePath(args.path);
        setMessages((prev) => [...prev, {
          id: Date.now().toString() + "-sys",
          role: "assistant",
          content: `✅ تم فتح وقراءة الملف \`${args.path}\`. أصبح الآن في السياق ويمكنك سؤالي عنه.`,
          timestamp: new Date()
        }]);
      } else {
        setMessages((prev) => [...prev, {
          id: Date.now().toString() + "-sys",
          role: "assistant",
          content: `❌ تعذر قراءة الملف \`${args.path}\`. الملف غير موجود.`,
          timestamp: new Date()
        }]);
      }
    } else if (name === "write_file") {
      handleCreateFile(args.path, args.content);
      setMessages((prev) => [...prev, {
        id: Date.now().toString() + "-sys",
        role: "assistant",
        content: `✅ تم تعديل/إنشاء الملف \`${args.path}\` بنجاح في محررك.`,
        timestamp: new Date()
      }]);
    }
  }, [files, handleCreateFile]);

  const handleGitHubFileOpen = useCallback(
    (path: string, content: string, language: string) => {
      const fileName = path.split("/").pop() || path;
      const newFile: FileNode = {
        name: `🔗 ${fileName}`,
        path,
        type: "file",
        language,
        content,
      };
      setFiles((prev) => {
        const allExisting = flattenFiles(prev);
        if (allExisting.some((f) => f.path === path)) {
          const updateNode = (nodes: FileNode[]): FileNode[] =>
            nodes.map((node) => {
              if (node.path === path) return { ...node, content };
              if (node.children) return { ...node, children: updateNode(node.children) };
              return node;
            });
          return updateNode(prev);
        }
        return [...prev, newFile];
      });
      startFileTransition(() => {
        setActiveFilePath(path);
        setOpenFilePaths((prevPaths) =>
          prevPaths.includes(path) ? prevPaths : [...prevPaths, path]
        );
      });
      if (isMobile) setMobileTab("editor");
    },
    [isMobile]
  );

  const handleCommitGitHubFile = useCallback(
    async (message: string) => {
      if (!commitDialogPath) return;
      const stripped = commitDialogPath.replace("github:", "");
      const parts = stripped.split("/");
      const owner = parts[0];
      const repo = parts[1];
      const filePath = parts.slice(2).join("/");
      const allCurrent = flattenFiles(files);
      const file = allCurrent.find((f) => f.path === commitDialogPath);
      if (!file?.content) return;
      console.log(`[GitHub Commit] Attempting commit to ${owner}/${repo} at ${filePath}`);
      await commitFile(owner, repo, filePath, file.content, message);
      setCommitDialogPath(null);
    },
    [commitDialogPath, files, commitFile]
  );

  const handleSelectRepo = useCallback((repo: GitHubRepo) => {
    setSelectedGitHubRepo(repo);
    setScreen("editor");
    setRightPanel("github");
    if (!isMobile) setChatVisible(true);
  }, [isMobile]);

  const handleToggleRightPanel = useCallback((panel: "chat" | "github" | "git") => {
    if (rightPanel === panel && chatVisible) {
      setChatVisible(false);
    } else {
      setRightPanel(panel);
      setChatVisible(true);
    }
  }, [rightPanel, chatVisible]);

  const lineCount = activeFile?.content?.split("\n").length || 0;

  // Mobile routing uses Elite Native Stack
  if (isMobile) {
    const mobileScreens = {
      landing: (
        <Suspense fallback={<ScreenFallback />}>
          <LandingScreen onEnter={() => setScreen("login")} />
        </Suspense>
      ),
      login: <LoginScreen onContinue={() => setScreen("editor")} />,
      repos: <ReposScreen onSelectRepo={handleSelectRepo} onBack={() => setScreen("editor")} />,
      settings: <SettingsScreen onBack={() => setScreen("editor")} editorSettings={editorSettings} onSettingsChange={setEditorSettings} />,
      'ai-planner': <AIProjectPlanner onBack={() => setScreen("editor")} sessionId={appSessionId} />,
      editor: (
        <div className="h-[100dvh] flex flex-col overflow-hidden bg-background grain-overlay relative">
          {/* Mobile Header - Glassmorphism & Minimalist */}
          <div className="h-14 bg-background/70 backdrop-blur-2xl border-b border-white/5 flex items-center px-4 gap-3 shrink-0 z-40 transition-all">
            <div className="flex items-center gap-2">
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 bg-primary/20 blur-md rounded-full" />
                <img src="/app-icon.png" alt="" className="w-6 h-6 rounded relative z-10" />
              </div>
              <span className="text-sm font-display font-semibold tracking-wide text-foreground/90">
                Hug<span className="text-primary drop-shadow-[0_0_8px_rgba(255,180,0,0.5)]">Code</span>
              </span>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-1.5 bg-white/[0.03] rounded-full p-1 border border-white/5 shadow-inner">
              <button
                onClick={() => setScreen("ai-planner")}
                aria-label="Open AI planner"
                title="AI Planner"
                className="p-2 rounded-full hover:bg-primary/20 hover:text-primary transition-all duration-300 text-muted-foreground"
              >
                <Sparkles className="h-4 w-4" />
              </button>
              <button
                onClick={() => setScreen("repos")}
                aria-label="Open repositories"
                title="Repositories"
                className="p-2 rounded-full hover:bg-white/10 hover:text-foreground transition-all duration-300 text-muted-foreground"
              >
                <FolderGit2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setScreen("settings")}
                aria-label="Open settings"
                title="Settings"
                className="p-2 rounded-full hover:bg-white/10 hover:text-foreground transition-all duration-300 text-muted-foreground"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Mobile Content (Padded at bottom for floating dock) */}
          <div className="flex-1 flex flex-col min-h-0 pb-[88px]" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} style={{ touchAction: 'pan-y', overflowX: 'hidden' }}>
            <motion.div
              key={mobileTab}
              style={{ x }}
              className={`flex-1 flex flex-col min-h-0 h-full w-full ${slideDirection === "left" ? "animate-slide-from-right" :
                slideDirection === "right" ? "animate-slide-from-left" :
                  "animate-fade-in"
                }`}
            >
              {mobileTab === "files" && (
                <div className="flex-1 overflow-y-auto">
                  <FileExplorer
                    files={files}
                    activeFile={activeFilePath}
                    onFileSelect={handleFileSelect}
                  />
                </div>
              )}

              {mobileTab === "editor" && (
                <div className="flex-1 flex flex-col min-h-0 bg-ide-editor/50 backdrop-blur-sm rounded-xl mx-2 mt-2 mb-0 overflow-hidden border border-white/5 shadow-2xl">
                  <TabBar
                    openFiles={openFiles}
                    activeFile={activeFilePath}
                    onTabSelect={setActiveFilePath}
                    onTabClose={handleTabClose}
                    onCommitFile={setCommitDialogPath}
                  />
                  <div className="flex-1 relative">
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
                <div className="flex-1 p-2 flex flex-col">
                  <Suspense fallback={<LazyFallback />}>
                    <div className="flex-1 rounded-xl overflow-hidden border border-white/5 shadow-2xl bg-ide-editor/50 backdrop-blur-sm">
                      <PreviewPanel file={activeFile} />
                    </div>
                  </Suspense>
                </div>
              )}

              {mobileTab === "chat" && (
                <div className="flex-1 flex flex-col min-h-0 bg-ide-editor/50 backdrop-blur-sm rounded-xl mx-2 mt-2 border border-white/5 shadow-2xl overflow-hidden">
                  <Suspense fallback={<LazyFallback />}>
                    <AIChatPanel messages={messages} onSendMessage={handleSendMessage} onStreamMessage={handleStreamMessage} onInsertCode={handleInsertCode} projectContext={projectContext} onCreateFile={handleCreateFile} onToolCall={handleToolCall} />
                  </Suspense>
                </div>
              )}

              {mobileTab === "git" && (
                <div className="flex-1 overflow-y-auto p-2">
                  <Suspense fallback={<LazyFallback />}>
                    <div className="flex-1 rounded-xl overflow-hidden border border-white/5 shadow-2xl bg-ide-editor/50 backdrop-blur-sm">
                      <GitPanel />
                    </div>
                  </Suspense>
                </div>
              )}
            </motion.div>
          </div >

          {/* Floating Dock Navigation - Avant-Garde Edge */}
          < div className="absolute bottom-6 left-4 right-4 h-16 bg-background/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8)] flex items-center justify-around px-2 z-50 safe-area-bottom" >
            {([
              { id: "files" as MobileTab, icon: FolderTree, label: "Files" },
              { id: "editor" as MobileTab, icon: Code2, label: "Code" },
              { id: "preview" as MobileTab, icon: Eye, label: "Preview" },
              { id: "chat" as MobileTab, icon: MessageSquare, label: "AI" },
              { id: "git" as MobileTab, icon: GitBranch, label: "Git" },
            ]).map(({ id, icon: Icon, label }) => {
              const isActive = mobileTab === id;
              return (
                <button
                  key={id}
                  onClick={() => switchToTab(id)}
                  aria-label={label}
                  title={label}
                  className={`relative flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all duration-500 ease-out group ${isActive
                    ? "bg-primary/10 text-primary shadow-inner scale-105"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    }`}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-primary/20 blur-md rounded-xl" />
                  )}
                  <Icon className={`h-[22px] w-[22px] transition-transform duration-300 relative z-10 ${isActive ? "scale-110" : "scale-100 group-hover:scale-105"}`} strokeWidth={isActive ? 2.5 : 2} />
                  {isActive && (
                    <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary shadow-[0_0_8px_hsl(45_100%_60%)] animate-fade-in" />
                  )}
                </button>
              )
            })}
          </div >

          {commitDialogPath && (
            <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
              <CommitDialog
                filePath={commitDialogPath}
                fileContent={flattenFiles(files).find(f => f.path === commitDialogPath)?.content || ""}
                onCommit={handleCommitGitHubFile}
                onClose={() => setCommitDialogPath(null)}
              />
            </div>
          )}
        </div >
      )
    };

    // Return ELITE 60FPS Native Stack Wrapper for mobile
    return <MobileStack activeScreen={screen} screens={mobileScreens} onBack={() => setScreen("editor")} />;
  }

  // Desktop Screen Router Layout
  if (screen === "landing") {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <LandingScreen onEnter={() => setScreen("login")} />
      </Suspense>
    );
  }

  if (screen === "login") {
    return <LoginScreen onContinue={() => setScreen("editor")} />;
  }

  if (screen === "dashboard") {
    return (
      <div className="h-screen flex flex-col pt-safe bg-background">
        {/* Simple navigation to get back */}
        <div className="bg-card border-b border-border p-2">
          <button onClick={() => setScreen("editor")} className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1 px-3">
            ← العودة للمحرر
          </button>
        </div>
        <Suspense fallback={<ScreenFallback />}>
          <DashboardScreen />
        </Suspense>
      </div>
    );
  }

  if (screen === "profile") {
    return (
      <div className="h-screen flex flex-col pt-safe bg-background">
        <div className="bg-card border-b border-border p-2">
          <button onClick={() => setScreen("editor")} className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1 px-3">
            ← العودة للمحرر
          </button>
        </div>
        <Suspense fallback={<ScreenFallback />}>
          <ProfileScreen />
        </Suspense>
      </div>
    );
  }

  if (screen === "repos") {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <ReposScreen
          onSelectRepo={handleSelectRepo}
          onBack={() => setScreen("editor")}
        />
      </Suspense>
    );
  }

  if (screen === "settings") {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <SettingsScreen
          onBack={() => setScreen("editor")}
          editorSettings={editorSettings}
          onSettingsChange={setEditorSettings}
        />
      </Suspense>
    );
  }

  if (screen === "ai-planner") {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <AIProjectPlanner
          onBack={() => setScreen("editor")}
          sessionId={appSessionId}
        />
      </Suspense>
    );
  }

  // Desktop layout (unchanged)
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background grain-overlay">
      {/* Title Bar */}
      <div className="h-10 bg-ide-sidebar border-b border-border flex items-center px-4 gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <img src="/app-icon.png" alt="" className="w-5 h-5 rounded" />
          <span className="text-[14px] font-display font-bold tracking-tight text-foreground">
            Hug<span className="text-primary">Code</span> <span className="text-yellow-500">✨ بيئة التطوير</span>
          </span>
        </div>
        <div className="flex-1" />
        <HeaderActions
          onNavigate={setScreen}
          sidebarVisible={sidebarVisible}
          onToggleSidebar={() => setSidebarVisible(!sidebarVisible)}
          previewVisible={previewVisible}
          onTogglePreview={() => setPreviewVisible(!previewVisible)}
          rightPanel={rightPanel}
          chatVisible={chatVisible}
          onToggleRightPanel={handleToggleRightPanel}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {sidebarVisible && (
          <div className="w-56 shrink-0 animate-fade-in">
            <FileExplorer
              files={files}
              activeFile={activeFilePath}
              onFileSelect={handleFileSelect}
            />
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <TabBar
            openFiles={openFiles}
            activeFile={activeFilePath}
            onTabSelect={setActiveFilePath}
            onTabClose={handleTabClose}
            onCommitFile={setCommitDialogPath}
          />
          <Suspense fallback={<LazyFallback />}>
            <CodeEditor
              file={activeFile}
              onContentChange={handleContentChange}
              settings={editorSettings}
              onValidateErrors={handleValidateErrors}
            />
          </Suspense>
        </div>

        {previewVisible && (
          <div className="w-[45%] shrink-0 animate-slide-in-right">
            <Suspense fallback={<LazyFallback />}>
              <PreviewPanel file={activeFile} />
            </Suspense>
          </div>
        )}

        {chatVisible && (
          <div className="w-80 shrink-0 animate-slide-in-right h-full">
            <Suspense fallback={<LazyFallback />}>
              {rightPanel === "chat" ? (
                <AIChatPanel
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  onStreamMessage={handleStreamMessage}
                  onInsertCode={handleInsertCode}
                  projectContext={projectContext}
                  onCreateFile={handleCreateFile}
                  onToolCall={handleToolCall}
                />
              ) : rightPanel === "github" ? (
                <GitHubPanel onFileOpen={handleGitHubFileOpen} />
              ) : (
                <GitPanel />
              )}
            </Suspense>
          </div>
        )}
      </div>

      <StatusBar
        activeFile={activeFilePath}
        language={activeFile?.language || ""}
        lineCount={lineCount}
        online={online}
      />

      {commitDialogPath && (
        <CommitDialog
          filePath={commitDialogPath}
          fileContent={flattenFiles(files).find(f => f.path === commitDialogPath)?.content || ""}
          onCommit={handleCommitGitHubFile}
          onClose={() => setCommitDialogPath(null)}
        />
      )}
    </div>
  );
};


export default Index;
