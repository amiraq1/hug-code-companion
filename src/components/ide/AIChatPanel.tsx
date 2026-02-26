import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles } from "lucide-react";
import type { ChatMessage } from "@/stores/editorStore";
import ReactMarkdown from "react-markdown";

interface AIChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
}

export function AIChatPanel({ messages, onSendMessage }: AIChatPanelProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput("");
  };

  return (
    <div className="h-full bg-ide-panel border-l border-border flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
        <span className="text-[13px] font-display font-medium text-foreground tracking-tight">Agent</span>
        <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full bg-ide-success/10 text-ide-success font-mono uppercase tracking-wider">
          live
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
              className={`rounded-lg px-3 py-2.5 text-[13px] leading-relaxed max-w-[85%] ${
                msg.role === "user"
                  ? "bg-primary/10 text-foreground border border-primary/10"
                  : "bg-secondary/60 text-secondary-foreground"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm prose-invert max-w-none [&_p]:m-0 [&_pre]:bg-background/80 [&_pre]:p-2.5 [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border [&_code]:text-primary/80 [&_code]:text-[11px] [&_code]:font-mono">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
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
            className="flex-1 bg-secondary/50 border border-border rounded-lg px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/20 transition-all duration-200"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-20 transition-all duration-200"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
