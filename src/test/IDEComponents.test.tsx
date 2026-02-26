import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FileExplorer } from "@/components/ide/FileExplorer";
import { TabBar } from "@/components/ide/TabBar";
import { StatusBar } from "@/components/ide/StatusBar";
import { DEFAULT_FILES, type FileNode } from "@/stores/editorStore";

describe("FileExplorer", () => {
  const defaultProps = {
    files: DEFAULT_FILES,
    activeFile: null,
    onFileSelect: vi.fn(),
  };

  it("renders Explorer header", () => {
    render(<FileExplorer {...defaultProps} />);
    expect(screen.getByText("Explorer")).toBeInTheDocument();
  });

  it("renders root level items", () => {
    render(<FileExplorer {...defaultProps} />);
    expect(screen.getByText("src")).toBeInTheDocument();
    expect(screen.getByText("package.json")).toBeInTheDocument();
    expect(screen.getByText("README.md")).toBeInTheDocument();
  });

  it("calls onFileSelect when file is clicked", () => {
    const onFileSelect = vi.fn();
    render(<FileExplorer {...defaultProps} onFileSelect={onFileSelect} />);
    fireEvent.click(screen.getByText("package.json"));
    expect(onFileSelect).toHaveBeenCalledWith("package.json");
  });

  it("expands folder on click", () => {
    render(<FileExplorer {...defaultProps} />);
    // src should be auto-expanded (depth < 2)
    expect(screen.getByText("App.tsx")).toBeInTheDocument();
  });

  it("highlights active file", () => {
    render(<FileExplorer {...defaultProps} activeFile="package.json" />);
    const button = screen.getByText("package.json").closest("button");
    expect(button?.className).toContain("border-r-primary");
  });
});

describe("TabBar", () => {
  const testFiles: FileNode[] = [
    { name: "App.tsx", path: "src/App.tsx", type: "file", language: "typescript" },
    { name: "index.ts", path: "src/index.ts", type: "file", language: "typescript" },
  ];

  it("renders nothing when no files are open", () => {
    const { container } = render(
      <TabBar openFiles={[]} activeFile={null} onTabSelect={vi.fn()} onTabClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders tabs for open files", () => {
    render(
      <TabBar openFiles={testFiles} activeFile="src/App.tsx" onTabSelect={vi.fn()} onTabClose={vi.fn()} />
    );
    expect(screen.getByText("App.tsx")).toBeInTheDocument();
    expect(screen.getByText("index.ts")).toBeInTheDocument();
  });

  it("calls onTabSelect when tab is clicked", () => {
    const onTabSelect = vi.fn();
    render(
      <TabBar openFiles={testFiles} activeFile="src/App.tsx" onTabSelect={onTabSelect} onTabClose={vi.fn()} />
    );
    fireEvent.click(screen.getByText("index.ts"));
    expect(onTabSelect).toHaveBeenCalledWith("src/index.ts");
  });

  it("shows commit button for GitHub files", () => {
    const githubFiles: FileNode[] = [
      { name: "🔗 test.ts", path: "github:user/repo/test.ts", type: "file", language: "typescript" },
    ];
    const onCommitFile = vi.fn();
    render(
      <TabBar
        openFiles={githubFiles}
        activeFile="github:user/repo/test.ts"
        onTabSelect={vi.fn()}
        onTabClose={vi.fn()}
        onCommitFile={onCommitFile}
      />
    );
    expect(screen.getByTitle("Commit & Push")).toBeInTheDocument();
  });
});

describe("StatusBar", () => {
  it("renders branch name", () => {
    render(<StatusBar activeFile="test.ts" language="typescript" lineCount={42} />);
    expect(screen.getByText("main")).toBeInTheDocument();
  });

  it("renders ready status", () => {
    render(<StatusBar activeFile="test.ts" language="typescript" lineCount={42} />);
    expect(screen.getByText("ready")).toBeInTheDocument();
  });

  it("renders line count", () => {
    render(<StatusBar activeFile="test.ts" language="typescript" lineCount={42} />);
    expect(screen.getByText("Ln 42")).toBeInTheDocument();
  });

  it("renders language", () => {
    render(<StatusBar activeFile="test.ts" language="typescript" lineCount={10} />);
    // CSS uppercase class applies visually; DOM text is lowercase
    expect(screen.getByText("typescript")).toBeInTheDocument();
  });

  it("renders UTF-8", () => {
    render(<StatusBar activeFile="test.ts" language="typescript" lineCount={10} />);
    expect(screen.getByText("UTF-8")).toBeInTheDocument();
  });

  it("hides file info when no active file", () => {
    render(<StatusBar activeFile={null} language="" lineCount={0} />);
    expect(screen.queryByText("Ln")).toBeNull();
  });
});
