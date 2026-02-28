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

// Mock ResizeObserver for jsdom
if (!("ResizeObserver" in globalThis)) {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(globalThis, "ResizeObserver", {
    value: ResizeObserverMock,
    writable: true,
  });
}

// Mock crypto.randomUUID
if (!crypto.randomUUID) {
  Object.defineProperty(crypto, "randomUUID", {
    value: () => "test-session-uuid-1234",
  });
}

// Polyfill AbortSignal.timeout for environments that don't support it
if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout !== "function") {
  Object.defineProperty(AbortSignal, "timeout", {
    value: (ms: number) => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), ms);
      return controller.signal;
    },
    writable: true,
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
