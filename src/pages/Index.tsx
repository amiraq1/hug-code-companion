import { useState, useCallback, useMemo, lazy, Suspense } from "react";
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

type AppScreen = "login" | "repos" | "editor" | "settings" | "ai-planner" | "dashboard" | "profile";
type MobileTab = "files" | "editor" | "preview" | "chat" | "git";
const MOBILE_TABS: MobileTab[] = ["files", "editor", "preview", "chat", "git"];

const Index = () => {
  const isMobile = useIsMobile();
  const [screen, setScreen] = useState<AppScreen>("login");
  const [files, setFiles] = useState<FileNode[]>(DEFAULT_FILES);
  const [activeFilePath, setActiveFilePath] = useState<string | null>("src/App.tsx");
  const [openFilePaths, setOpenFilePaths] = useState<string[]>(["src/App.tsx"]);
  const [chatVisible, setChatVisible] = useState(!isMobile);
  const [sidebarVisible, setSidebarVisible] = useState(!isMobile);
  const [rightPanel, setRightPanel] = useState<"chat" | "github" | "git">("chat");
  const [previewVisible, setPreviewVisible] = useState(false);
  const [commitDialogPath, setCommitDialogPath] = useState<string | null>(null);
  const [editorSettings, setEditorSettings] = useState<EditorSettings>(DEFAULT_EDITOR_SETTINGS);
  const [selectedGitHubRepo, setSelectedGitHubRepo] = useState<GitHubRepo | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("editor");
  const [slideDirection, setSlideDirection] = useState<SwipeDirection>(null);

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

  const { onTouchStart, onTouchEnd } = useSwipe({
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

  const handleFileSelect = useCallback((path: string) => {
    setActiveFilePath(path);
    setOpenFilePaths((prev) => (prev.includes(path) ? prev : [...prev, path]));
    if (isMobile) setMobileTab("editor");
  }, [isMobile]);

  const handleTabClose = useCallback(
    (path: string) => {
      setOpenFilePaths((prev) => prev.filter((p) => p !== path));
      if (activeFilePath === path) {
        const remaining = openFilePaths.filter((p) => p !== path);
        setActiveFilePath(remaining.length > 0 ? remaining[remaining.length - 1] : null);
      }
    },
    [activeFilePath, openFilePaths]
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
      setActiveFilePath(path);
      setOpenFilePaths((prevPaths) =>
        prevPaths.includes(path) ? prevPaths : [...prevPaths, path]
      );
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

  // Screen Router
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
          sessionId={localStorage.getItem("hugcode_session") || "default"}
        />
      </Suspense>
    );
  }

  // Mobile layout
  if (isMobile) {
    return (
      <div className="h-[100dvh] flex flex-col overflow-hidden bg-background grain-overlay">
        {/* Mobile Header */}
        <div className="h-11 bg-ide-sidebar border-b border-border flex items-center px-3 gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <img src="/app-icon.png" alt="" className="w-5 h-5 rounded" />
            <span className="text-xs font-display font-semibold tracking-tight text-foreground">
              Hug<span className="text-primary">Code</span>
            </span>
          </div>
          <div className="flex-1" />
          <HeaderActions isMobile={true} onNavigate={setScreen} />
        </div>

        {/* Mobile Content */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <div
            key={mobileTab}
            className={`flex-1 flex flex-col min-h-0 ${slideDirection === "left" ? "animate-slide-from-right" :
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
              <>
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
                  />
                </Suspense>
              </>
            )}

            {mobileTab === "preview" && (
              <div className="flex-1">
                <Suspense fallback={<LazyFallback />}>
                  <PreviewPanel file={activeFile} />
                </Suspense>
              </div>
            )}

            {mobileTab === "chat" && (
              <div className="flex-1">
                <Suspense fallback={<LazyFallback />}>
                  <AIChatPanel
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    onStreamMessage={handleStreamMessage}
                    onInsertCode={handleInsertCode}
                    projectContext={projectContext}
                    onCreateFile={handleCreateFile}
                  />
                </Suspense>
              </div>
            )}

            {mobileTab === "git" && (
              <div className="flex-1 overflow-y-auto">
                <Suspense fallback={<LazyFallback />}>
                  <GitPanel />
                </Suspense>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Bottom Nav */}
        <div className="h-14 bg-ide-statusbar border-t border-border flex items-center justify-around px-1 shrink-0 safe-area-bottom">
          {([
            { id: "files" as MobileTab, icon: FolderTree, label: "Files" },
            { id: "editor" as MobileTab, icon: Code2, label: "Code" },
            { id: "preview" as MobileTab, icon: Eye, label: "Preview" },
            { id: "chat" as MobileTab, icon: MessageSquare, label: "AI" },
            { id: "git" as MobileTab, icon: GitBranch, label: "Git" },
          ]).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => switchToTab(id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-[3rem] ${mobileTab === id
                ? "text-primary"
                : "text-muted-foreground"
                }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ))}
        </div>

        {commitDialogPath && (
          <CommitDialog
            filePath={commitDialogPath}
            onCommit={handleCommitGitHubFile}
            onClose={() => setCommitDialogPath(null)}
          />
        )}
      </div>
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
          onCommit={handleCommitGitHubFile}
          onClose={() => setCommitDialogPath(null)}
        />
      )}
    </div>
  );
};


export default Index;
