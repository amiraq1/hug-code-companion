import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LoginScreen } from "@/components/screens/LoginScreen";

// Mock useGitHub
vi.mock("@/hooks/useGitHub", () => ({
  useGitHub: () => ({
    connected: false,
    username: null,
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

describe("LoginScreen", () => {
  it("renders the app branding", () => {
    render(<LoginScreen onContinue={() => {}} />);
    expect(screen.getByText("code")).toBeInTheDocument();
    expect(screen.getByText("agent")).toBeInTheDocument();
  });

  it("renders Sign in with GitHub button when not connected", () => {
    render(<LoginScreen onContinue={() => {}} />);
    expect(screen.getByText("Sign in with GitHub")).toBeInTheDocument();
  });

  it("renders Continue without GitHub button", () => {
    render(<LoginScreen onContinue={() => {}} />);
    expect(screen.getByText("Continue without GitHub")).toBeInTheDocument();
  });

  it("calls onContinue when Continue button is clicked", () => {
    const onContinue = vi.fn();
    render(<LoginScreen onContinue={onContinue} />);
    fireEvent.click(screen.getByText("Continue without GitHub"));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it("renders Welcome heading", () => {
    render(<LoginScreen onContinue={() => {}} />);
    expect(screen.getByText("Welcome")).toBeInTheDocument();
  });

  it("renders version info", () => {
    render(<LoginScreen onContinue={() => {}} />);
    expect(screen.getByText(/v1\.0\.0/)).toBeInTheDocument();
  });
});
