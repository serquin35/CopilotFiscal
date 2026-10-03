// web/src/lib/ai/OpenAIProvider.ts
// Implementación real contra OpenAI chat/completions (fetch nativo, sin SDK).

import type { AiProvider, ChatCompletion, ChatMessage } from "./AiProvider";

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o";

export class OpenAIProvider implements AiProvider {
  readonly name = "openai" as const;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(apiKey?: string, model?: string) {
    const key = apiKey ?? process.env.OPENAI_API_KEY ?? "";
    if (!key) throw new Error("OPENAI_API_KEY no configurada");
    this.apiKey = key;
    this.model = model ?? DEFAULT_MODEL;
  }

  private body(messages: ChatMessage[], stream: boolean, opts?: { maxTokens?: number; temperature?: number }) {
    return JSON.stringify({
      model: this.model,
      temperature: opts?.temperature ?? 0.3,
      max_tokens: opts?.maxTokens ?? 600,
      stream,
      messages,
    });
  }

  async complete(messages: ChatMessage[], opts?: { maxTokens?: number; temperature?: number }): Promise<ChatCompletion> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: this.body(messages, false, opts),
    });
    if (!res.ok) throw new Error(`OpenAI devolvio error ${res.status}`);
    const data = await res.json();
    return {
      text: data.choices?.[0]?.message?.content ?? "",
      meta: {
        provider: "openai",
        model: data.model ?? this.model,
        promptVersion: "copilot-chat-v1",
        confidence: null,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async completeStream(messages: ChatMessage[], opts?: { maxTokens?: number; temperature?: number }): Promise<Response> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: this.body(messages, true, opts),
    });
    if (!res.ok || !res.body) throw new Error(`OpenAI devolvio error ${res.status}`);
    return res;
  }
}
