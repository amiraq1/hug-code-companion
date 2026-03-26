import { describe, expect, it } from "vitest";
import { detectFileLanguage, getFileAccentClass, getFileMeta } from "@/lib/fileMeta";

describe("fileMeta", () => {
  it("classifies package manifests and lockfiles consistently", () => {
    expect(getFileMeta("package.json")).toMatchObject({
      kind: "package",
      language: "json",
    });
    expect(getFileMeta("pnpm-lock.yaml")).toMatchObject({
      kind: "package",
      language: "yaml",
    });
  });

  it("detects config-oriented filenames before generic extensions", () => {
    expect(getFileMeta("vite.config.ts")).toMatchObject({
      kind: "config",
      language: "typescript",
    });
    expect(getFileMeta(".env.local")).toMatchObject({
      kind: "config",
      language: "shell",
    });
    expect(getFileMeta("docker-compose.yml")).toMatchObject({
      kind: "config",
      language: "yaml",
    });
  });

  it("preserves richer categories for content files", () => {
    expect(getFileMeta("hero.png")).toMatchObject({
      kind: "image",
      language: "plaintext",
    });
    expect(getFileMeta("schema.sql")).toMatchObject({
      kind: "database",
      language: "sql",
    });
    expect(getFileMeta("notes.txt")).toMatchObject({
      kind: "text",
      language: "plaintext",
    });
  });

  it("lets explicit language rescue extensionless files", () => {
    expect(detectFileLanguage("Dockerfile", "dockerfile")).toBe("dockerfile");
    expect(getFileMeta("custom-file", "typescript").kind).toBe("typescript");
  });

  it("exposes stable accent classes for UI consumers", () => {
    expect(getFileAccentClass("README.md")).toBe("text-foreground/60");
    expect(getFileAccentClass("script.sh")).toBe("text-ide-success");
  });
});
