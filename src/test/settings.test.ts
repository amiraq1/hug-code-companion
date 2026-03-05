import { describe, it, expect } from "vitest";
import {
  DEFAULT_EDITOR_SETTINGS,
  type EditorSettings,
} from "@/components/screens/settings.types";

describe("EditorSettings", () => {
  describe("DEFAULT_EDITOR_SETTINGS", () => {
    it("has correct default fontSize", () => {
      expect(DEFAULT_EDITOR_SETTINGS.fontSize).toBe(13);
    });

    it("has correct default tabSize", () => {
      expect(DEFAULT_EDITOR_SETTINGS.tabSize).toBe(2);
    });

    it("has wordWrap enabled by default", () => {
      expect(DEFAULT_EDITOR_SETTINGS.wordWrap).toBe(true);
    });

    it("has lineNumbers enabled by default", () => {
      expect(DEFAULT_EDITOR_SETTINGS.lineNumbers).toBe(true);
    });

    it("has minimap enabled by default", () => {
      expect(DEFAULT_EDITOR_SETTINGS.minimap).toBe(true);
    });

    it("has bracketPairs enabled by default", () => {
      expect(DEFAULT_EDITOR_SETTINGS.bracketPairs).toBe(true);
    });

    it("has all expected keys", () => {
      const keys = Object.keys(DEFAULT_EDITOR_SETTINGS);
      expect(keys).toContain("fontSize");
      expect(keys).toContain("tabSize");
      expect(keys).toContain("wordWrap");
      expect(keys).toContain("lineNumbers");
      expect(keys).toContain("minimap");
      expect(keys).toContain("bracketPairs");
    });
  });

  describe("Settings mutation", () => {
    it("can create modified settings object", () => {
      const modified: EditorSettings = {
        ...DEFAULT_EDITOR_SETTINGS,
        fontSize: 16,
        tabSize: 4,
      };
      expect(modified.fontSize).toBe(16);
      expect(modified.tabSize).toBe(4);
      // Unchanged values
      expect(modified.wordWrap).toBe(true);
      expect(modified.minimap).toBe(true);
    });

    it("does not mutate defaults when spreading", () => {
      const modified = { ...DEFAULT_EDITOR_SETTINGS, fontSize: 20 };
      expect(DEFAULT_EDITOR_SETTINGS.fontSize).toBe(13);
      expect(modified.fontSize).toBe(20);
    });

    it("fontSize bounds are reasonable", () => {
      expect(DEFAULT_EDITOR_SETTINGS.fontSize).toBeGreaterThanOrEqual(10);
      expect(DEFAULT_EDITOR_SETTINGS.fontSize).toBeLessThanOrEqual(24);
    });

    it("tabSize is a valid indentation value", () => {
      expect([2, 4]).toContain(DEFAULT_EDITOR_SETTINGS.tabSize);
    });
  });
});
