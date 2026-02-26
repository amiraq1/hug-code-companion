import { useState, useCallback, lazy, Suspense } from "react";
import { FileExplorer } from "@/components/ide/FileExplorer";
import { TabBar } from "@/components/ide/TabBar";
import { StatusBar } from "@/components/ide/StatusBar";
import { CommitDialog } from "@/components/ide/CommitDialog";
import { DEFAULT_FILES, flattenFiles } from "@/stores/editorStore";
import type { FileNode, ChatMessage } from "@/stores/editorStore";
import {
  MessageSquare,
  PanelLeftClose,
  PanelLeft,
  Github,
  Eye,
  GitBranch,
  Settings,
  FolderGit2,
  Loader2,
} from "lucide-react";
import { useGitHub, type GitHubRepo } from "@/hooks/useGitHub";
import { LoginScreen } from "@/components/screens/LoginScreen";
import { ReposScreen } from "@/components/screens/ReposScreen";
import {
  SettingsScreen,
  DEFAULT_EDITOR_SETTINGS,
  type EditorSettings,
} from "@/components/screens/SettingsScreen";

// Lazy load heavy components
const CodeEditor = lazy(() => import("@/components/ide/CodeEditor").then(m => ({ default: m.CodeEditor })));
const AIChatPanel = lazy(() => import("@/components/ide/AIChatPanel").then(m => ({ default: m.AIChatPanel })));
const GitHubPanel = lazy(() => import("@/components/ide/GitHubPanel").then(m => ({ default: m.GitHubPanel })));
const GitPanel = lazy(() => import("@/components/ide/GitPanel").then(m => ({ default: m.GitPanel })));
const PreviewPanel = lazy(() => import("@/components/ide/PreviewPanel").then(m => ({ default: m.PreviewPanel })));

const LazyFallback = () => (
  <div className="flex-1 flex items-center justify-center bg-ide-editor">
    <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
  </div>
);

type AppScreen = "login" | "repos" | "editor" | "settings";

const Index = () => {
  const [screen, setScreen] = useState<AppScreen>("login");
  const [files, setFiles] = useState<FileNode[]>(DEFAULT_FILES);
  const [activeFilePath, setActiveFilePath] = useState<string | null>("src/App.tsx");
  const [openFilePaths, setOpenFilePaths] = useState<string[]>(["src/App.tsx"]);
  const [chatVisible, setChatVisible] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [rightPanel, setRightPanel] = useState<"chat" | "github" | "git">("chat");
  const [previewVisible, setPreviewVisible] = useState(false);
  const [commitDialogPath, setCommitDialogPath] = useState<string | null>(null);
  const [editorSettings, setEditorSettings] = useState<EditorSettings>(DEFAULT_EDITOR_SETTINGS);
  const [selectedGitHubRepo, setSelectedGitHubRepo] = useState<GitHubRepo | null>(null);
  const { commitFile, online } = useGitHub();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "👋 Welcome to **Code Agent Studio**! I'm your AI coding assistant. I can help you:\n\n- ✏️ Write & refactor code\n- 🐛 Debug issues\n- 📖 Explain concepts\n- 🏗️ Architect solutions\n\nWhat would you like to work on?",
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
  }, []);

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
    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: generateResponse(content),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    }, 800);
  }, []);

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
    },
    []
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
    setChatVisible(true);
  }, []);

  const lineCount = activeFile?.content?.split("\n").length || 0;

  // Screen Router
  if (screen === "login") {
    return <LoginScreen onContinue={() => setScreen("editor")} />;
  }

  if (screen === "repos") {
    return (
      <ReposScreen
        onSelectRepo={handleSelectRepo}
        onBack={() => setScreen("editor")}
      />
    );
  }

  if (screen === "settings") {
    return (
      <SettingsScreen
        onBack={() => setScreen("editor")}
        editorSettings={editorSettings}
        onSettingsChange={setEditorSettings}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background grain-overlay">
      {/* Title Bar */}
      <div className="h-10 bg-ide-sidebar border-b border-border flex items-center px-4 gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
          <span className="text-[13px] font-display font-semibold tracking-tight text-foreground">
            code<span className="text-primary">agent</span>
          </span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setScreen("repos")}
            className="p-1.5 rounded-md hover:bg-secondary/60 transition-all duration-200 text-muted-foreground hover:text-foreground"
            title="Repositories"
          >
            <FolderGit2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setScreen("settings")}
            className="p-1.5 rounded-md hover:bg-secondary/60 transition-all duration-200 text-muted-foreground hover:text-foreground"
            title="Settings"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
          <div className="w-px h-4 bg-border mx-1" />
          <button
            onClick={() => setSidebarVisible(!sidebarVisible)}
            className="p-1.5 rounded-md hover:bg-secondary/60 transition-all duration-200 text-muted-foreground hover:text-foreground"
          >
            {sidebarVisible ? (
              <PanelLeftClose className="h-3.5 w-3.5" />
            ) : (
              <PanelLeft className="h-3.5 w-3.5" />
            )}
          </button>
          <div className="w-px h-4 bg-border mx-1" />
          <button
            onClick={() => setPreviewVisible(!previewVisible)}
            className={`p-1.5 rounded-md transition-all duration-200 ${
              previewVisible
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            }`}
            title="Preview"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              if (rightPanel === "chat" && chatVisible) setChatVisible(false);
              else { setRightPanel("chat"); setChatVisible(true); }
            }}
            className={`p-1.5 rounded-md transition-all duration-200 ${
              rightPanel === "chat" && chatVisible
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              if (rightPanel === "github" && chatVisible) setChatVisible(false);
              else { setRightPanel("github"); setChatVisible(true); }
            }}
            className={`p-1.5 rounded-md transition-all duration-200 ${
              rightPanel === "github" && chatVisible
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            }`}
          >
            <Github className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              if (rightPanel === "git" && chatVisible) setChatVisible(false);
              else { setRightPanel("git"); setChatVisible(true); }
            }}
            className={`p-1.5 rounded-md transition-all duration-200 ${
              rightPanel === "git" && chatVisible
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            }`}
            title="Git"
          >
            <GitBranch className="h-3.5 w-3.5" />
          </button>
        </div>
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
                <AIChatPanel messages={messages} onSendMessage={handleSendMessage} />
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

function generateResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("hello") || lower.includes("hi")) {
    return "Hey there! 👋 Ready to code. What are you building today?";
  }
  if (lower.includes("help")) {
    return "I can help with:\n\n```\n• Writing new components\n• Debugging errors\n• Code reviews\n• Explaining concepts\n```\n\nJust describe what you need!";
  }
  if (lower.includes("react") || lower.includes("component")) {
    return "Here's a quick React component pattern:\n\n```tsx\ninterface Props {\n  title: string;\n  onClick: () => void;\n}\n\nexport function MyComponent({ title, onClick }: Props) {\n  return (\n    <button onClick={onClick}>\n      {title}\n    </button>\n  );\n}\n```\n\nWant me to customize this for your use case?";
  }
  return "I understand! Let me think about that...\n\nI'd suggest breaking this into smaller steps. What specific part would you like to tackle first?";
}

export default Index;
