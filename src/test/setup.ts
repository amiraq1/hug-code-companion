import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock scrollIntoView for jsdom
Element.prototype.scrollIntoView = () => {};

// Mock crypto.randomUUID
if (!crypto.randomUUID) {
  Object.defineProperty(crypto, "randomUUID", {
    value: () => "test-session-uuid-1234",
  });
}

// Mock import.meta.env
Object.defineProperty(import.meta, "env", {
  value: {
    VITE_SUPABASE_PROJECT_ID: "test-project",
    VITE_SUPABASE_PUBLISHABLE_KEY: "test-key",
  },
  writable: true,
});
