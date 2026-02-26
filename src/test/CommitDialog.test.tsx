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
    expect(screen.getByText(/test\.ts/)).toBeInTheDocument();
  });

  it("renders commit message input", () => {
    render(<CommitDialog {...defaultProps} />);
    expect(screen.getByPlaceholderText(/commit message/i)).toBeInTheDocument();
  });

  it("calls onClose when cancel is clicked", () => {
    render(<CommitDialog {...defaultProps} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(defaultProps.onClose).toHaveBeenCalledOnce();
  });

  it("commit button is disabled when message is empty", () => {
    render(<CommitDialog {...defaultProps} />);
    const commitBtn = screen.getByText(/commit.*push/i).closest("button");
    expect(commitBtn).toBeDisabled();
  });

  it("calls onCommit with message when form is submitted", async () => {
    const onCommit = vi.fn().mockResolvedValue(undefined);
    render(<CommitDialog {...defaultProps} onCommit={onCommit} />);
    
    const input = screen.getByPlaceholderText(/commit message/i);
    fireEvent.change(input, { target: { value: "test commit" } });
    
    const commitBtn = screen.getByText(/commit.*push/i).closest("button");
    expect(commitBtn).not.toBeDisabled();
    
    await act(async () => {
      fireEvent.click(commitBtn!);
    });
    
    expect(onCommit).toHaveBeenCalledWith("test commit");
  });
});
