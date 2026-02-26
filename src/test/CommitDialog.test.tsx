import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { CommitDialog } from "@/components/ide/CommitDialog";

describe("CommitDialog", () => {
  const defaultProps = {
    filePath: "github:user/repo/src/test.ts",
    onCommit: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the file path", () => {
    render(<CommitDialog {...defaultProps} />);
    expect(screen.getByText("src/test.ts")).toBeInTheDocument();
  });

  it("renders commit message input", () => {
    render(<CommitDialog {...defaultProps} />);
    expect(screen.getByPlaceholderText("describe your changes...")).toBeInTheDocument();
  });

  it("calls onClose when cancel is clicked", () => {
    render(<CommitDialog {...defaultProps} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(defaultProps.onClose).toHaveBeenCalledOnce();
  });

  it("push button is disabled when message is empty", () => {
    render(<CommitDialog {...defaultProps} />);
    const pushBtn = screen.getByText("Push").closest("button");
    expect(pushBtn).toBeDisabled();
  });

  it("calls onCommit with message when form is submitted", async () => {
    const onCommit = vi.fn().mockResolvedValue(undefined);
    render(<CommitDialog {...defaultProps} onCommit={onCommit} />);
    
    const input = screen.getByPlaceholderText("describe your changes...");
    fireEvent.change(input, { target: { value: "test commit" } });
    
    const pushBtn = screen.getByText("Push").closest("button");
    expect(pushBtn).not.toBeDisabled();
    
    await act(async () => {
      fireEvent.click(pushBtn!);
    });
    
    expect(onCommit).toHaveBeenCalledWith("test commit");
  });

  it("shows repo info", () => {
    render(<CommitDialog {...defaultProps} />);
    expect(screen.getByText("user/repo")).toBeInTheDocument();
  });
});
