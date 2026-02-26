import { useCallback, useRef, useState, useEffect } from "react";
import { marked } from "marked";
import type { FileNode } from "@/stores/editorStore";

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
  const lastInjectedRef = useRef<string>("");

  // Listen for messages from the iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "preview-error") {
        setErrors((prev) => [
          ...prev.slice(-19),
          {
            message: e.data.message,
            line: e.data.line,
            col: e.data.col,
            source: e.data.source,
            timestamp: new Date(),
          },
        ]);
      }
      if (e.data?.type === "preview-warning") {
        setWarnings((prev) => [...prev.slice(-19), e.data.message]);
      }
      if (e.data?.type === "preview-console") {
        // Could forward to a console panel
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
    setWarnings([]);
  }, []);

  const buildHTMLDocument = useCallback((file: FileNode): string => {
    const lang = file.language || "";
    const content = file.content || "";

    // Markdown preview
    if (lang === "markdown") {
      const html = marked.parse(content, { async: false }) as string;
      return wrapInDocument(
        `<article class="markdown-body">${html}</article>`,
        getMarkdownStyles()
      );
    }

    // JSON preview
    if (lang === "json") {
      try {
        const parsed = JSON.parse(content);
        const formatted = JSON.stringify(parsed, null, 2);
        return wrapInDocument(
          `<pre class="json-view"><code>${escapeHtml(formatted)}</code></pre>`,
          getJsonStyles()
        );
      } catch (e: unknown) {
        return wrapInDocument(
          `<div class="json-error">
            <span class="error-icon">⚠</span>
            <span>Invalid JSON: ${escapeHtml((e as Error).message)}</span>
          </div>
          <pre class="json-raw"><code>${escapeHtml(content)}</code></pre>`,
          getJsonStyles()
        );
      }
    }

    // HTML preview
    if (lang === "html") {
      return injectBridge(content);
    }

    // CSS preview
    if (lang === "css") {
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

    // TypeScript/JavaScript – execute
    if (lang === "typescript" || lang === "javascript") {
      return wrapInDocument(
        `<div id="output" class="js-output"></div>`,
        getJsStyles(),
        buildJsRunner(content)
      );
    }

    // Fallback: show source
    return wrapInDocument(
      `<pre class="source-view"><code>${escapeHtml(content)}</code></pre>`,
      getSourceStyles()
    );
  }, []);

  const injectPreview = useCallback(
    (file: FileNode | null) => {
      if (!file || !iframeRef.current) return;
      const html = buildHTMLDocument(file);

      // Skip if identical to last injection (prevents flicker)
      if (html === lastInjectedRef.current) return;
      lastInjectedRef.current = html;

      const iframe = iframeRef.current;
      const doc = iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
      }
    },
    [buildHTMLDocument]
  );

  const injectCSS = useCallback((css: string) => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;

    let styleEl = doc.getElementById("live-injected-css") as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = doc.createElement("style");
      styleEl.id = "live-injected-css";
      doc.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
  }, []);

  const injectJS = useCallback((js: string) => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    iframe.contentWindow?.postMessage({ type: "exec-js", code: js }, "*");
  }, []);

  const zoomIn = useCallback(() => setZoom((z) => Math.min(z + 10, 200)), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(z - 10, 30)), []);
  const resetZoom = useCallback(() => setZoom(100), []);
  const toggleFullscreen = useCallback(() => setIsFullscreen((f) => !f), []);

  return {
    iframeRef,
    zoom,
    isFullscreen,
    errors,
    warnings,
    clearErrors,
    injectPreview,
    injectCSS,
    injectJS,
    zoomIn,
    zoomOut,
    resetZoom,
    toggleFullscreen,
  };
}

// ── Helpers ──

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function injectBridge(html: string): string {
  const bridge = `
<script>
window.addEventListener("error", function(e) {
  window.parent.postMessage({
    type: "preview-error",
    message: e.message,
    line: e.lineno,
    col: e.colno,
    source: e.filename
  }, "*");
});
window.addEventListener("message", function(e) {
  if (e.data?.type === "exec-js") {
    try { eval(e.data.code); }
    catch(err) {
      window.parent.postMessage({
        type: "preview-error",
        message: String(err)
      }, "*");
    }
  }
});
const _origLog = console.log;
console.log = function(...args) {
  _origLog.apply(console, args);
  window.parent.postMessage({
    type: "preview-console",
    message: args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ")
  }, "*");
};
console.warn = function(...args) {
  window.parent.postMessage({ type: "preview-warning", message: args.join(" ") }, "*");
};
</script>`;
  // Inject bridge before </head> or at top
  if (html.includes("</head>")) {
    return html.replace("</head>", bridge + "</head>");
  }
  return bridge + html;
}

function wrapInDocument(body: string, css: string = "", js: string = ""): string {
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
<script>
window.addEventListener("error",function(e){
  window.parent.postMessage({type:"preview-error",message:e.message,line:e.lineno,col:e.colno,source:e.filename},"*");
});
window.addEventListener("message",function(e){
  if(e.data?.type==="exec-js"){try{eval(e.data.code)}catch(err){window.parent.postMessage({type:"preview-error",message:String(err)},"*")}}
});
console.log=function(...a){window.parent.postMessage({type:"preview-console",message:a.map(x=>typeof x==="object"?JSON.stringify(x):String(x)).join(" ")},"*")};
console.warn=function(...a){window.parent.postMessage({type:"preview-warning",message:a.join(" ")},"*")};
</script>
</head>
<body>
${body}
${js ? `<script type="module">${js}</script>` : ""}
</body>
</html>`;
}

function buildJsRunner(code: string): string {
  // Redirect console.log to DOM, allow top-level imports
  return `
  const out = document.getElementById("output");
  const _log = console.log;
  console.log = function(...args){
    _log.apply(console,args);
    const line = document.createElement("div");
    line.className = "log-line";
    line.textContent = args.map(a => typeof a==="object"?JSON.stringify(a,null,2):String(a)).join(" ");
    if(out) out.appendChild(line);
  };
  const _err = console.error;
  console.error = function(...args){
    _err.apply(console,args);
    const line = document.createElement("div");
    line.className = "log-line error";
    line.textContent = "❌ " + args.join(" ");
    if(out) out.appendChild(line);
  };
  window.addEventListener("error", function(e) {
    if(out) {
      const line = document.createElement("div");
      line.className = "log-line error";
      line.textContent = "❌ " + e.message;
      out.appendChild(line);
    }
  });

  // User Code:
  ${code}
  `;
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
