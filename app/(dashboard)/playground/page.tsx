"use client";

import { useEffect, useRef, useState } from "react";
import { readSSE } from "@/lib/client/sse";
import { ThinkingDots } from "@/components/ui/ThinkingDots";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: string[];
}

export default function PlaygroundPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Scoped to the message list itself: scrollTop is a no-op unless content
  // has actually overflowed the box, so this only moves anything once an
  // answer fills the visible height.
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages]);

  async function submitMessage() {
    const question = input.trim();
    if (!question || sending) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    // Assistant placeholder goes in right away so ThinkingDots shows the
    // instant Send is hit, not just once the request resolves.
    setMessages((prev) => [...prev, { role: "user", content: question }, { role: "assistant", content: "" }]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/playground/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, history }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: body.error ?? "Something went wrong." };
          return next;
        });
        return;
      }

      let answer = "";
      let citations: string[] = [];

      await readSSE(res, (event) => {
        if (typeof event.token === "string") {
          answer += event.token;
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: "assistant", content: answer, citations };
            return next;
          });
        } else if (event.done) {
          citations = Array.isArray(event.citations) ? (event.citations as string[]) : [];
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: "assistant", content: answer, citations };
            return next;
          });
        } else if (event.error) {
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: "assistant", content: String(event.error) };
            return next;
          });
        }
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:h-full">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Playground</h1>
      <p className="mt-1 text-sm text-muted">
        Test your chatbot exactly as a visitor would see it.
      </p>

      <div className="glass mt-6 flex h-[560px] min-h-0 flex-col overflow-hidden rounded-3xl lg:h-auto lg:flex-1">
        <div ref={messagesContainerRef} className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 && (
            <p className="text-sm text-muted">
              Ask a question a visitor might ask about your business.
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
              <div
                className={`inline-block max-w-[85%] rounded-2xl px-4 py-2.5 text-left text-[15px] leading-relaxed ${
                  m.role === "user"
                    ? "rounded-br-sm bg-accent text-white"
                    : "rounded-tl-sm border border-border bg-surface/80 text-foreground"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content || <ThinkingDots />}</p>
                {m.citations && m.citations.length > 0 && (
                  <div className="mt-2 space-y-0.5 border-t border-border pt-2">
                    {m.citations.map((c) => (
                      <a
                        key={c}
                        href={c}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-xs text-accent-bright underline decoration-accent/40 underline-offset-2 transition-colors hover:text-accent"
                      >
                        {c}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 border-t border-border p-3.5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submitMessage();
              }
            }}
            placeholder="Type a message…"
            disabled={sending}
            className="h-11 flex-1 rounded-full border border-border bg-surface/60 px-5 text-foreground placeholder:text-muted outline-none transition-shadow focus:shadow-[0_0_0_2px_var(--color-accent)]"
          />
          <button
            type="button"
            onClick={submitMessage}
            disabled={sending}
            className="inline-flex h-11 items-center justify-center rounded-full bg-accent px-5 font-medium text-white transition-all duration-300 hover:bg-accent-bright disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
