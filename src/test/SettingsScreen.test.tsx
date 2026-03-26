import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { SettingsScreen } from "@/components/screens/SettingsScreen";
import { DEFAULT_EDITOR_SETTINGS } from "@/components/screens/settings.types";

vi.mock("@/hooks/useGitHub", () => ({
  useGitHub: () => ({
    connected: true,
    username: "testuser",
    loading: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    listRepos: vi.fn(),
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
}));

describe("SettingsScreen", () => {
  const defaultProps = {
    onBack: vi.fn(),
    editorSettings: DEFAULT_EDITOR_SETTINGS,
    onSettingsChange: vi.fn(),
  };

  it("renders the settings shell", () => {
    render(<SettingsScreen {...defaultProps} />);
    expect(screen.getByText("Preferences")).toBeInTheDocument();
    expect(screen.getAllByText("Settings").length).toBeGreaterThan(0);
  });

  it("renders editor controls by default", () => {
    render(<SettingsScreen {...defaultProps} />);
    expect(screen.getByText("Workspace control")).toBeInTheDocument();
    expect(screen.getAllByText("Font Size").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tab Size").length).toBeGreaterThan(0);
    expect(screen.getByText("Word Wrap")).toBeInTheDocument();
  });

  it("switches to GitHub tab", () => {
    render(<SettingsScreen {...defaultProps} />);
    fireEvent.click(screen.getAllByText("GitHub")[0]);
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("@testuser")).toBeInTheDocument();
  });

  it("switches to About tab", () => {
    render(<SettingsScreen {...defaultProps} />);
    fireEvent.click(screen.getByText("About"));
    expect(screen.getByText("Version")).toBeInTheDocument();
    expect(screen.getByText("1.0.0")).toBeInTheDocument();
    expect(screen.getByText("Monaco Editor")).toBeInTheDocument();
  });

  it("calls onBack when back button is clicked", () => {
    const onBack = vi.fn();
    render(<SettingsScreen {...defaultProps} onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("displays current font size", () => {
    render(<SettingsScreen {...defaultProps} />);
    expect(screen.getByText("13")).toBeInTheDocument();
  });

  it("calls onSettingsChange when font size + is clicked", () => {
    const onSettingsChange = vi.fn();
    render(<SettingsScreen {...defaultProps} onSettingsChange={onSettingsChange} />);
    fireEvent.click(screen.getByText("+"));
    expect(onSettingsChange).toHaveBeenCalledWith(expect.objectContaining({ fontSize: 14 }));
  });

  it("calls onSettingsChange when font size - is clicked", () => {
    const onSettingsChange = vi.fn();
    render(<SettingsScreen {...defaultProps} onSettingsChange={onSettingsChange} />);
    fireEvent.click(screen.getByText("-"));
    expect(onSettingsChange).toHaveBeenCalledWith(expect.objectContaining({ fontSize: 12 }));
  });

  it("renders all three tab buttons", () => {
    render(<SettingsScreen {...defaultProps} />);
    expect(screen.getAllByText("Editor").length).toBeGreaterThan(0);
    expect(screen.getAllByText("GitHub").length).toBeGreaterThan(0);
    expect(screen.getByText("About")).toBeInTheDocument();
  });

  it("renders Disconnect button on GitHub tab when connected", () => {
    render(<SettingsScreen {...defaultProps} />);
    fireEvent.click(screen.getAllByText("GitHub")[0]);
    expect(screen.getByText("Disconnect")).toBeInTheDocument();
  });
});
