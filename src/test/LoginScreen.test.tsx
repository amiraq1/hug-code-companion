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
    mockUseAuthStore.mockReturnValue({ ...baseStore, connect: vi.fn() });
  });

  it("renders the app branding", () => {
    render(<LoginScreen onContinue={() => {}} />);
    expect(screen.getByText("Hug")).toBeInTheDocument();
    expect(screen.getByText("Code")).toBeInTheDocument();
  });

  it("renders sign in button when not authenticated", () => {
    render(<LoginScreen onContinue={() => {}} />);
    expect(screen.getByText("تسجيل الدخول عبر GitHub")).toBeInTheDocument();
  });

  it("renders continue without GitHub button", () => {
    render(<LoginScreen onContinue={() => {}} />);
    expect(screen.getByText("المتابعة بدون GitHub")).toBeInTheDocument();
  });

  it("calls onContinue when continue button is clicked", () => {
    const onContinue = vi.fn();
    render(<LoginScreen onContinue={onContinue} />);
    fireEvent.click(screen.getByText("المتابعة بدون GitHub"));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it("renders Arabic welcome heading", () => {
    render(<LoginScreen onContinue={() => {}} />);
    expect(screen.getByText("مرحباً")).toBeInTheDocument();
  });

  it("renders security badge", () => {
    render(<LoginScreen onContinue={() => {}} />);
    expect(screen.getByText(/OAuth 2.0/)).toBeInTheDocument();
  });
});
