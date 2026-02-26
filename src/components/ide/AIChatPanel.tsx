import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Sparkles, Loader2, Square, ClipboardPaste, Check } from "lucide-react";
import type { ChatMessage } from "@/stores/editorStore";
import type { FileNode } from "@/stores/editorStore";
import ReactMarkdown from "react-markdown";
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
  onInsertCode?: (code: string) => void;
  projectContext?: ProjectContext;
}

function CodeBlockWithInsert({ code, className, onInsert }: { code: string; className?: string; onInsert?: (code: string) => void }) {
  const [inserted, setInserted] = useState(false);
  const handleInsert = () => {
    if (onInsert) {
      onInsert(code);
      setInserted(true);
      toast.success("تم إدراج الكود في المحرر");
      setTimeout(() => setInserted(false), 2000);
    }
  };
  return (
    <div className="relative group">
      <code className={className}>{code}</code>
      {onInsert && (
        <button
          onClick={handleInsert}
          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 px-2 py-1 rounded bg-primary/20 hover:bg-primary/30 text-primary text-[10px] font-mono border border-primary/20"
          title="إدراج في المحرر"
        >
          {inserted ? <Check className="h-3 w-3" /> : <ClipboardPaste className="h-3 w-3" />}
          {inserted ? "تم" : "إدراج"}
        </button>
      )}
    </div>
  );
}

export function AIChatPanel({ messages, onSendMessage, onStreamMessage, onInsertCode, projectContext }: AIChatPanelProps) {
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");

    // Add user message
    onSendMessage(text);

    if (!onStreamMessage) return;

    // Start streaming
    setIsStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;
    const assistantId = (Date.now() + 1).toString();

    try {
      // Build messages for API (exclude the welcome message, only user/assistant pairs)
      const apiMessages = messages
        .filter((m) => m.id !== "1") // skip welcome
        .map((m) => ({ role: m.role, content: m.content }));
      apiMessages.push({ role: "user", content: text });

      const resp = await fetch(CODE_ASSIST_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: apiMessages,
          project_context: projectContext || null,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "خطأ في الاتصال" }));
        onStreamMessage(assistantId, `⚠️ ${err.error || "حدث خطأ"}`, true);
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
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              accumulated += content;
              onStreamMessage(assistantId, accumulated, false);
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
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) accumulated += content;
          } catch {
            // Ignore parse error
          }
        }
      }

      onStreamMessage(assistantId, accumulated || "...", true);
    } catch (e: unknown) {
      if ((e as Error).name !== "AbortError") {
        onStreamMessage(assistantId, `⚠️ خطأ: ${(e as Error).message}`, true);
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [input, isStreaming, messages, onSendMessage, onStreamMessage, projectContext]);

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
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                    components={{
                      pre({ children }) {
                        return <pre className="relative group">{children}</pre>;
                      },
                      code({ className, children, ...props }) {
                        const isBlock = className?.startsWith("language-");
                        const codeStr = String(children).replace(/\n$/, "");
                        if (!isBlock) {
                          return <code className={className} {...props}>{children}</code>;
                        }
                        return (
                          <CodeBlockWithInsert
                            code={codeStr}
                            className={className}
                            onInsert={onInsertCode}
                          />
                        );
                      },
                    }}
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
          <div className="flex gap-2.5 animate-fade-in">
            <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center shrink-0 mt-1">
              <Bot className="h-3 w-3 text-primary/70" />
            </div>
            <div className="rounded-lg px-3 py-2.5 bg-secondary/60">
              <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Ask anything..."
            disabled={isStreaming}
            className="flex-1 bg-secondary/50 border border-border rounded-lg px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/20 transition-all duration-200 disabled:opacity-50"
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
