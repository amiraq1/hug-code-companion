import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Send, Bot, User, Sparkles, Loader2, Square, ClipboardPaste, Check, FilePlus, Replace } from "lucide-react";
import type { ChatMessage } from "@/stores/editorStore";
import type { FileNode } from "@/stores/editorStore";
import { getSupabaseFunctionHeaders } from "@/integrations/supabase/functionHeaders";
import ReactMarkdown, { Components } from "react-markdown";
import { toast } from "sonner";

const CODE_ASSIST_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/code-assist`;

interface ProjectContext {
  active_file?: { path: string; content?: string; language?: string } | null;
  open_files?: string[];
  file_tree?: string;
}

interface AIChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  onStreamMessage?: (id: string, content: string, done: boolean) => void;
  onInsertCode?: (code: string, replace?: boolean) => void;
  projectContext?: ProjectContext;
  onCreateFile?: (path: string, content: string) => void;
  onToolCall?: (name: string, args: any) => Promise<string | void>;
}

interface CodeBlockProps {
  code: string;
  className?: string;
  meta?: string;
  onInsert?: (code: string, replace?: boolean) => void;
  onCreateFile?: (path: string, content: string) => void;
}

function CodeBlockWithInsert({ code, className, meta, onInsert, onCreateFile }: CodeBlockProps) {
  const [status, setStatus] = useState<"idle" | "done">("idle");

  const detectFilename = () => {
    if (meta && meta.trim() !== "") return meta.trim();
    const firstLine = code.split("\n")[0].trim();
    if (firstLine.startsWith("//") && firstLine.includes("/")) {
      return firstLine.replace("//", "").trim();
    }
    if (firstLine.startsWith("/*") && firstLine.includes("*/") && firstLine.includes("/")) {
      return firstLine.replace("/*", "").replace("*/", "").trim();
    }
    return "src/NewModule.tsx";
  };

  const handleInsert = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onInsert) {
      onInsert(code, false);
      setStatus("done");
      toast.success("تم إدراج الكود في المحرر");
      setTimeout(() => setStatus("idle"), 2000);
    }
  };

  const handleReplace = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onInsert && window.confirm("سيتم استبدال الكود الحالي في المحرر. هل أنت متأكد؟")) {
      onInsert(code, true);
      setStatus("done");
      toast.success("تم استبدال كود الملف");
      setTimeout(() => setStatus("idle"), 2000);
    }
  };

  const handleCreate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCreateFile) {
      const defaultName = detectFilename();
      const filename = window.prompt("مسار واسم الملف:", defaultName);
      if (filename) {
        onCreateFile(filename, code);
        setStatus("done");
        toast.success(`تم إنشاء/تحديث ${filename}`);
        setTimeout(() => setStatus("idle"), 2000);
      }
    }
  };

  return (
    <div className="relative group/block mt-2 mb-4">
      <div className="absolute top-0 right-0 z-10 m-1 flex flex-col items-end gap-1.5 p-1 opacity-100 transition-opacity duration-200 sm:flex-row sm:items-center sm:opacity-0 sm:group-hover/block:opacity-100">
        {onInsert && (
          <>
            <button
              onClick={handleInsert}
              className="flex items-center gap-1 px-2 py-1.5 rounded bg-ide-sidebar border border-border hover:bg-primary/20 hover:border-primary/50 text-muted-foreground hover:text-primary text-[10px] font-mono shadow-sm backdrop-blur transition-colors"
              title="إدراج في موضع المؤشر"
            >
              {status === "done" ? <Check key="check" className="h-3.5 w-3.5" /> : <ClipboardPaste key="paste" className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">إدراج</span>
            </button>
            <button
              onClick={handleReplace}
              className="flex items-center gap-1 px-2 py-1.5 rounded bg-ide-sidebar border border-border hover:bg-amber-500/20 hover:border-amber-500/50 text-muted-foreground hover:text-amber-500 text-[10px] font-mono shadow-sm backdrop-blur transition-colors"
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
            className="flex items-center gap-1 px-2 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90 text-[10px] font-mono shadow-sm transition-opacity"
            title="إنشاء ملف وتطبيقه"
          >
            <FilePlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">إنشاء ملف</span>
          </button>
        )}
      </div>
      <div className="overflow-hidden rounded-md border border-border bg-[#0d0d0d]">
        <code className={`block overflow-x-auto p-4 ${className || ""}`}>
          {code}
        </code>
      </div>
    </div>
  );
}

export function AIChatPanel({ messages, onSendMessage, onStreamMessage, onInsertCode, projectContext, onCreateFile, onToolCall }: AIChatPanelProps) {
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

  const markdownComponents: Components = useMemo(() => ({
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

      const metaString = (node?.data as any)?.meta || (node as any)?.meta || "";

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
          <div className="tool-executing glass-card p-3 my-3 rounded-lg border-primary/20 animate-fade-in relative overflow-hidden">
             <div className="flex items-center gap-2 text-primary text-[11px] font-bold uppercase tracking-wider mb-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Agent Action
             </div>
             <div className="text-[12px] opacity-90 leading-relaxed">{children}</div>
             <div className="absolute bottom-0 left-0 h-[1px] bg-primary/40 w-full animate-shimmer" />
          </div>
        );
      }
      if (text.includes("⚠️ **تنبيه استباقي**")) {
        return <div className="proactive-alert my-2">{children}</div>;
      }
      return <p className="m-0">{children}</p>;
    }
  }), [onInsertCode, onCreateFile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => clearStepTimers, [clearStepTimers]);

  const handleStop = useCallback(() => {
    streamActiveRef.current = false;
    clearStepTimers();
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    setCurrentStep(0);
  }, [clearStepTimers]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");

    // Add user message
    onSendMessage(text);

    if (!onStreamMessage) return;

    // Start streaming
    setIsStreaming(true);
    setCurrentStep(1); // Analysis
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
      // Build messages for API (exclude the welcome message, only user/assistant pairs)
      const apiMessages = messages
        .filter((m) => m.id !== "1") // skip welcome
        .map((m) => ({ role: m.role, content: m.content }));
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
        const err = await resp.json().catch(() => ({ error: "خطأ في الاتصال بالخادم" }));
        let errorMessage = err.error || "حدث خطأ غير متوقع";
        
        if (errorMessage.includes("AI gateway error (403)") || errorMessage.includes("API_KEY")) {
          errorMessage = "❌ فشل المصادقة: حدث خطأ في مفتاح `NVIDIA_API_KEY`. تأكد من صحة المفتاح وإعدادات Supabase.";
        } else if (errorMessage.includes("402") || errorMessage.includes("رصيد")) {
          errorMessage = "💳 رصيد واجهة برمجة التطبيقات (API) نفد. يرجى الشحن.";
        } else {
          errorMessage = `⚠️ ${errorMessage}`;
        }

        onStreamMessage(assistantId, errorMessage, true);
        setIsStreaming(false);
        return;
      }

      if (!resp.body) {
        onStreamMessage(assistantId, "⚠️ لا يوجد استجابة", true);
        setIsStreaming(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";
      let accumulatedToolCallName = "";
      let accumulatedToolCallArgs = "";

      while (true) {
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
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta;
            if (!delta) continue;
            
            if (delta.content) {
              accumulated += delta.content;
              onStreamMessage(assistantId, accumulated, false);
            }
            if (delta.tool_calls?.[0]) {
               const tc = delta.tool_calls[0];
               if (tc.function?.name) accumulatedToolCallName += tc.function.name;
               if (tc.function?.arguments) accumulatedToolCallArgs += tc.function.arguments;
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Final flush
      if (buffer.trim()) {
        for (let raw of buffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.content) accumulated += delta.content;
            if (delta?.tool_calls?.[0]) {
               const tc = delta.tool_calls[0];
               if (tc.function?.name) accumulatedToolCallName += tc.function.name;
               if (tc.function?.arguments) accumulatedToolCallArgs += tc.function.arguments;
            }
          } catch {
            // Ignore parse error
          }
        }
      }

      if (accumulatedToolCallName && accumulatedToolCallArgs && onToolCall) {
        try {
          const args = JSON.parse(accumulatedToolCallArgs);
          const formattedArgs = JSON.stringify(args, null, 2);
          const toolMessage = `🛠️ جاري تنفيذ أداة: **${accumulatedToolCallName}**\n\`\`\`json\n${formattedArgs}\n\`\`\``;
          
          if (!accumulated) {
             onStreamMessage(assistantId, toolMessage, true);
          } else {
             onStreamMessage(assistantId, accumulated + "\n\n" + toolMessage, true);
          }
          
          await onToolCall(accumulatedToolCallName, args);
        } catch(err) {
          console.error("Tool call parsing error", err);
          onStreamMessage(assistantId, accumulated || "⚠️ خطأ في قراءة الأداة", true);
        }
      } else {
        onStreamMessage(assistantId, accumulated || "...", true);
      }
    } catch (e: unknown) {
      if ((e as Error).name !== "AbortError") {
        onStreamMessage(assistantId, `⚠️ خطأ: ${(e as Error).message}`, true);
      }
    } finally {
      streamActiveRef.current = false;
      clearStepTimers();
      setIsStreaming(false);
      setCurrentStep(0);
      abortRef.current = null;
    }
  }, [clearStepTimers, input, isStreaming, messages, onSendMessage, onStreamMessage, onToolCall, projectContext]);

  return (
    <div className="h-full bg-ide-panel border-l border-border flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
        <span className="text-[13px] font-display font-medium text-foreground tracking-tight">Agent</span>
        <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full bg-ide-success/10 text-ide-success font-mono uppercase tracking-wider">
          {isStreaming ? "streaming" : "live"}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 sm:p-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 px-6">
            <div className="w-10 h-10 rounded-lg bg-primary/8 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary/60" />
            </div>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              Ask me to write code, debug issues, or explain concepts.
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : ""} animate-fade-in`}>
            {msg.role === "assistant" && (
              <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                <Bot className="h-3 w-3 text-primary/70" />
              </div>
            )}
            <div
              className={`rounded-lg px-3 py-2.5 text-[13px] leading-relaxed max-w-[85%] ${msg.role === "user"
                ? "bg-primary/10 text-foreground border border-primary/10"
                : "bg-secondary/60 text-secondary-foreground"
                }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm prose-invert max-w-none [&_p]:m-0 [&_pre]:bg-background/80 [&_pre]:p-2.5 [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border [&_code]:text-primary/80 [&_code]:text-[11px] [&_code]:font-mono">
                  <ReactMarkdown
                    components={markdownComponents}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-5 h-5 rounded bg-accent/10 flex items-center justify-center shrink-0 mt-1">
                <User className="h-3 w-3 text-accent/70" />
              </div>
            )}
          </div>
        ))}
        {isStreaming && messages[messages.length - 1]?.role === "user" && (
          <div className="flex flex-col gap-2 animate-fade-in">
            <div className="flex gap-2.5">
              <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                <Bot className="h-3 w-3 text-primary/70" />
              </div>
              <div className="rounded-lg px-3 py-2.5 bg-secondary/60 flex items-center gap-3 min-w-[120px]">
                <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest animate-pulse">
                  {currentStep === 1 ? "Analyzing" : currentStep === 2 ? "Generating" : "Finalizing"}
                </span>
              </div>
            </div>
            
            <div className="flex gap-1.5 ml-7">
               {[1, 2, 3].map(s => (
                 <div key={s} className={`h-0.5 w-6 rounded-full transition-colors duration-500 ${currentStep >= s ? "bg-primary" : "bg-white/10"}`} />
               ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-2.5 border-t border-border sm:p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Ask anything..."
            disabled={isStreaming}
            className="min-h-[44px] flex-1 bg-secondary/50 border border-border rounded-lg px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/20 transition-all duration-200 disabled:opacity-50"
          />
          {isStreaming ? (
            <button
              onClick={handleStop}
              className="px-3 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-all duration-200"
            >
              <Square className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-20 transition-all duration-200"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
