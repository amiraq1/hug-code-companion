import { describe, it, expect } from "vitest";
import { GitHubError } from "@/hooks/useGitHub";

describe("GitHubError", () => {
  it("creates error with type and status", () => {
    const err = new GitHubError("Auth failed", "auth", 401);
    expect(err.message).toBe("Auth failed");
    expect(err.type).toBe("auth");
    expect(err.status).toBe(401);
    expect(err.name).toBe("GitHubError");
  });

  it("creates network error without status", () => {
    const err = new GitHubError("No connection", "network");
    expect(err.type).toBe("network");
    expect(err.status).toBeUndefined();
  });

  it("is instance of Error", () => {
    const err = new GitHubError("test", "unknown");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(GitHubError);
  });
});

describe("Error types coverage", () => {
  const types = ["network", "auth", "rate_limit", "not_found", "server", "unknown"] as const;

  types.forEach((type) => {
    it(`handles ${type} error type`, () => {
      const err = new GitHubError(`Error: ${type}`, type);
      expect(err.type).toBe(type);
    });
  });
});
