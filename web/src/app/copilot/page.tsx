"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  BotMessageSquare,
  Send,
  Sparkles,
  ShieldCheck,
  User,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  sender: "user" | "copilot";
  content: string;
  timestamp: string;
  sources?: string[];
  isError?: boolean;
}

interface FiscalSnapshot {
  netVat: number;
  collectedVat: number;
  deductibleVat: number;
  pendingDocuments: number;
  openAlerts: number;
  quarter: string;
  year: number;
}

// ─── Prompts rápidos ──────────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  "¿Por qué tengo ese resultado en el Modelo 303 este trimestre?",
  "¿Qué anomalías activas pueden generar inspección de la AEAT?",
  "¿Puedo deducir el 100% de la factura de gasolina?",
  "¿Cuál es el plazo para presentar el Modelo 303 de este trimestre?",
];

// ─── Componente ───────────────────────────────────────────────────────────────

export default function CopilotPage() {
  const { business } = useAuth();

  // Trimestre activo: por defecto el del mes actual
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const defaultQuarter =
    currentMonth <= 3 ? "1T" : currentMonth <= 6 ? "2T" : currentMonth <= 9 ? "3T" : "4T";
  const defaultYear = now.getFullYear();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg-1",
      sender: "copilot",
      content:
        "Hola. Soy tu **Copiloto Fiscal**. Analizo en tiempo real tus facturas y el cálculo del **Modelo 303** desde tu base de datos real. Toda mi información procede directamente de tus registros contables. ¿En qué duda tributaria puedo ayudarte hoy?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [snapshot, setSnapshot] = useState<FiscalSnapshot | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // ── Enviar mensaje al endpoint real ─────────────────────────────────────────

  const handleSend = useCallback(
    async (textToSend?: string) => {
      const query = textToSend || inputQuery;
      if (!query.trim() || isTyping) return;

      const userMsg: Message = {
        id: `usr-${Date.now()}`,
        sender: "user",
        content: query,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, userMsg]);
      if (!textToSend) setInputQuery("");
      setIsTyping(true);

      try {
        const res = await fetch("/api/copilot/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: query,
            quarter: defaultQuarter,
            year: defaultYear,
          }),
        });

        const data = await res.json();

        if (!res.ok || data.error) {
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }

        // Actualizar snapshot lateral con datos reales devueltos por la API
        if (data.context) {
          setSnapshot(data.context);
        }

        const copilotMsg: Message = {
          id: `cop-${Date.now()}`,
          sender: "copilot",
          content: data.reply ?? "Sin respuesta del servidor.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          sources: data.sources ?? [],
        };

        setMessages((prev) => [...prev, copilotMsg]);
      } catch (err) {
        const errorMsg: Message = {
          id: `err-${Date.now()}`,
          sender: "copilot",
          content: `⚠️ **Error al conectar con el Copiloto**: ${err instanceof Error ? err.message : "Error desconocido"}. Comprueba tu sesión y la configuración del servidor.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isError: true,
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsTyping(false);
      }
    },
    [inputQuery, isTyping, defaultQuarter, defaultYear]
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Motor Explicativo OpenAI gpt-4o-mini
          </span>
          <span className="size-2 rounded-full bg-primary animate-pulse" />
          <Badge variant="muted" className="text-[10px] ml-auto">
            {defaultQuarter} {defaultYear}
          </Badge>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Copiloto Fiscal — &quot;Explícame mis números&quot;
        </h1>
        <p className="text-sm text-muted-foreground">
          Asistencia técnica fundamentada en la normativa tributaria española y en los datos{" "}
          <strong className="text-foreground">reales</strong> de tu negocio. Sin respuestas genéricas.
        </p>
      </div>

      {/* Main Grid: Chat (8 cols) vs Snapshot Context (4 cols) */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Chat Interface (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Quick prompt suggestions */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                disabled={isTyping}
                className="text-[11px] rounded-lg border border-border/80 bg-card px-2.5 py-1 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed"
              >
                &ldquo;{prompt}&rdquo;
              </button>
            ))}
          </div>

          {/* Chat Window */}
          <Card className="flex flex-col h-[560px] p-0 overflow-hidden border-border/80">
            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 text-xs leading-relaxed ${
                    m.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {m.sender === "copilot" && (
                    <div className="size-8 rounded-xl bg-primary/15 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                      <BotMessageSquare className="size-4" />
                    </div>
                  )}

                  <div
                    className={`rounded-2xl p-4 max-w-xl space-y-2 ${
                      m.sender === "user"
                        ? "bg-primary text-primary-foreground font-medium rounded-tr-none"
                        : m.isError
                        ? "bg-destructive/10 border border-destructive/30 text-foreground rounded-tl-none"
                        : "bg-secondary/70 border border-border/60 text-foreground rounded-tl-none"
                    }`}
                  >
                    {/* Renderizado básico de markdown (negrita, listas) */}
                    <div className="whitespace-pre-line leading-relaxed">
                      {m.content.split("\n").map((line, i) => {
                        // Negrita **texto**
                        const parts = line.split(/(\*\*[^*]+\*\*)/g);
                        return (
                          <span key={i} className="block">
                            {parts.map((part, j) =>
                              part.startsWith("**") && part.endsWith("**") ? (
                                <strong key={j}>{part.slice(2, -2)}</strong>
                              ) : (
                                part
                              )
                            )}
                          </span>
                        );
                      })}
                    </div>

                    {m.sources && m.sources.length > 0 && (
                      <div className="pt-2 mt-2 border-t border-border/30 flex flex-wrap gap-1 items-center">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <ShieldCheck className="size-3 text-primary" /> Fuentes verificadas:
                        </span>
                        {m.sources.map((s, i) => (
                          <span
                            key={i}
                            className="text-[9px] font-mono bg-card px-1.5 py-0.5 rounded border border-border/40 text-foreground/80"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    <div
                      className={`text-[9px] font-mono mt-1 ${
                        m.sender === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                      }`}
                    >
                      {m.timestamp}
                    </div>
                  </div>

                  {m.sender === "user" && (
                    <div className="size-8 rounded-xl bg-card text-foreground border border-border flex items-center justify-center shrink-0">
                      <User className="size-4" />
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-3 text-xs justify-start items-center">
                  <div className="size-8 rounded-xl bg-primary/15 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                    <Sparkles className="size-4 animate-spin" />
                  </div>
                  <div className="rounded-2xl bg-secondary/70 border border-border/60 p-3 text-muted-foreground rounded-tl-none animate-pulse">
                    Consultando datos fiscales reales y normativa AEAT...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-border bg-card/80">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder="Pregúntale al Copiloto sobre IVA, retenciones, facturas o Modelo 303..."
                  className="flex-1 h-10 rounded-xl border border-border bg-background px-3.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  disabled={isTyping}
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="default"
                  className="gap-1.5 h-10 px-4 text-xs font-semibold"
                  disabled={!inputQuery.trim() || isTyping}
                >
                  <span>Enviar</span>
                  <Send className="size-3.5" />
                </Button>
              </form>
            </div>
          </Card>
        </div>

        {/* Snapshot Context Sidebar (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Contexto fiscal en tiempo real */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Contexto Fiscal Activo</CardTitle>
                <Badge variant="primary" className="text-[10px]">
                  {defaultQuarter} {defaultYear}
                </Badge>
              </div>
              <CardDescription>
                {snapshot
                  ? "Datos reales — actualizados en cada consulta"
                  : "Haz tu primera consulta para cargar los datos"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-2 text-xs font-mono">
              {snapshot ? (
                <>
                  <div className="flex justify-between border-b border-border/40 pb-2">
                    <span className="text-muted-foreground font-sans flex items-center gap-1">
                      <TrendingUp className="size-3" /> IVA Repercutido:
                    </span>
                    <span className="text-warning font-semibold">
                      {formatCurrency(snapshot.collectedVat)}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-border/40 pb-2">
                    <span className="text-muted-foreground font-sans flex items-center gap-1">
                      <TrendingDown className="size-3" /> IVA Soportado:
                    </span>
                    <span className="text-primary font-semibold">
                      {formatCurrency(snapshot.deductibleVat)}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-border/40 pb-2">
                    <span className="text-muted-foreground font-sans">Resultado 303:</span>
                    <span
                      className={`font-bold ${
                        snapshot.netVat >= 0 ? "text-destructive" : "text-primary"
                      }`}
                    >
                      {formatCurrency(snapshot.netVat)}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-border/40 pb-2">
                    <span className="text-muted-foreground font-sans flex items-center gap-1">
                      <FileText className="size-3" /> Docs pendientes:
                    </span>
                    <span className={snapshot.pendingDocuments > 0 ? "text-warning" : "text-primary"}>
                      {snapshot.pendingDocuments}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-sans flex items-center gap-1">
                      <AlertTriangle className="size-3" /> Alertas activas:
                    </span>
                    <span className={snapshot.openAlerts > 0 ? "text-destructive" : "text-primary"}>
                      {snapshot.openAlerts}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 gap-2 text-muted-foreground font-sans">
                  <Sparkles className="size-6 text-primary/40" />
                  <p className="text-[11px] text-center">
                    El panel se actualizará con datos reales tras tu primera consulta
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Negocio activo */}
          {business && (
            <Card className="border-border/60 bg-secondary/20">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-2">
                  <div className="size-8 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
                    <BotMessageSquare className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{business.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {business.nif ?? "NIF no configurado"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Regla anti-alucinación */}
          <Card className="border-border/60 bg-secondary/30">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="size-4 text-warning" />
                <CardTitle className="text-xs">Regla de Oro Anti-Alucinación</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-[11px] text-muted-foreground leading-relaxed">
              El Copiloto opera en modo determinista asistido:{" "}
              <strong>no inventa importes ni deducciones ficticias</strong>. Si un gasto no está
              amparado por una factura formal registrada en el sistema, no es computado.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
