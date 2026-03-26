import { getFileKind } from "@/lib/fileMeta";

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: FileNode[];
  content?: string;
  language?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export const DEFAULT_FILES: FileNode[] = [
  {
    name: "src",
    path: "src",
    type: "folder",
    children: [
      {
        name: "App.tsx",
        path: "src/App.tsx",
        type: "file",
        language: "typescript",
        content: `import React from 'react';
import { FileExplorer } from './components/FileExplorer';
import { Editor } from './components/Editor';
import { ChatPanel } from './components/ChatPanel';

export default function App() {
  return (
    <div className="app-container">
      <FileExplorer />
      <Editor />
      <ChatPanel />
    </div>
  );
}`,
      },
      {
        name: "index.ts",
        path: "src/index.ts",
        type: "file",
        language: "typescript",
        content: `import App from './App';
import { createRoot } from 'react-dom/client';

const root = createRoot(document.getElementById('root')!);
root.render(<App />);`,
      },
      {
        name: "components",
        path: "src/components",
        type: "folder",
        children: [
          {
            name: "FileExplorer.tsx",
            path: "src/components/FileExplorer.tsx",
            type: "file",
            language: "typescript",
            content: `import React, { useState } from 'react';

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

export function FileExplorer() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  return (
    <aside className="file-explorer">
      <h3>Explorer</h3>
      {/* File tree renders here */}
    </aside>
  );
}`,
          },
          {
            name: "Editor.tsx",
            path: "src/components/Editor.tsx",
            type: "file",
            language: "typescript",
            content: `import React from 'react';

export function Editor() {
  return (
    <main className="editor-panel">
      <div className="tab-bar">
        <span className="tab active">App.tsx</span>
      </div>
      <div className="editor-content">
        {/* Monaco editor instance */}
      </div>
    </main>
  );
}`,
          },
        ],
      },
    ],
  },
  {
    name: "package.json",
    path: "package.json",
    type: "file",
    language: "json",
    content: `{
  "name": "code-agent-studio",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "typescript": "^5.0.0"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  }
}`,
  },
  {
    name: "README.md",
    path: "README.md",
    type: "file",
    language: "markdown",
    content: `# Code Agent Studio

An AI-powered code editor for building applications.

## Features
- 🗂️ Multi-file explorer
- ✏️ Syntax-highlighted code editor
- 🤖 AI chat assistant
- 🔗 GitHub integration
- 🖥️ CLI bridge

## Getting Started
\`\`\`bash
npm install
npm run dev
\`\`\`
`,
  },
];

export function flattenFiles(nodes: FileNode[]): FileNode[] {
  const files: FileNode[] = [];
  for (const node of nodes) {
    if (node.type === "file") files.push(node);
    if (node.children) files.push(...flattenFiles(node.children));
  }
  return files;
}

export function getFileIcon(name: string): string {
  return getFileKind(name);
}
