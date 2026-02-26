import { useState, useCallback } from "react";
import { FileExplorer } from "@/components/ide/FileExplorer";
import { CodeEditor } from "@/components/ide/CodeEditor";
import { AIChatPanel } from "@/components/ide/AIChatPanel";
import { TabBar } from "@/components/ide/TabBar";
import { StatusBar } from "@/components/ide/StatusBar";
import { CommitDialog } from "@/components/ide/CommitDialog";
import { DEFAULT_FILES, flattenFiles } from "@/stores/editorStore";
import type { FileNode, ChatMessage } from "@/stores/editorStore";
import { Code2, MessageSquare, PanelLeftClose, PanelLeft, Github, Eye, GitBranch } from "lucide-react";
import { PreviewPanel } from "@/components/ide/PreviewPanel";
import { GitPanel } from "@/components/ide/GitPanel";
import { GitHubPanel } from "@/components/ide/GitHubPanel";
import { useGitHub } from "@/hooks/useGitHub";

const Index = () => {
  const [files, setFiles] = useState<FileNode[]>(DEFAULT_FILES);
  const [activeFilePath, setActiveFilePath] = useState<string | null>("src/App.tsx");
  const [openFilePaths, setOpenFilePaths] = useState<string[]>(["src/App.tsx"]);
  const [chatVisible, setChatVisible] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [rightPanel, setRightPanel] = useState<"chat" | "github" | "git">("chat");
  const [previewVisible, setPreviewVisible] = useState(false);
  const [commitDialogPath, setCommitDialogPath] = useState<string | null>(null);
  const { commitFile } = useGitHub();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content: "👋 Welcome to **Code Agent Studio**! I'm your AI coding assistant. I can help you:\n\n- ✏️ Write & refactor code\n- 🐛 Debug issues\n- 📖 Explain concepts\n- 🏗️ Architect solutions\n\nWhat would you like to work on?",
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

    // Simulated AI response
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

  const handleGitHubFileOpen = useCallback((path: string, content: string, language: string) => {
    // Add the GitHub file to the file tree as a virtual file
    const fileName = path.split("/").pop() || path;
    const newFile: FileNode = {
      name: `🔗 ${fileName}`,
      path,
      type: "file",
      language,
      content,
    };
    setFiles((prev) => {
      // Check if file already exists
      const allExisting = flattenFiles(prev);
      if (allExisting.some((f) => f.path === path)) {
        // Update content
        const updateNode = (nodes: FileNode[]): FileNode[] =>
          nodes.map((node) => {
            if (node.path === path) return { ...node, content };
            if (node.children) return { ...node, children: updateNode(node.children) };
            return node;
          });
        return updateNode(prev);
      }
      // Add as top-level file
      return [...prev, newFile];
    });
    setActiveFilePath(path);
    setOpenFilePaths((prevPaths) => (prevPaths.includes(path) ? prevPaths : [...prevPaths, path]));
  }, []);

  const handleCommitGitHubFile = useCallback(async (message: string) => {
    if (!commitDialogPath) return;
    // Parse "github:owner/repo/path/to/file"
    const stripped = commitDialogPath.replace("github:", "");
    const parts = stripped.split("/");
    const owner = parts[0];
    const repo = parts[1];
    const filePath = parts.slice(2).join("/");

    // Get current content from files
    const allCurrent = flattenFiles(files);
    const file = allCurrent.find((f) => f.path === commitDialogPath);
    if (!file?.content) return;

    await commitFile(owner, repo, filePath, file.content, message);
    setCommitDialogPath(null);
  }, [commitDialogPath, files, commitFile]);

  const lineCount = activeFile?.content?.split("\n").length || 0;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background grain-overlay">
      {/* Title Bar — asymmetric, typographic */}
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
            onClick={() => setSidebarVisible(!sidebarVisible)}
            className="p-1.5 rounded-md hover:bg-secondary/60 transition-all duration-200 text-muted-foreground hover:text-foreground"
          >
            {sidebarVisible ? <PanelLeftClose className="h-3.5 w-3.5" /> : <PanelLeft className="h-3.5 w-3.5" />}
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
            onClick={() => { setRightPanel("chat"); setChatVisible(true); }}
            className={`p-1.5 rounded-md transition-all duration-200 ${
              rightPanel === "chat" && chatVisible
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => { setRightPanel("github"); setChatVisible(true); }}
            className={`p-1.5 rounded-md transition-all duration-200 ${
              rightPanel === "github" && chatVisible
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            }`}
          >
            <Github className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => { setRightPanel("git"); setChatVisible(true); }}
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
        {/* Sidebar */}
        {sidebarVisible && (
          <div className="w-56 shrink-0 animate-fade-in">
            <FileExplorer files={files} activeFile={activeFilePath} onFileSelect={handleFileSelect} />
          </div>
        )}

        {/* Editor Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <TabBar
            openFiles={openFiles}
            activeFile={activeFilePath}
            onTabSelect={setActiveFilePath}
            onTabClose={handleTabClose}
            onCommitFile={setCommitDialogPath}
          />
          <CodeEditor file={activeFile} onContentChange={handleContentChange} />
        </div>

        {/* Preview Panel */}
        {previewVisible && (
          <div className="w-[45%] shrink-0 animate-slide-in-right">
            <PreviewPanel file={activeFile} />
          </div>
        )}

        {/* Right Panel */}
        {chatVisible && (
          <div className="w-80 shrink-0 animate-slide-in-right h-full">
            {rightPanel === "chat" ? (
              <AIChatPanel messages={messages} onSendMessage={handleSendMessage} />
            ) : rightPanel === "github" ? (
              <GitHubPanel onFileOpen={handleGitHubFileOpen} />
            ) : (
              <GitPanel />
            )}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <StatusBar
        activeFile={activeFilePath}
        language={activeFile?.language || ""}
        lineCount={lineCount}
      />

      {/* Commit Dialog */}
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
