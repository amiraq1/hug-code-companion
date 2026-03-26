import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { LoginScreen } from "@/components/screens/LoginScreen";

const mockUseAuthStore = vi.fn();

vi.mock("@/stores/authStore", () => ({
  useAuthStore: () => mockUseAuthStore(),
}));

describe("LoginScreen", () => {
  const baseStore = {
    status: "unauthenticated" as const,
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
  };

  beforeEach(() => {
    mockUseAuthStore.mockReturnValue({
      ...baseStore,
      connect: vi.fn(),
      clearError: vi.fn(),
      retry: vi.fn(),
    });
  });

  function getContinueWithoutGitHubButton() {
    const button = screen
      .getAllByRole("button")
      .find((candidate) => (candidate.textContent ?? "").includes("GitHub") && (candidate.textContent ?? "").includes("بدون"));

    if (!button) {
      throw new Error("Continue without GitHub button not found");
    }

    return button;
  }

  it("renders the app branding", () => {
    render(<LoginScreen onContinue={() => {}} />);
    expect(screen.getByText("AI-Powered Code Editor & GitHub IDE")).toBeInTheDocument();
    expect(screen.getByText("Session state")).toBeInTheDocument();
  });

  it("renders GitHub sign in button", () => {
    render(<LoginScreen onContinue={() => {}} />);
    expect(screen.getAllByRole("button").some((button) => (button.textContent ?? "").includes("GitHub"))).toBe(true);
  });

  it("renders continue without GitHub button", () => {
    render(<LoginScreen onContinue={() => {}} />);
    expect(getContinueWithoutGitHubButton()).toBeInTheDocument();
  });

  it("calls onContinue when continue button is clicked", () => {
    const onContinue = vi.fn();
    render(<LoginScreen onContinue={onContinue} />);
    fireEvent.click(getContinueWithoutGitHubButton());
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it("renders welcome heading", () => {
    render(<LoginScreen onContinue={() => {}} />);
    expect(screen.getByText("GitHub access")).toBeInTheDocument();
  });

  it("renders security badge", () => {
    render(<LoginScreen onContinue={() => {}} />);
    expect(screen.getByText(/OAuth 2\.0/)).toBeInTheDocument();
  });
});
