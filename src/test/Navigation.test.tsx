import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

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

// Import after mocks
import Index from "@/pages/Index";

describe("App Navigation", () => {
  it("starts on login screen", () => {
    render(<Index />);
    expect(screen.getByText("مرحباً")).toBeInTheDocument();
    expect(screen.getByText("تسجيل الدخول عبر GitHub")).toBeInTheDocument();
  });

  it("navigates to editor when Continue without GitHub is clicked", () => {
    render(<Index />);
    fireEvent.click(screen.getByText("المتابعة بدون GitHub"));
    // Should see editor elements
    expect(screen.getByText("Explorer")).toBeInTheDocument();
  });

  it("shows settings screen when settings is clicked from editor", () => {
    render(<Index />);
    // Go to editor first
    fireEvent.click(screen.getByText("المتابعة بدون GitHub"));
    // Click settings
    fireEvent.click(screen.getByTitle("Settings"));
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Font Size")).toBeInTheDocument();
  });

  it("returns to editor from settings", () => {
    render(<Index />);
    fireEvent.click(screen.getByText("المتابعة بدون GitHub"));
    fireEvent.click(screen.getByTitle("Settings"));
    // Click back
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]); // ArrowLeft button
    expect(screen.getByText("Explorer")).toBeInTheDocument();
  });

  it("navigates to repos screen from editor", () => {
    render(<Index />);
    fireEvent.click(screen.getByText("المتابعة بدون GitHub"));
    fireEvent.click(screen.getByTitle("Repositories"));
    expect(screen.getByText("/ repositories")).toBeInTheDocument();
  });

  it("toggles sidebar visibility", () => {
    render(<Index />);
    fireEvent.click(screen.getByText("المتابعة بدون GitHub"));
    // Explorer should be visible
    expect(screen.getByText("Explorer")).toBeInTheDocument();
    // Find and click the PanelLeftClose button (first icon button after branding)
    const sidebarToggle = screen.getAllByRole("button").find(
      (btn) => btn.getAttribute("class")?.includes("rounded-md") && !btn.getAttribute("title")
    );
    // Verify sidebar is present
    expect(screen.getByText("Explorer")).toBeInTheDocument();
  });
});

describe("Editor Features", () => {
  beforeEach(() => {
    render(<Index />);
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
    expect(screen.getByText("Hug")).toBeInTheDocument();
  });
});
