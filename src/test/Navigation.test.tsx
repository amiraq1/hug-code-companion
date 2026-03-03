import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Test the navigation flow by rendering Index and simulating screen changes
// We mock heavy components to focus on navigation logic

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
  GitHubError: class extends Error { type: string; constructor(m: string, t: string) { super(m); this.type = t; } },
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: () => ({
    status: "unauthenticated",
    username: null,
    sessionId: "test-session",
    error: null,
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
  NotificationHub: () => <div data-testid="notification-hub" />,
}));

// Import after mocks
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

describe("App Navigation", () => {
  it("starts on login screen", () => {
    renderIndex();
    expect(screen.getByText("مرحباً")).toBeInTheDocument();
    expect(screen.getByText("تسجيل الدخول عبر GitHub")).toBeInTheDocument();
  });

  it("navigates to editor when Continue without GitHub is clicked", () => {
    renderIndex();
    fireEvent.click(screen.getByText("المتابعة بدون GitHub"));
    // Should see editor elements
    expect(screen.getByText("Explorer")).toBeInTheDocument();
  });

  it("shows settings screen when settings is clicked from editor", async () => {
    renderIndex();
    // Go to editor first
    fireEvent.click(screen.getByText("المتابعة بدون GitHub"));
    // Click settings
    fireEvent.click(screen.getByTitle("Settings"));
    expect(await screen.findByText("Settings")).toBeInTheDocument();
    expect(await screen.findByText("Font Size")).toBeInTheDocument();
  });

  it("returns to editor from settings", async () => {
    renderIndex();
    fireEvent.click(screen.getByText("المتابعة بدون GitHub"));
    fireEvent.click(screen.getByTitle("Settings"));
    await screen.findByText("Font Size");
    // Click back
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]); // ArrowLeft button
    expect(await screen.findByText("Explorer")).toBeInTheDocument();
  });

  it("navigates to repos screen from editor", async () => {
    renderIndex();
    fireEvent.click(screen.getByText("المتابعة بدون GitHub"));
    fireEvent.click(screen.getByTitle("Repositories"));
    expect(await screen.findByText("/ repositories")).toBeInTheDocument();
  });

  it("toggles sidebar visibility", () => {
    renderIndex();
    fireEvent.click(screen.getByText("المتابعة بدون GitHub"));
    expect(screen.getByText("Explorer")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Hide sidebar"));
    expect(screen.queryByText("Explorer")).not.toBeInTheDocument();
  });
});

describe("Editor Features", () => {
  beforeEach(() => {
    renderIndex();
    fireEvent.click(screen.getByText("المتابعة بدون GitHub"));
  });

  it("shows file tree with default files", () => {
    expect(screen.getByText("src")).toBeInTheDocument();
    expect(screen.getByText("package.json")).toBeInTheDocument();
    expect(screen.getByText("README.md")).toBeInTheDocument();
  });

  it("opens a file tab when clicking a file", () => {
    fireEvent.click(screen.getByText("package.json"));
    // Tab should appear
    const tabs = screen.getAllByText("package.json");
    expect(tabs.length).toBeGreaterThanOrEqual(2); // one in tree, one in tab bar
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
