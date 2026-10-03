// web/src/lib/ai/AiProvider.ts
// Wrapper anti-acoplamiento (ARCHITECTURE.md §4.1, DT-02).
// El dominio/UI nunca importa SDKs ni llama a OpenAI directamente:
// solo usa AiProvider + metadatos obligatorios de trazabilidad.

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiResponseMetadata {
  provider: "openai" | "mock";
  model: string;
  promptVersion: string;
  confidence: number | null;
  timestamp: string;
}

export interface ChatCompletion {
  text: string;
  meta: AiResponseMetadata;
}

export interface AiProvider {
  readonly name: "openai" | "mock";
  complete(messages: ChatMessage[], opts?: { maxTokens?: number; temperature?: number }): Promise<ChatCompletion>;
  completeStream(messages: ChatMessage[], opts?: { maxTokens?: number; temperature?: number }): Promise<Response>;
}
