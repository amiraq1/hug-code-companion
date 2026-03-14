import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

function splitVendorChunks(id: string) {
  if (!id.includes("node_modules")) return undefined;

  if (
    id.includes("/react/") ||
    id.includes("/react-dom/") ||
    id.includes("/scheduler/")
  ) {
    return "vendor-react";
  }

  if (id.includes("@supabase/")) {
    return "vendor-supabase";
  }

  if (id.includes("@monaco-editor/") || id.includes("monaco-editor")) {
    return "vendor-monaco";
  }

  if (
    id.includes("react-markdown") ||
    id.includes("/remark-") ||
    id.includes("/rehype-") ||
    id.includes("/unified/")
  ) {
    return "vendor-markdown";
  }

  if (id.includes("recharts") || id.includes("/d3-")) {
    return "vendor-charts";
  }

  if (id.includes("framer-motion") || id.includes("/motion/")) {
    return "vendor-motion";
  }

  if (
    id.includes("@radix-ui/") ||
    id.includes("lucide-react") ||
    id.includes("sonner") ||
    id.includes("class-variance-authority") ||
    id.includes("tailwind-merge") ||
    id.includes("/clsx/")
  ) {
    return "vendor-ui";
  }

  return "vendor-misc";
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: splitVendorChunks,
      },
    },
  },
}));
