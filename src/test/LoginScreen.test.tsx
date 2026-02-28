import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LoginScreen } from "@/components/screens/LoginScreen";

const mockConnect = vi.fn();
const mockClearError = vi.fn();
const mockRetry = vi.fn();

vi.mock("@/stores/authStore", () => ({
  useAuthStore: () => ({
    status: "unauthenticated",
    username: null,
    error: null,
    sessionId: "test-session",
    isAuthenticated: false,
    isLoading: false,
    connect: mockConnect,
    disconnect: vi.fn(),
    clearError: mockClearError,
    retry: mockRetry,
    checkStatus: vi.fn(),
  }),
}));

describe("LoginScreen", () => {
  it("renders the app branding", () => {
    render(<LoginScreen onContinue={() => {}} />);
    expect(screen.getByText("Hug")).toBeInTheDocument();
    expect(screen.getByText("Code")).toBeInTheDocument();
  });

  it("renders GitHub sign in button", () => {
    render(<LoginScreen onContinue={() => {}} />);
    expect(screen.getByRole("button", { name: /تسجيل الدخول عبر github/i })).toBeInTheDocument();
  });

  it("renders continue without GitHub button", () => {
    render(<LoginScreen onContinue={() => {}} />);
    expect(screen.getByRole("button", { name: /المتابعة بدون github/i })).toBeInTheDocument();
  });

  it("calls onContinue when Continue button is clicked", () => {
    const onContinue = vi.fn();
    render(<LoginScreen onContinue={onContinue} />);
    fireEvent.click(screen.getByRole("button", { name: /المتابعة بدون github/i }));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it("renders welcome heading", () => {
    render(<LoginScreen onContinue={() => {}} />);
    expect(screen.getByText("مرحباً")).toBeInTheDocument();
  });

  it("renders security badge", () => {
    render(<LoginScreen onContinue={() => {}} />);
    expect(screen.getByText(/OAuth 2\.0/)).toBeInTheDocument();
  });
});
