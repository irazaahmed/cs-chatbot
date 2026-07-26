import type { BrandConfig } from "./api";

const WIDGET_STYLES = `
  :host, * { box-sizing: border-box; }
  .root { all: initial; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  .bubble {
    position: fixed; bottom: 20px; width: 56px; height: 56px; border-radius: 50%;
    border: none; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,0.2);
    display: flex; align-items: center; justify-content: center; z-index: 2147483000;
    font-size: 24px; color: #fff;
  }
  .bubble.right { right: 20px; }
  .bubble.left { left: 20px; }
  .panel {
    position: fixed; bottom: 88px; width: 360px; max-width: calc(100vw - 40px);
    height: 480px; max-height: calc(100vh - 140px); background: #fff; border-radius: 16px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.25); display: none; flex-direction: column;
    overflow: hidden; z-index: 2147483000; font-size: 14px; color: #1a1a1a;
  }
  .panel.right { right: 20px; }
  .panel.left { left: 20px; }
  .panel.open { display: flex; }
  .header { padding: 16px; color: #fff; font-weight: 600; }
  .messages { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
  .msg { max-width: 85%; padding: 8px 12px; border-radius: 14px; line-height: 1.4; white-space: pre-wrap; }
  .msg.user { align-self: flex-end; background: #f0f0f0; }
  .msg.assistant { align-self: flex-start; background: #f5f5f7; }
  .cite { display: block; font-size: 11px; color: #888; text-decoration: underline; margin-top: 4px; }
  .form { display: flex; gap: 8px; padding: 10px; border-top: 1px solid #eee; }
  .input { flex: 1; border: 1px solid #ddd; border-radius: 20px; padding: 8px 14px; font-size: 14px; outline: none; }
  .send { border: none; border-radius: 20px; padding: 8px 16px; color: #fff; cursor: pointer; font-size: 14px; }
  .send:disabled { opacity: 0.5; cursor: default; }
  .powered { text-align: center; font-size: 10px; color: #aaa; padding: 4px 0; }
`;

export interface WidgetUI {
  bubble: HTMLButtonElement;
  panel: HTMLDivElement;
  messagesEl: HTMLDivElement;
  form: HTMLFormElement;
  input: HTMLInputElement;
  sendButton: HTMLButtonElement;
}

function bubbleIconSvg(): string {
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/><text x="11.7" y="11" text-anchor="middle" dominant-baseline="central" fill="currentColor" stroke="none" font-size="8.2" font-weight="700" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">CS</text></svg>`;
}

export function createWidgetUI(config: BrandConfig, forcedBranding: boolean): WidgetUI {
  const side = config.position === "bottom-left" ? "left" : "right";
  const color = config.color || "#111111";
  const botName = config.botName || "Chat";

  const host = document.createElement("div");
  host.setAttribute("data-cybrum-widget", "");
  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = WIDGET_STYLES;
  shadow.appendChild(style);

  const root = document.createElement("div");
  root.className = "root";
  shadow.appendChild(root);

  const bubble = document.createElement("button");
  bubble.className = `bubble ${side}`;
  bubble.style.background = color;
  bubble.setAttribute("aria-label", "Open chat");
  bubble.innerHTML = bubbleIconSvg();
  root.appendChild(bubble);

  const panel = document.createElement("div");
  panel.className = `panel ${side}`;
  root.appendChild(panel);

  const header = document.createElement("div");
  header.className = "header";
  header.style.background = color;
  header.textContent = botName;
  panel.appendChild(header);

  const messagesEl = document.createElement("div");
  messagesEl.className = "messages";
  panel.appendChild(messagesEl);

  const form = document.createElement("form");
  form.className = "form";
  panel.appendChild(form);

  const input = document.createElement("input");
  input.className = "input";
  input.type = "text";
  input.placeholder = "Type a message...";
  input.autocomplete = "off";
  form.appendChild(input);

  const sendButton = document.createElement("button");
  sendButton.className = "send";
  sendButton.type = "submit";
  sendButton.style.background = color;
  sendButton.textContent = "Send";
  form.appendChild(sendButton);

  if (forcedBranding) {
    const powered = document.createElement("div");
    powered.className = "powered";
    powered.textContent = "Powered by Cybrum";
    panel.appendChild(powered);
  }

  document.body.appendChild(host);

  return { bubble, panel, messagesEl, form, input, sendButton };
}

export function appendMessage(
  messagesEl: HTMLDivElement,
  role: "user" | "assistant",
  content: string,
  citations?: string[]
): HTMLDivElement {
  const el = document.createElement("div");
  el.className = `msg ${role}`;
  el.textContent = content;
  if (citations && citations.length > 0) {
    for (const url of citations) {
      const a = document.createElement("a");
      a.className = "cite";
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = url;
      el.appendChild(a);
    }
  }
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return el;
}
