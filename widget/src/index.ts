import { fetchConfig, sendChatMessage } from "./api";
import { createWidgetUI, appendMessage, showThinking, setBubbleOpen } from "./dom";
import { getSessionId } from "./session";
import { readSSE } from "./sse";

// CLAUDE.md section 8, rule 4: every entry point wrapped in try/catch. Any
// failure means the widget silently does not render — never throws into the
// customer's page, never blocks load, never logs to their console.
async function init(): Promise<void> {
  const scriptEl = document.currentScript as HTMLScriptElement | null;
  if (!scriptEl) return;

  const publicKey = scriptEl.dataset.key;
  if (!publicKey) return;

  const position = scriptEl.dataset.position === "bottom-left" ? "bottom-left" : "bottom-right";
  const apiBase = new URL(scriptEl.src).origin;

  const config = await fetchConfig(apiBase, publicKey);
  if (!config) return;

  const sessionId = getSessionId();
  const ui = createWidgetUI({ ...config.brandConfig, position }, config.forcedBranding);

  let opened = false;
  let sending = false;

  ui.bubble.addEventListener("click", () => {
    try {
      ui.panel.classList.toggle("open");
      setBubbleOpen(ui.bubble, ui.panel.classList.contains("open"));
      if (!opened && ui.panel.classList.contains("open")) {
        opened = true;
        const greeting = config.brandConfig.greeting || "Hi! How can I help?";
        appendMessage(ui.messagesEl, "assistant", greeting);
      }
    } catch {
      // never let a UI error escape to the host page
    }
  });

  // Grow the textarea with its content, capped so it never eats the panel.
  const autoGrow = () => {
    ui.input.style.height = "auto";
    ui.input.style.height = `${Math.min(ui.input.scrollHeight, 96)}px`;
  };
  ui.input.addEventListener("input", autoGrow);

  // Enter alone inserts a newline (the textarea's default, vital on mobile);
  // Ctrl/Cmd+Enter sends, matching the Send button.
  ui.input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      ui.form.requestSubmit();
    }
  });

  ui.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (sending) return;

    const message = ui.input.value.trim();
    if (!message) return;

    try {
      sending = true;
      ui.sendButton.disabled = true;
      ui.input.value = "";
      autoGrow();
      appendMessage(ui.messagesEl, "user", message);
      const assistantEl = appendMessage(ui.messagesEl, "assistant", "");
      showThinking(assistantEl);

      const res = await sendChatMessage(apiBase, publicKey, sessionId, message);
      const contentType = res.headers.get("content-type") ?? "";

      if (contentType.includes("application/json")) {
        const data = await res.json();
        assistantEl.textContent = data.message || data.error || "Something went wrong.";
        return;
      }

      let answer = "";
      await readSSE(res, (event) => {
        if (typeof event.token === "string") {
          answer += event.token;
          assistantEl.textContent = answer;
          ui.messagesEl.scrollTop = ui.messagesEl.scrollHeight;
        } else if (event.error) {
          assistantEl.textContent = String(event.error);
        }
      });
    } catch {
      appendMessage(ui.messagesEl, "assistant", "Something went wrong. Please try again.");
    } finally {
      sending = false;
      ui.sendButton.disabled = false;
    }
  });
}

try {
  init().catch(() => {
    // swallow — widget just doesn't appear
  });
} catch {
  // swallow — widget just doesn't appear
}
