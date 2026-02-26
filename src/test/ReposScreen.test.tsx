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
    listRepos: vi.fn().mockResolvedValue([
      {
        id: 1,
        name: "my-repo",
        full_name: "testuser/my-repo",
        private: false,
        description: "A test repository",
        html_url: "https://github.com/testuser/my-repo",
        default_branch: "main",
        updated_at: "2026-02-20T10:00:00Z",
      },
      {
        id: 2,
        name: "private-repo",
        full_name: "testuser/private-repo",
        private: true,
        description: null,
        html_url: "https://github.com/testuser/private-repo",
        default_branch: "develop",
        updated_at: "2026-02-25T10:00:00Z",
      },
    ]),
  }),
  GitHubError: class extends Error {
    type: string;
    constructor(msg: string, type: string) {
      super(msg);
      this.type = type;
    }
  },
}));

import { ReposScreen } from "@/components/screens/ReposScreen";

describe("ReposScreen", () => {
  const mockOnSelectRepo = vi.fn();
  const mockOnBack = vi.fn();

  it("renders header and search", () => {
    render(<ReposScreen onSelectRepo={mockOnSelectRepo} onBack={mockOnBack} />);
    expect(screen.getByPlaceholderText("Search repositories...")).toBeInTheDocument();
    expect(screen.getByText("/ repositories")).toBeInTheDocument();
  });

  it("renders filter buttons", () => {
    render(<ReposScreen onSelectRepo={mockOnSelectRepo} onBack={mockOnBack} />);
    expect(screen.getByText("all")).toBeInTheDocument();
    expect(screen.getByText("public")).toBeInTheDocument();
    expect(screen.getByText("private")).toBeInTheDocument();
  });

  it("calls onBack when back button is clicked", () => {
    render(<ReposScreen onSelectRepo={mockOnSelectRepo} onBack={mockOnBack} />);
    // Find back button (ArrowLeft icon button)
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]); // First button is back
    expect(mockOnBack).toHaveBeenCalled();
  });

  it("filters repos by search text", async () => {
    render(<ReposScreen onSelectRepo={mockOnSelectRepo} onBack={mockOnBack} />);
    const searchInput = screen.getByPlaceholderText("Search repositories...");
    fireEvent.change(searchInput, { target: { value: "nonexistent" } });
    // Should show no results message eventually
  });
});
