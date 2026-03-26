import { useCallback, useRef, useState, useEffect } from "react";
import { marked } from "marked";
import type { FileNode } from "@/stores/editorStore";
import { detectFileLanguage } from "@/lib/fileMeta";
import { sanitizePreviewDocument, sanitizePreviewFragment } from "@/lib/previewSecurity";

export interface PreviewError {
  message: string;
  line?: number;
  col?: number;
  source?: string;
  timestamp: Date;
}

export function usePreview() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [errors, setErrors] = useState<PreviewError[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [scriptExecutionEnabled, setScriptExecutionEnabled] = useState(false);
  const lastInjectedRef = useRef<string>("");

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const previewWindow = iframeRef.current?.contentWindow;
      if (!previewWindow || event.source !== previewWindow || typeof event.data !== "object" || event.data === null) {
        return;
      }

      if (event.data?.type === "preview-error") {
        setErrors((prev) => [
          ...prev.slice(-19),
          {
            message: event.data.message,
            line: event.data.line,
            col: event.data.col,
            source: event.data.source,
            timestamp: new Date(),
          },
        ]);
      }

      if (event.data?.type === "preview-warning") {
        setWarnings((prev) => [...prev.slice(-19), event.data.message]);
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
    setWarnings([]);
  }, []);

  const toggleScriptExecution = useCallback(() => {
    clearErrors();
    setScriptExecutionEnabled((enabled) => !enabled);
  }, [clearErrors]);

  const buildHTMLDocument = useCallback(
    (file: FileNode): string => {
      const lang = file.language || "";
      const content = file.content || "";
      const resolvedLanguage = detectFileLanguage(file.name, lang);

      if (resolvedLanguage === "markdown") {
        const html = marked.parse(content, { async: false }) as string;
        return wrapInDocument(
          `<article class="markdown-body">${sanitizePreviewFragment(html)}</article>`,
          getMarkdownStyles()
        );
      }

      if (resolvedLanguage === "json") {
        try {
          const parsed = JSON.parse(content);
          const formatted = JSON.stringify(parsed, null, 2);
          return wrapInDocument(
            `<pre class="json-view"><code>${escapeHtml(formatted)}</code></pre>`,
            getJsonStyles()
          );
        } catch (error: unknown) {
          return wrapInDocument(
            `<div class="json-error">
              <span class="error-icon">⚠</span>
              <span>Invalid JSON: ${escapeHtml((error as Error).message)}</span>
            </div>
            <pre class="json-raw"><code>${escapeHtml(content)}</code></pre>`,
            getJsonStyles()
          );
        }
      }

      if (resolvedLanguage === "html") {
        if (!scriptExecutionEnabled) {
          return sanitizePreviewDocument(content);
        }

        return injectBridge(content);
      }

      if (resolvedLanguage === "css") {
        return wrapInDocument(
          `<div class="css-demo">
            <h2>CSS Preview</h2>
            <div class="demo-box">Demo Element</div>
            <button class="demo-btn">Button</button>
            <input class="demo-input" placeholder="Input field" />
            <p class="demo-text">Sample paragraph text for styling preview.</p>
          </div>`,
          content
        );
      }

      if (resolvedLanguage === "javascript") {
        if (!scriptExecutionEnabled) {
          return wrapInDocument(
            `<div class="ts-hint">
              <strong>Safe preview:</strong> JavaScript execution is disabled.
              Enable scripts explicitly to run this file.
            </div>
            <pre class="source-view"><code>${escapeHtml(content)}</code></pre>`,
            getTypeScriptStyles()
          );
        }

        return wrapInDocument(
          `<div id="output" class="js-output"></div>`,
          getJsStyles(),
          buildJsRunner(content),
          { enableBridge: true }
        );
      }

      if (resolvedLanguage === "typescript") {
        return wrapInDocument(
          `<div class="ts-hint">
            <strong>TypeScript preview note:</strong> direct execution is disabled.
            Use build/runtime toolchain (Vite) for TS/TSX files.
          </div>
          <pre class="source-view"><code>${escapeHtml(content)}</code></pre>`,
          getTypeScriptStyles()
        );
      }

      return wrapInDocument(
        `<pre class="source-view"><code>${escapeHtml(content)}</code></pre>`,
        getSourceStyles()
      );
    },
    [scriptExecutionEnabled]
  );

  const injectPreview = useCallback(
    (file: FileNode | null) => {
      if (!file || !iframeRef.current) return;

      const html = buildHTMLDocument(file);
      if (html === lastInjectedRef.current) return;

      lastInjectedRef.current = html;
      iframeRef.current.srcdoc = html;
    },
    [buildHTMLDocument]
  );

  const injectCSS = useCallback((css: string) => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const document = iframe.contentDocument;
    if (!document) return;

    let styleElement = document.getElementById("live-injected-css") as HTMLStyleElement | null;
    if (!styleElement) {
      styleElement = document.createElement("style");
      styleElement.id = "live-injected-css";
      document.head.appendChild(styleElement);
    }

    styleElement.textContent = css;
  }, []);

  const injectJS = useCallback(
    (js: string) => {
      if (!scriptExecutionEnabled) {
        setWarnings((prev) => [...prev.slice(-19), "Script execution is disabled in safe preview."]);
        return;
      }

      iframeRef.current?.contentWindow?.postMessage({ type: "exec-js", code: js }, "*");
    },
    [scriptExecutionEnabled]
  );

  const zoomIn = useCallback(() => setZoom((value) => Math.min(value + 10, 200)), []);
  const zoomOut = useCallback(() => setZoom((value) => Math.max(value - 10, 30)), []);
  const resetZoom = useCallback(() => setZoom(100), []);
  const toggleFullscreen = useCallback(() => setIsFullscreen((value) => !value), []);

  return {
    iframeRef,
    zoom,
    isFullscreen,
    errors,
    warnings,
    scriptExecutionEnabled,
    clearErrors,
    injectPreview,
    injectCSS,
    injectJS,
    zoomIn,
    zoomOut,
    resetZoom,
    toggleFullscreen,
    toggleScriptExecution,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function injectBridge(html: string): string {
  const bridge = `
<script>
window.addEventListener("error", function(event) {
  window.parent.postMessage({
    type: "preview-error",
    message: event.message,
    line: event.lineno,
    col: event.colno,
    source: event.filename
  }, "*");
});
window.addEventListener("message", function(event) {
  if (event.source !== window.parent || typeof event.data !== "object" || event.data === null) return;
  if (event.data?.type === "exec-js") {
    try { eval(event.data.code); }
    catch (error) {
      window.parent.postMessage({ type: "preview-error", message: String(error) }, "*");
    }
  }
});
const originalLog = console.log;
console.log = function(...args) {
  originalLog.apply(console, args);
  window.parent.postMessage({
    type: "preview-console",
    message: args.map((arg) => typeof arg === "object" ? JSON.stringify(arg) : String(arg)).join(" ")
  }, "*");
};
console.warn = function(...args) {
  window.parent.postMessage({ type: "preview-warning", message: args.join(" ") }, "*");
};
</script>`;

  if (html.includes("</head>")) {
    return html.replace("</head>", `${bridge}</head>`);
  }

  return `${bridge}${html}`;
}

function wrapInDocument(
  body: string,
  css = "",
  js = "",
  options: { enableBridge?: boolean } = {}
): string {
  const bridge = options.enableBridge
    ? `<script>
window.addEventListener("error", function(event) {
  window.parent.postMessage({ type: "preview-error", message: event.message, line: event.lineno, col: event.colno, source: event.filename }, "*");
});
window.addEventListener("message", function(event) {
  if (event.source !== window.parent || typeof event.data !== "object" || event.data === null) return;
  if (event.data?.type === "exec-js") {
    try { eval(event.data.code); }
    catch (error) { window.parent.postMessage({ type: "preview-error", message: String(error) }, "*"); }
  }
});
console.log = function(...args) {
  window.parent.postMessage({ type: "preview-console", message: args.map((value) => typeof value === "object" ? JSON.stringify(value) : String(value)).join(" ") }, "*");
};
console.warn = function(...args) {
  window.parent.postMessage({ type: "preview-warning", message: args.join(" ") }, "*");
};
</script>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{
  font-family:'IBM Plex Mono','SF Mono',monospace;
  background:#0d0d0d;
  color:#e0e0e0;
  padding:20px;
  line-height:1.6;
}
${css}
</style>
${bridge}
</head>
<body>
${body}
${js ? `<script type="module">${js}</script>` : ""}
</body>
</html>`;
}

function buildJsRunner(code: string): string {
  const safeCode = escapeClosingScriptTag(code);

  return `
  const output = document.getElementById("output");
  const originalLog = console.log;
  console.log = function(...args) {
    originalLog.apply(console, args);
    const line = document.createElement("div");
    line.className = "log-line";
    line.textContent = args.map((arg) => typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)).join(" ");
    if (output) output.appendChild(line);
  };
  const originalError = console.error;
  console.error = function(...args) {
    originalError.apply(console, args);
    const line = document.createElement("div");
    line.className = "log-line error";
    line.textContent = "Error: " + args.join(" ");
    if (output) output.appendChild(line);
  };
  window.addEventListener("error", function(event) {
    if (output) {
      const line = document.createElement("div");
      line.className = "log-line error";
      line.textContent = "Error: " + event.message;
      output.appendChild(line);
    }
  });
  ${safeCode}
  `;
}

function escapeClosingScriptTag(code: string): string {
  return code.replace(/<\/script/gi, "<\\/script");
}

function getMarkdownStyles(): string {
  return `
.markdown-body{max-width:720px;margin:0 auto;color:#d4d4d4}
.markdown-body h1,.markdown-body h2,.markdown-body h3{color:#f0f0f0;margin:1.2em 0 0.4em;font-weight:600}
.markdown-body h1{font-size:2em;border-bottom:1px solid #333;padding-bottom:0.3em}
.markdown-body h2{font-size:1.5em}
.markdown-body p{margin:0.6em 0}
.markdown-body code{background:#1a1a1a;padding:2px 6px;border-radius:4px;font-size:0.9em;color:#c8a46e}
.markdown-body pre{background:#111;padding:16px;border-radius:8px;overflow-x:auto;border:1px solid #222}
.markdown-body pre code{background:none;padding:0}
.markdown-body a{color:#c8a46e}
.markdown-body ul,.markdown-body ol{padding-left:1.5em;margin:0.6em 0}
.markdown-body blockquote{border-left:3px solid #c8a46e;padding-left:12px;color:#999;margin:0.8em 0}
.markdown-body img{max-width:100%;border-radius:8px}
.markdown-body table{border-collapse:collapse;width:100%;margin:1em 0}
.markdown-body th,.markdown-body td{border:1px solid #333;padding:8px 12px;text-align:left}
.markdown-body th{background:#1a1a1a}
`;
}

function getJsonStyles(): string {
  return `
.json-view{background:#111;padding:20px;border-radius:8px;border:1px solid #222;overflow-x:auto}
.json-view code{color:#c8a46e;font-size:13px}
.json-error{background:#2a1010;border:1px solid #5a2020;padding:12px 16px;border-radius:8px;display:flex;align-items:center;gap:8px;margin-bottom:12px;color:#e88}
.error-icon{font-size:1.2em}
.json-raw{background:#111;padding:16px;border-radius:8px;border:1px solid #222}
.json-raw code{color:#888;font-size:13px}
`;
}

function getJsStyles(): string {
  return `
.js-output{font-size:13px}
.log-line{padding:6px 10px;border-bottom:1px solid #1a1a1a;white-space:pre-wrap;word-break:break-all}
.log-line.error{color:#e88;background:#1a0808}
`;
}

function getSourceStyles(): string {
  return `
.source-view{background:#111;padding:20px;border-radius:8px;border:1px solid #222;overflow-x:auto}
.source-view code{color:#a0a0a0;font-size:13px}
`;
}

function getTypeScriptStyles(): string {
  return `
.ts-hint{
  background:#1b2a38;
  color:#9cc8ec;
  border:1px solid #2f4f68;
  border-radius:8px;
  padding:12px 14px;
  margin-bottom:12px;
  font-size:12px;
}
.source-view{background:#111;padding:20px;border-radius:8px;border:1px solid #222;overflow-x:auto}
.source-view code{color:#a0a0a0;font-size:13px}
`;
}
