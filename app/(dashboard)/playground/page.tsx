"use client";

import { useState, useRef, FormEvent } from "react";
import { readSSE } from "@/lib/client/sse";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: string[];
}

export default function PlaygroundPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || sending) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: question }]);
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
        setMessages((prev) => [...prev, { role: "assistant", content: body.error ?? "Something went wrong." }]);
        return;
      }

      let answer = "";
      let citations: string[] = [];
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

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
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Playground</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Test your chatbot exactly as a visitor would see it.
      </p>

      <div className="mt-6 flex h-[560px] flex-col rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Ask a question a visitor might ask about your business.
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
              <div
                className={`inline-block max-w-[85%] rounded-2xl px-4 py-2 text-left ${
                  m.role === "user"
                    ? "bg-black text-white dark:bg-zinc-50 dark:text-black"
                    : "bg-zinc-100 text-black dark:bg-zinc-800 dark:text-zinc-50"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content || "..."}</p>
                {m.citations && m.citations.length > 0 && (
                  <div className="mt-2 space-y-0.5 border-t border-black/10 pt-2 dark:border-white/10">
                    {m.citations.map((c) => (
                      <a
                        key={c}
                        href={c}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-xs text-zinc-500 underline dark:text-zinc-400"
                      >
                        {c}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={sendMessage} className="flex gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-black outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
          <button
            type="submit"
            disabled={sending}
            className="rounded-lg bg-black px-4 py-2 font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
