import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
  Square,
  ClipboardPaste,
  Check,
  FilePlus,
  Replace,
} from "lucide-react";
import ReactMarkdown, { Components } from "react-markdown";
import { toast } from "sonner";

import type { ChatMessage } from "@/stores/editorStore";
import { getSupabaseFunctionHeaders } from "@/integrations/supabase/functionHeaders";

const CODE_ASSIST_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/code-assist`;

interface ProjectContext {
  active_file?: { path: string; content?: string; language?: string } | null;
  open_files?: string[];
  file_tree?: string;
}

type ToolCallName = "read_file" | "write_file";
type ReadFileArgs = { path: string };
type WriteFileArgs = { path: string; content: string };
type ToolCallArgs = ReadFileArgs | WriteFileArgs;

interface AIChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  onStreamMessage?: (id: string, content: string, done: boolean) => void;
  onInsertCode?: (code: string, replace?: boolean) => void;
  projectContext?: ProjectContext;
  onCreateFile?: (path: string, content: string) => void;
  onToolCall?: (name: ToolCallName, args: ToolCallArgs) => Promise<string | void>;
}

interface CodeBlockProps {
  code: string;
  className?: string;
  meta?: string;
  onInsert?: (code: string, replace?: boolean) => void;
  onCreateFile?: (path: string, content: string) => void;
}

interface StreamDelta {
  content?: string;
  tool_calls?: Array<{
    function?: {
      name?: string;
      arguments?: string;
    };
  }>;
}

interface StreamChunk {
  choices?: Array<{
    delta?: StreamDelta;
  }>;
}

function extractMarkdownMeta(node: unknown): string {
  if (!node || typeof node !== "object") return "";

  const maybeNode = node as {
    data?: { meta?: string };
    meta?: string;
  };

  return maybeNode.data?.meta || maybeNode.meta || "";
}

function CodeBlockWithInsert({
  code,
  className,
  meta,
  onInsert,
  onCreateFile,
}: CodeBlockProps) {
  const [status, setStatus] = useState<"idle" | "done">("idle");

  const detectFilename = useCallback(() => {
    if (meta && meta.trim() !== "") return meta.trim();

    const firstLine = code.split("\n")[0]?.trim() || "";

    if (firstLine.startsWith("//") && firstLine.includes("/")) {
      return firstLine.replace("//", "").trim();
    }

    if (firstLine.startsWith("/*") && firstLine.includes("*/") && firstLine.includes("/")) {
      return firstLine.replace("/*", "").replace("*/", "").trim();
    }

    return "src/NewModule.tsx";
  }, [code, meta]);

  const markDone = useCallback(() => {
    setStatus("done");
    window.setTimeout(() => setStatus("idle"), 2000);
  }, []);

  const handleInsert = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();

      if (!onInsert) return;

      onInsert(code, false);
      toast.success("تم إدراج الكود في المحرر");
      markDone();
    },
    [code, markDone, onInsert],
  );

  const handleReplace = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();

      if (!onInsert) return;

      const confirmed = window.confirm("سيتم استبدال الكود الحالي في المحرر. هل أنت متأكد؟");
      if (!confirmed) return;

      onInsert(code, true);
      toast.success("تم استبدال كود الملف");
      markDone();
    },
    [code, markDone, onInsert],
  );

  const handleCreate = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();

      if (!onCreateFile) return;

      const defaultName = detectFilename();
      const filename = window.prompt("مسار واسم الملف:", defaultName);

      if (!filename) return;

      onCreateFile(filename, code);
      toast.success(`تم إنشاء/تحديث ${filename}`);
      markDone();
    },
    [code, detectFilename, markDone, onCreateFile],
  );

  return (
    <div className="relative mt-2 mb-4 group/block" dir="rtl">
      <div className="absolute top-0 left-0 z-10 m-1 flex flex-col items-start gap-1.5 p-1 opacity-100 transition-opacity duration-200 sm:flex-row sm:items-center sm:opacity-0 sm:group-hover/block:opacity-100">
        {onInsert && (
          <>
            <button
              onClick={handleInsert}
              className="flex items-center gap-1 rounded border border-border bg-ide-sidebar px-2 py-1.5 text-[10px] font-mono text-muted-foreground shadow-sm backdrop-blur transition-colors hover:border-primary/50 hover:bg-primary/20 hover:text-primary"
              title="إدراج في موضع المؤشر"
            >
              {status === "done" ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <ClipboardPaste className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">إدراج</span>
            </button>

            <button
              onClick={handleReplace}
              className="flex items-center gap-1 rounded border border-border bg-ide-sidebar px-2 py-1.5 text-[10px] font-mono text-muted-foreground shadow-sm backdrop-blur transition-colors hover:border-amber-500/50 hover:bg-amber-500/20 hover:text-amber-500"
              title="استبدال الملف الحالي"
            >
              <Replace className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">استبدال</span>
            </button>
          </>
        )}

        {onCreateFile && (
          <button
            onClick={handleCreate}
            className="flex items-center gap-1 rounded bg-primary px-2 py-1.5 text-[10px] font-mono text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
            title="إنشاء ملف وتطبيقه"
          >
            <FilePlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">إنشاء ملف</span>
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-md border border-border bg-[#0d0d0d]">
        <code className={`block overflow-x-auto p-4 text-left ${className || ""}`} dir="ltr">{code}</code>
      </div>
    </div>
  );
}

export function AIChatPanel({
  messages,
  onSendMessage,
  onStreamMessage,
  onInsertCode,
  projectContext,
  onCreateFile,
  onToolCall,
}: AIChatPanelProps) {
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);

  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamActiveRef = useRef(false);
  const stepTimersRef = useRef<number[]>([]);

  const clearStepTimers = useCallback(() => {
    for (const timer of stepTimersRef.current) {
      window.clearTimeout(timer);
    }
    stepTimersRef.current = [];
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: isStreaming ? "auto" : "smooth",
    });
  }, [messages, isStreaming]);

  useEffect(() => {
    return () => {
      streamActiveRef.current = false;
      abortRef.current?.abort();
      clearStepTimers();
    };
  }, [clearStepTimers]);

  const handleStop = useCallback(() => {
    streamActiveRef.current = false;
    clearStepTimers();
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    setCurrentStep(0);
  }, [clearStepTimers]);

  const markdownComponents: Components = useMemo(
    () => ({
      code({ node, className, children, ...props }) {
        const isBlock = className?.startsWith("language-");
        const codeStr = String(children).replace(/\n$/, "");

        if (!isBlock) {
          return (
            <code className={className} {...props}>
              {children}
            </code>
          );
        }

        const metaString = extractMarkdownMeta(node);

        return (
          <div className="not-prose relative mt-4 mb-4">
            <CodeBlockWithInsert
              code={codeStr}
              className={className}
              meta={metaString}
              onInsert={onInsertCode}
              onCreateFile={onCreateFile}
            />
          </div>
        );
      },

      p({ children }) {
        const text = String(children);

        if (text.includes("🛠️ جاري تنفيذ أداة")) {
          return (
            <div className="tool-executing glass-card relative my-3 overflow-hidden rounded-lg border border-primary/20 p-3 animate-fade-in text-right">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-primary justify-end">
                <span>إجراء المساعد</span>
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              </div>
              <div className="text-[12px] leading-relaxed opacity-90">{children}</div>
              <div className="absolute bottom-0 right-0 h-[1px] w-full animate-shimmer bg-primary/40" />
            </div>
          );
        }

        if (text.includes("⚠️ **تنبيه استباقي**")) {
          return <div className="proactive-alert my-2 text-right">{children}</div>;
        }

        return <p className="m-0 text-right">{children}</p>;
      },
    }),
    [onCreateFile, onInsertCode],
  );

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput("");
    onSendMessage(text);

    if (!onStreamMessage) return;

    setIsStreaming(true);
    setCurrentStep(1);
    streamActiveRef.current = true;
    clearStepTimers();

    const controller = new AbortController();
    abortRef.current = controller;

    const assistantId = (Date.now() + 1).toString();

    stepTimersRef.current = [
      window.setTimeout(() => {
        if (streamActiveRef.current) setCurrentStep(2);
      }, 2000),
      window.setTimeout(() => {
        if (streamActiveRef.current) setCurrentStep(3);
      }, 5000),
    ];

    try {
      const apiMessages = messages
        .filter((m) => m.id !== "1")
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      apiMessages.push({ role: "user", content: text });

      const resp = await fetch(CODE_ASSIST_URL, {
        method: "POST",
        headers: getSupabaseFunctionHeaders("application/json"),
        body: JSON.stringify({
          messages: apiMessages,
          project_context: projectContext || null,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        let errorMessage = "حدث خطأ غير متوقع";

        try {
          const errJson = await resp.json();
          errorMessage = errJson?.error || errorMessage;
        } catch {
          try {
            const errText = await resp.text();
            if (errText) errorMessage = errText;
          } catch {
            errorMessage = "خطأ في الاتصال بالخادم";
          }
        }

        if (errorMessage.includes("AI gateway error (403)") || errorMessage.includes("API_KEY")) {
          errorMessage =
            "❌ فشل المصادقة: حدث خطأ في مفتاح `NVIDIA_API_KEY`. تأكد من صحة المفتاح وإعدادات Supabase.";
        } else if (errorMessage.includes("402") || errorMessage.includes("رصيد")) {
          errorMessage = "💳 رصيد واجهة برمجة التطبيقات نفد. يرجى الشحن.";
        } else {
          errorMessage = `⚠️ ${errorMessage}`;
        }

        onStreamMessage(assistantId, errorMessage, true);
        setIsStreaming(false);
        setCurrentStep(0);
        return;
      }

      if (!resp.body) {
        onStreamMessage(assistantId, "⚠️ لا توجد استجابة من الخادم", true);
        setIsStreaming(false);
        setCurrentStep(0);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";
      let accumulated = "";
      let accumulatedToolCallName = "";
      let accumulatedToolCallArgs = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();

          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr) as StreamChunk;
            const delta = parsed.choices?.[0]?.delta;
            if (!delta) continue;

            if (delta.content) {
              accumulated += delta.content;
              onStreamMessage(assistantId, accumulated, false);
            }

            const toolCall = delta.tool_calls?.[0];
            if (toolCall?.function?.name) {
              accumulatedToolCallName += toolCall.function.name;
            }
            if (toolCall?.function?.arguments) {
              accumulatedToolCallArgs += toolCall.function.arguments;
            }
          } catch {
            buffer = `${line}\n${buffer}`;
            break;
          }
        }
      }

      if (buffer.trim()) {
        for (let raw of buffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (!raw.startsWith("data: ")) continue;

          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;

          try {
            const parsed = JSON.parse(jsonStr) as StreamChunk;
            const delta = parsed.choices?.[0]?.delta;

            if (delta?.content) {
              accumulated += delta.content;
            }

            const toolCall = delta?.tool_calls?.[0];
            if (toolCall?.function?.name) {
              accumulatedToolCallName += toolCall.function.name;
            }
            if (toolCall?.function?.arguments) {
              accumulatedToolCallArgs += toolCall.function.arguments;
            }
          } catch {
            // تجاهل السطر غير القابل للتحليل
          }
        }
      }

      if (accumulatedToolCallName && accumulatedToolCallArgs && onToolCall) {
        try {
          const parsedArgs = JSON.parse(accumulatedToolCallArgs) as ToolCallArgs;
          const formattedArgs = JSON.stringify(parsedArgs, null, 2);

          const toolMessage = `🛠️ جاري تنفيذ أداة: **${accumulatedToolCallName}**\n\`\`\`json\n${formattedArgs}\n\`\`\``;

          if (!accumulated) {
            onStreamMessage(assistantId, toolMessage, true);
          } else {
            onStreamMessage(assistantId, `${accumulated}\n\n${toolMessage}`, true);
          }

          await onToolCall(accumulatedToolCallName as ToolCallName, parsedArgs);
        } catch (err) {
          console.error("Tool call parsing error", err);
          onStreamMessage(assistantId, accumulated || "⚠️ خطأ في قراءة الأداة", true);
        }
      } else {
        onStreamMessage(assistantId, accumulated || "...", true);
      }
    } catch (e: unknown) {
      if ((e as Error)?.name !== "AbortError") {
        onStreamMessage(assistantId, `⚠️ خطأ: ${(e as Error).message}`, true);
      }
    } finally {
      streamActiveRef.current = false;
      clearStepTimers();
      setIsStreaming(false);
      setCurrentStep(0);
      abortRef.current = null;
    }
  }, [
    clearStepTimers,
    input,
    isStreaming,
    messages,
    onSendMessage,
    onStreamMessage,
    onToolCall,
    projectContext,
  ]);

  return (
    <div className="flex h-full flex-col border-r border-border bg-ide-panel" dir="rtl">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-primary" />
        <span className="font-display text-[13px] font-medium tracking-tight text-foreground">
          المساعد الذكي
        </span>
        <div className="flex-1" />
        <span className="rounded-full bg-ide-success/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-ide-success">
          {isStreaming ? "جارٍ البث" : "مباشر"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center space-y-4 px-6 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/8">
              <Sparkles className="h-5 w-5 text-primary/60" />
            </div>
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              اسألني عن كتابة الكود، إصلاح الأخطاء، أو شرح المفاهيم.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex animate-fade-in gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            {msg.role === "assistant" && (
              <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10">
                <Bot className="h-3 w-3 text-primary/70" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-lg px-3 py-2.5 text-[13px] leading-relaxed text-right ${
                msg.role === "user"
                  ? "border border-primary/10 bg-primary/10 text-foreground"
                  : "bg-secondary/60 text-secondary-foreground"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm prose-invert max-w-none [&_code]:font-mono [&_code]:text-[11px] [&_code]:text-primary/80 [&_p]:m-0 [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border [&_pre]:bg-background/80 [&_pre]:p-2.5 text-right">
                  <ReactMarkdown components={markdownComponents}>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
            </div>

            {msg.role === "user" && (
              <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-accent/10">
                <User className="h-3 w-3 text-accent/70" />
              </div>
            )}
          </div>
        ))}

        {isStreaming && messages[messages.length - 1]?.role === "user" && (
          <div className="flex animate-fade-in flex-col gap-2">
            <div className="flex gap-2.5">
              <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10">
                <Bot className="h-3 w-3 text-primary/70" />
              </div>

              <div className="flex min-w-[120px] items-center gap-3 rounded-lg bg-secondary/60 px-3 py-2.5 flex-row-reverse">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span className="animate-pulse font-mono text-[10px] uppercase tracking-widest text-muted-foreground mr-2">
                  {currentStep === 1
                    ? "جاري التحليل"
                    : currentStep === 2
                      ? "جاري التوليد"
                      : "جارٍ الإنهاء"}
                </span>
              </div>
            </div>

            <div className="mr-7 flex gap-1.5 flex-row-reverse justify-end">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`h-0.5 w-6 rounded-full transition-colors duration-500 ${
                    currentStep >= step ? "bg-primary" : "bg-white/10"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-border p-2.5 sm:p-3">
        <div className="flex gap-2 flex-row-reverse">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                void handleSend();
              }
            }}
            placeholder="اسأل عن أي شيء..."
            disabled={isStreaming}
            className="min-h-[44px] flex-1 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-[13px] text-foreground transition-all duration-200 placeholder:text-muted-foreground/50 focus:border-primary/20 focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50 text-right"
          />

          {isStreaming ? (
            <button
              onClick={handleStop}
              className="rounded-lg bg-destructive px-3 py-2 text-destructive-foreground transition-all duration-200 hover:bg-destructive/90"
            >
              <Square className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={() => void handleSend()}
              disabled={!input.trim()}
              className="rounded-lg bg-primary px-3 py-2 text-primary-foreground transition-all duration-200 hover:bg-primary/90 disabled:opacity-20"
            >
              <Send className="h-3.5 w-3.5 rtl:rotate-180" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}