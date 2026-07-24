import OpenAI from "openai";

// THE ONLY file in this codebase allowed to import the OpenAI SDK.
// Everything else calls the functions below, so swapping providers or
// models later never touches routes, components, or workers.

const CHAT_MODEL = "gpt-5-mini";
const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    client = new OpenAI({ apiKey });
  }
  return client;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function embed(text: string): Promise<number[]> {
  const res = await getClient().embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return res.data[0].embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const res = await getClient().embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}

export async function chatComplete(messages: ChatMessage[]): Promise<string> {
  const res = await getClient().chat.completions.create({
    model: CHAT_MODEL,
    messages,
  });
  return res.choices[0]?.message?.content ?? "";
}

export async function* chatStream(messages: ChatMessage[]): AsyncGenerator<string> {
  const stream = await getClient().chat.completions.create({
    model: CHAT_MODEL,
    messages,
    stream: true,
  });
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}
