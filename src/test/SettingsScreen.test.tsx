import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  SettingsScreen,
  DEFAULT_EDITOR_SETTINGS,
  type EditorSettings,
} from "@/components/screens/SettingsScreen";

// Mock useGitHub
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

  it("renders Settings header", () => {
    render(<SettingsScreen {...defaultProps} />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders Editor tab and its content by default", () => {
    render(<SettingsScreen {...defaultProps} />);
    // "Editor" appears as tab + heading
    expect(screen.getAllByText("Editor")).toHaveLength(2);
    expect(screen.getByText("Font Size")).toBeInTheDocument();
    expect(screen.getByText("Tab Size")).toBeInTheDocument();
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
    // The back button is the first button (ArrowLeft)
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);
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
    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({ fontSize: 14 })
    );
  });

  it("calls onSettingsChange when font size − is clicked", () => {
    const onSettingsChange = vi.fn();
    render(<SettingsScreen {...defaultProps} onSettingsChange={onSettingsChange} />);
    fireEvent.click(screen.getByText("−"));
    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({ fontSize: 12 })
    );
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
