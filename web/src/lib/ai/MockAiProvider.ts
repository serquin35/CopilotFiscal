// web/src/lib/ai/MockAiProvider.ts
// Respuestas locales deterministas para dev/test sin cuota (OPENAI_MOCK_STREAM=1).
// Usa SIEMPRE el contexto fiscal real inyectado en el system prompt: no inventa cifras.

import type { AiProvider, ChatCompletion, ChatMessage } from "./AiProvider";

function sseFromText(text: string, delayMs = 30): Response {
  const encoder = new TextEncoder();
  const words = text.split(" ");
  const readable = new ReadableStream({
    async start(controller) {
      for (const w of words) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: w + " " })}\n\n`));
        await new Promise((r) => setTimeout(r, delayMs));
      }
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
      controller.close();
    },
  });
  return new Response(readable, {
    headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform" },
  });
}

export class MockAiProvider implements AiProvider {
  readonly name = "mock" as const;

  private replyFor(messages: ChatMessage[]): string {
    const sys = messages.find((m) => m.role === "system")?.content ?? "";
    const trim = sys.length > 900 ? sys.slice(0, 900) + "…" : sys;
    return (
      `(Respuesta simulada sin coste) Segun el contexto fiscal inyectado: ${trim} ` +
      `Activa OPENAI_API_KEY para el copiloto completo.`
    );
  }

  async complete(messages: ChatMessage[]): Promise<ChatCompletion> {
    const text = this.replyFor(messages);
    return {
      text,
      meta: {
        provider: "mock",
        model: "mock-v1",
        promptVersion: "copilot-chat-v1",
        confidence: null,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async completeStream(messages: ChatMessage[]): Promise<Response> {
    return sseFromText(this.replyFor(messages));
  }
}

export async function getAiProvider(): Promise<AiProvider> {
  if (process.env.OPENAI_MOCK_STREAM === "1") return new MockAiProvider();
  const { OpenAIProvider } = await import("./OpenAIProvider");
  return new OpenAIProvider();
}
