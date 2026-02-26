import { useState, useCallback } from "react";
import { FileExplorer } from "@/components/ide/FileExplorer";
import { CodeEditor } from "@/components/ide/CodeEditor";
import { AIChatPanel } from "@/components/ide/AIChatPanel";
import { TabBar } from "@/components/ide/TabBar";
import { StatusBar } from "@/components/ide/StatusBar";
import { DEFAULT_FILES, flattenFiles } from "@/stores/editorStore";
import type { FileNode, ChatMessage } from "@/stores/editorStore";
import { Code2, MessageSquare, PanelLeftClose, PanelLeft, Github } from "lucide-react";
import { GitHubPanel } from "@/components/ide/GitHubPanel";

const Index = () => {
  const [files, setFiles] = useState<FileNode[]>(DEFAULT_FILES);
  const [activeFilePath, setActiveFilePath] = useState<string | null>("src/App.tsx");
  const [openFilePaths, setOpenFilePaths] = useState<string[]>(["src/App.tsx"]);
  const [chatVisible, setChatVisible] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [rightPanel, setRightPanel] = useState<"chat" | "github">("chat");
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

  const lineCount = activeFile?.content?.split("\n").length || 0;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Title Bar */}
      <div className="h-9 bg-ide-sidebar border-b border-border flex items-center px-3 gap-2 shrink-0">
        <Code2 className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold text-foreground">Code Agent Studio</span>
        <div className="flex-1" />
        <button
          onClick={() => setSidebarVisible(!sidebarVisible)}
          className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
        >
          {sidebarVisible ? <PanelLeftClose className="h-3.5 w-3.5" /> : <PanelLeft className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={() => { setRightPanel("chat"); setChatVisible(true); }}
          className={`p-1 rounded hover:bg-secondary transition-colors ${rightPanel === "chat" && chatVisible ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => { setRightPanel("github"); setChatVisible(true); }}
          className={`p-1 rounded hover:bg-secondary transition-colors ${rightPanel === "github" && chatVisible ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Github className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {sidebarVisible && (
          <div className="w-56 shrink-0">
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
          />
          <CodeEditor file={activeFile} onContentChange={handleContentChange} />
        </div>

        {/* Chat Panel */}
        {chatVisible && (
          <div className="w-80 shrink-0">
            {rightPanel === "chat" ? (
              <AIChatPanel messages={messages} onSendMessage={handleSendMessage} />
            ) : (
              <GitHubPanel />
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
