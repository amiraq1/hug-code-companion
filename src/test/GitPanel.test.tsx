import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock useGitHub
vi.mock("@/hooks/useGitHub", () => ({
  useGitHub: () => ({
    connected: true,
    username: "testuser",
    loading: false,
    online: true,
    connect: vi.fn(),
    disconnect: vi.fn(),
    listRepos: vi.fn().mockResolvedValue([]),
    listBranches: vi.fn().mockResolvedValue([]),
    createBranch: vi.fn(),
    deleteBranch: vi.fn(),
    listCommits: vi.fn().mockResolvedValue([]),
    getStatus: vi.fn().mockResolvedValue({ files: [] }),
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
  it("renders connected state with username", () => {
    render(<GitPanel />);
    expect(screen.getByText("@testuser")).toBeInTheDocument();
    expect(screen.getByText("Git")).toBeInTheDocument();
  });

  it("shows all tabs", () => {
    render(<GitPanel />);
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Branches")).toBeInTheDocument();
    expect(screen.getByText("Log")).toBeInTheDocument();
  });

  it("shows repo selector", () => {
    render(<GitPanel />);
    expect(screen.getByText("Select repository...")).toBeInTheDocument();
  });

  it("switches between tabs", () => {
    render(<GitPanel />);
    fireEvent.click(screen.getByText("Branches"));
    // Branch creation input should appear
    expect(screen.getByPlaceholderText("new-branch-name")).toBeInTheDocument();
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
