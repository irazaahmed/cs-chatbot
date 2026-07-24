"use client";

import { useState, useRef, FormEvent } from "react";

interface ProgressState {
  done: number;
  total: number;
  currentUrl: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: string[];
}

type Phase = "input" | "crawling" | "chat";

async function readSSE(
  response: Response,
  onEvent: (data: Record<string, unknown>) => void
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      try {
        onEvent(JSON.parse(line.slice("data: ".length)));
      } catch {
        // ignore malformed event
      }
    }
  }
}

export default function LandingPage() {
  const [phase, setPhase] = useState<Phase>("input");
  const [url, setUrl] = useState("");
  const [progress, setProgress] = useState<ProgressState>({ done: 0, total: 15, currentUrl: "" });
  const [error, setError] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  async function startCrawl(e: FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setError(null);
    setPhase("crawling");
    setProgress({ done: 0, total: 15, currentUrl: "" });

    try {
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Couldn't start the crawl. Please check the URL and try again.");
        setPhase("input");
        return;
      }

      await readSSE(res, (event) => {
        if (event.type === "progress") {
          setProgress({
            done: Number(event.done),
            total: Number(event.total),
            currentUrl: String(event.url ?? ""),
          });
        } else if (event.type === "ready") {
          setPreviewId(String(event.previewId));
          setMessages([
            {
              role: "assistant",
              content: `I've read ${event.pageCount} pages from your site. Ask me anything a visitor might ask.`,
            },
          ]);
          setPhase("chat");
        } else if (event.type === "error") {
          setError(String(event.message ?? "Something went wrong."));
          setPhase("input");
        }
      });
    } catch {
      setError("Something went wrong. Please try again.");
      setPhase("input");
    }
  }

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    const question = chatInput.trim();
    if (!question || !previewId || sending) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setChatInput("");
    setSending(true);

    try {
      const res = await fetch("/api/preview/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ previewId, message: question, history }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: body.error ?? "Something went wrong." },
        ]);
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
        }
      });
    } finally {
      setSending(false);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <div className="w-full max-w-2xl">
        <h1 className="text-center text-4xl font-semibold tracking-tight text-black dark:text-zinc-50">
          A chatbot trained on your website, in one minute
        </h1>
        <p className="mt-3 text-center text-lg text-zinc-600 dark:text-zinc-400">
          Paste your URL. We&apos;ll read your site and let you chat with it right here — no signup.
        </p>

        {phase === "input" && (
          <form onSubmit={startCrawl} className="mt-8 flex gap-2">
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://yourbusiness.com"
              className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-black outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
            <button
              type="submit"
              className="rounded-lg bg-black px-6 py-3 font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
            >
              Preview
            </button>
          </form>
        )}

        {error && <p className="mt-4 text-center text-red-600 dark:text-red-400">{error}</p>}

        {phase === "crawling" && (
          <div className="mt-10 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="font-medium text-black dark:text-zinc-50">
              Reading your site... ({progress.done}/{progress.total})
            </p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div
                className="h-full bg-black transition-all dark:bg-zinc-50"
                style={{ width: `${Math.min(100, (progress.done / Math.max(1, progress.total)) * 100)}%` }}
              />
            </div>
            {progress.currentUrl && (
              <p className="mt-2 truncate text-sm text-zinc-500 dark:text-zinc-400">
                {progress.currentUrl}
              </p>
            )}
          </div>
        )}

        {phase === "chat" && (
          <div className="mt-10 flex h-[500px] flex-col rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
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
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask a question a visitor might ask..."
                disabled={sending}
                className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-black outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
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
        )}
      </div>
    </div>
  );
}
