import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/hooks/useGitHub", () => ({
  useGitHub: () => ({
    connected: false,
    username: null,
    loading: false,
    online: true,
    connect: vi.fn(),
    disconnect: vi.fn(),
    listRepos: vi.fn().mockResolvedValue([]),
    listContents: vi.fn(),
    getFile: vi.fn(),
    commitFile: vi.fn(),
    createRepo: vi.fn(),
    listBranches: vi.fn(),
    createBranch: vi.fn(),
    deleteBranch: vi.fn(),
    listCommits: vi.fn(),
    getStatus: vi.fn(),
  }),
  GitHubError: class extends Error {
    type: string;
    constructor(message: string, type: string) {
      super(message);
      this.type = type;
    }
  },
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: () => ({
    status: "unauthenticated",
    username: null,
    error: null,
    sessionId: "test-session",
    isAuthenticated: false,
    isLoading: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    clearError: vi.fn(),
    retry: vi.fn(),
    checkStatus: vi.fn(),
  }),
}));

vi.mock("@monaco-editor/react", () => ({
  default: ({ value }: { value: string }) => (
    <div data-testid="monaco-editor">{value?.slice(0, 50)}</div>
  ),
}));

vi.mock("@/components/ide/PreviewPanel", () => ({
  PreviewPanel: () => <div data-testid="preview-panel">Preview</div>,
}));

vi.mock("@/components/ide/GitPanel", () => ({
  GitPanel: () => <div data-testid="git-panel">Git</div>,
}));

vi.mock("@/components/ide/NotificationHub", () => ({
  NotificationHub: () => null,
}));

vi.mock("@/lib/asyncStorage", () => ({
  AsyncStorage: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
}));

import Index from "@/pages/Index";

function renderIndex() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <Index />
    </QueryClientProvider>
  );
}

async function goToLoginScreen() {
  const enterButton = await screen.findByRole("button", { name: /enter studio/i });
  fireEvent.click(enterButton);
  await screen.findByText("AI-Powered Code Editor & GitHub IDE");
}

function clickContinueWithoutGitHub() {
  const continueButton = screen.getAllByRole("button").find((button) => {
    const label = button.textContent ?? "";
    return label.includes("GitHub") && !button.querySelector("svg");
  });

  if (!continueButton) {
    throw new Error("Continue without GitHub button not found");
  }

  fireEvent.click(continueButton);
}

async function goToEditorScreen() {
  await goToLoginScreen();
  clickContinueWithoutGitHub();
  await screen.findByText("Explorer");
}

describe("App Navigation", () => {
  it("starts on landing screen then opens login screen", async () => {
    renderIndex();
    expect(await screen.findByRole("button", { name: /enter studio/i })).toBeInTheDocument();

    await goToLoginScreen();
    expect(screen.getByText("AI-Powered Code Editor & GitHub IDE")).toBeInTheDocument();
  });

  it("navigates to editor when Continue without GitHub is clicked", async () => {
    renderIndex();
    await goToEditorScreen();
    expect(screen.getByText("Explorer")).toBeInTheDocument();
  });

  it("shows settings screen when settings is clicked from editor", async () => {
    renderIndex();
    await goToEditorScreen();
    fireEvent.click(screen.getByTitle("Settings"));

    expect(await screen.findByText("Settings")).toBeInTheDocument();
    expect(await screen.findByText("Font Size")).toBeInTheDocument();
  });

  it("returns to editor from settings", async () => {
    renderIndex();
    await goToEditorScreen();
    fireEvent.click(screen.getByTitle("Settings"));
    await screen.findByText("Font Size");

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);

    expect(await screen.findByText("Explorer")).toBeInTheDocument();
  });

  it("navigates to repos screen from editor", async () => {
    renderIndex();
    await goToEditorScreen();
    fireEvent.click(screen.getByTitle("Repositories"));

    expect(await screen.findByText("/ repositories")).toBeInTheDocument();
  });

  it("toggles sidebar visibility", async () => {
    renderIndex();
    await goToEditorScreen();
    expect(screen.getByText("Explorer")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Hide sidebar"));
    expect(screen.queryByText("Explorer")).not.toBeInTheDocument();
  });
});

describe("Editor Features", () => {
  beforeEach(async () => {
    renderIndex();
    await goToEditorScreen();
  });

  it("shows file tree with default files", () => {
    expect(screen.getByText("src")).toBeInTheDocument();
    expect(screen.getByText("package.json")).toBeInTheDocument();
    expect(screen.getByText("README.md")).toBeInTheDocument();
  });

  it("opens a file tab when clicking a file", () => {
    fireEvent.click(screen.getByText("package.json"));
    const tabs = screen.getAllByText("package.json");
    expect(tabs.length).toBeGreaterThanOrEqual(2);
  });

  it("shows status bar with file info", () => {
    expect(screen.getByText("main")).toBeInTheDocument();
    expect(screen.getByText("ready")).toBeInTheDocument();
    expect(screen.getByText("UTF-8")).toBeInTheDocument();
  });

  it("shows title bar branding", () => {
    expect(screen.getByText("✨ بيئة التطوير")).toBeInTheDocument();
  });
});
