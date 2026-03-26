import { describe, it, expect } from "vitest";
import {
  DEFAULT_FILES,
  flattenFiles,
  getFileIcon,
  type FileNode,
} from "@/stores/editorStore";

describe("editorStore", () => {
  describe("flattenFiles", () => {
    it("returns empty array for empty input", () => {
      expect(flattenFiles([])).toEqual([]);
    });

    it("extracts only files, not folders", () => {
      const files = flattenFiles(DEFAULT_FILES);
      files.forEach((f) => {
        expect(f.type).toBe("file");
      });
    });

    it("flattens nested structure correctly", () => {
      const tree: FileNode[] = [
        {
          name: "root",
          path: "root",
          type: "folder",
          children: [
            { name: "a.ts", path: "root/a.ts", type: "file", language: "typescript" },
            {
              name: "sub",
              path: "root/sub",
              type: "folder",
              children: [
                { name: "b.ts", path: "root/sub/b.ts", type: "file", language: "typescript" },
              ],
            },
          ],
        },
        { name: "c.json", path: "c.json", type: "file", language: "json" },
      ];
      const flat = flattenFiles(tree);
      expect(flat).toHaveLength(3);
      expect(flat.map((f) => f.path)).toEqual(["root/a.ts", "root/sub/b.ts", "c.json"]);
    });

    it("includes all default files", () => {
      const files = flattenFiles(DEFAULT_FILES);
      expect(files.length).toBeGreaterThanOrEqual(4);
      // Check known files exist
      const paths = files.map((f) => f.path);
      expect(paths).toContain("src/App.tsx");
      expect(paths).toContain("package.json");
      expect(paths).toContain("README.md");
    });

    it("preserves content in flattened files", () => {
      const files = flattenFiles(DEFAULT_FILES);
      const appFile = files.find((f) => f.path === "src/App.tsx");
      expect(appFile).toBeDefined();
      expect(appFile?.content).toBeTruthy();
      expect(appFile?.content?.length).toBeGreaterThan(0);
    });
  });

  describe("getFileIcon", () => {
    it("returns typescript for .ts files", () => {
      expect(getFileIcon("index.ts")).toBe("typescript");
    });

    it("returns typescript for .tsx files", () => {
      expect(getFileIcon("App.tsx")).toBe("typescript");
    });

    it("returns package for package manifests", () => {
      expect(getFileIcon("package.json")).toBe("package");
    });

    it("returns markdown for .md files", () => {
      expect(getFileIcon("README.md")).toBe("markdown");
    });

    it("returns styles for .css files", () => {
      expect(getFileIcon("styles.css")).toBe("styles");
    });

    it("returns html for .html files", () => {
      expect(getFileIcon("index.html")).toBe("markup");
    });

    it("returns refined kinds for common non-code files", () => {
      expect(getFileIcon("data.txt")).toBe("text");
      expect(getFileIcon("config.yml")).toBe("yaml");
      expect(getFileIcon("package-lock.json")).toBe("package");
      expect(getFileIcon(".gitignore")).toBe("git");
      expect(getFileIcon("noext")).toBe("file");
    });
  });

  describe("DEFAULT_FILES structure", () => {
    it("has src folder at root", () => {
      const srcFolder = DEFAULT_FILES.find((f) => f.name === "src");
      expect(srcFolder).toBeDefined();
      expect(srcFolder?.type).toBe("folder");
      expect(srcFolder?.children).toBeDefined();
      expect(srcFolder?.children?.length).toBeGreaterThan(0);
    });

    it("has package.json at root", () => {
      const pkg = DEFAULT_FILES.find((f) => f.name === "package.json");
      expect(pkg).toBeDefined();
      expect(pkg?.type).toBe("file");
      expect(pkg?.language).toBe("json");
    });

    it("has README.md at root", () => {
      const readme = DEFAULT_FILES.find((f) => f.name === "README.md");
      expect(readme).toBeDefined();
      expect(readme?.language).toBe("markdown");
    });

    it("all files have valid paths", () => {
      const files = flattenFiles(DEFAULT_FILES);
      files.forEach((f) => {
        expect(f.path).toBeTruthy();
        expect(f.path.length).toBeGreaterThan(0);
      });
    });

    it("all files have language set", () => {
      const files = flattenFiles(DEFAULT_FILES);
      files.forEach((f) => {
        expect(f.language).toBeTruthy();
      });
    });
  });
});
