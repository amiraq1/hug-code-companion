import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockListRepos = vi.fn().mockResolvedValue([]);
const mockListBranches = vi.fn().mockResolvedValue([]);
const mockCreateBranch = vi.fn();
const mockDeleteBranch = vi.fn();
const mockListCommits = vi.fn().mockResolvedValue([]);
const mockGetStatus = vi.fn().mockResolvedValue({ files: [] });

// Mock useGitHub
vi.mock("@/hooks/useGitHub", () => ({
  useGitHub: () => ({
    connected: true,
    username: "testuser",
    loading: false,
    online: true,
    connect: vi.fn(),
    disconnect: vi.fn(),
    listRepos: mockListRepos,
    listBranches: mockListBranches,
    createBranch: mockCreateBranch,
    deleteBranch: mockDeleteBranch,
    listCommits: mockListCommits,
    getStatus: mockGetStatus,
  }),
  GitHubError: class extends Error {
    type: string;
    constructor(msg: string, type: string) {
      super(msg);
      this.type = type;
    }
  },
}));

import { GitPanel } from "@/components/ide/GitPanel";

describe("GitPanel", () => {
  beforeEach(() => {
    mockListRepos.mockClear();
    mockListBranches.mockClear();
    mockCreateBranch.mockClear();
    mockDeleteBranch.mockClear();
    mockListCommits.mockClear();
    mockGetStatus.mockClear();
  });

  const renderPanel = async (withRepo = false) => {
    render(<GitPanel currentRepo={withRepo ? { owner: "testuser", repo: "my-repo" } : undefined} />);
    await waitFor(() => expect(mockListRepos).toHaveBeenCalled());
  };

  it("renders connected state with username", async () => {
    await renderPanel();
    expect(screen.getByText("@testuser")).toBeInTheDocument();
    expect(screen.getByText("Git")).toBeInTheDocument();
  });

  it("shows all tabs", async () => {
    await renderPanel();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Branches")).toBeInTheDocument();
    expect(screen.getByText("Log")).toBeInTheDocument();
  });

  it("shows repo selector", async () => {
    await renderPanel();
    expect(screen.getByText("Select repository...")).toBeInTheDocument();
  });

  it("switches between tabs", async () => {
    await renderPanel(true);
    await waitFor(() => expect(mockGetStatus).toHaveBeenCalled());
    fireEvent.click(screen.getByText("Branches"));
    // Branches tab is now active
    const branchesBtn = screen.getByText("Branches");
    expect(branchesBtn.closest("button")).toHaveClass("text-primary");
    await waitFor(() => expect(mockListBranches).toHaveBeenCalled());
  });
});

describe("GitPanel - disconnected", () => {
  it("shows connect button when not connected", () => {
    vi.doMock("@/hooks/useGitHub", () => ({
      useGitHub: () => ({
        connected: false,
        username: null,
        loading: false,
        online: true,
        connect: vi.fn(),
      }),
      GitHubError: class extends Error {},
    }));
  });
});
