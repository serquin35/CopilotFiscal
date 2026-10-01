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
  ChevronDown,
  RotateCcw,
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

// ─── Constantes ───────────────────────────────────────────────────────────────

const QUARTERS = ["1T", "2T", "3T", "4T"] as const;
type Quarter = (typeof QUARTERS)[number];

const QUICK_PROMPTS = [
  "¿Por qué tengo ese resultado en el Modelo 303?",
  "¿Qué anomalías activas pueden generar inspección AEAT?",
  "¿Puedo deducir el 100% de la factura de gasolina?",
  "¿Cuál es el plazo para presentar el Modelo 303?",
];

function getCurrentQuarter(): Quarter {
  const m = new Date().getMonth() + 1;
  if (m <= 3) return "1T";
  if (m <= 6) return "2T";
  if (m <= 9) return "3T";
  return "4T";
}

const WELCOME_MSG: Message = {
  id: "msg-welcome",
  sender: "copilot",
  content:
    "Hola. Soy tu **Copiloto Fiscal**. Analizo en tiempo real tus facturas y el cálculo del **Modelo 303** desde tu base de datos real.\n\nRecuerdo el contexto de nuestra conversación, así que puedes hacer preguntas de seguimiento. ¿En qué duda tributaria puedo ayudarte hoy?",
  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
};

// ─── Componente ───────────────────────────────────────────────────────────────

export default function CopilotPage() {
  const { business } = useAuth();
  const currentYear = new Date().getFullYear();

  const [selectedQuarter, setSelectedQuarter] = useState<Quarter>(getCurrentQuarter());
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
  const [inputQuery, setInputQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [snapshot, setSnapshot] = useState<FiscalSnapshot | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ── Reset de conversación ────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setMessages([
      {
        ...WELCOME_MSG,
        id: `msg-welcome-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setSnapshot(null);
    inputRef.current?.focus();
  }, []);

  // Resetear chat cuando cambia el trimestre
  const handleQuarterChange = useCallback(
    (q: Quarter) => {
      setSelectedQuarter(q);
      handleReset();
    },
    [handleReset]
  );

  // ── Construir historial para la API ─────────────────────────────────────────

  const buildHistory = useCallback(
    (currentMessages: Message[]) => {
      return currentMessages
        .filter((m) => !m.isError && m.id !== "msg-welcome" && !m.id.startsWith("msg-welcome-"))
        .map((m) => ({
          role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
          content: m.content,
        }));
    },
    []
  );

  // ── Enviar mensaje ───────────────────────────────────────────────────────────

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

      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      if (!textToSend) setInputQuery("");
      setIsTyping(true);

      try {
        const res = await fetch("/api/copilot/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: query,
            quarter: selectedQuarter,
            year: selectedYear,
            history: buildHistory(nextMessages), // historial INCLUYENDO el mensaje actual
          }),
        });

        const data = await res.json();

        if (!res.ok || data.error) {
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }

        if (data.context) setSnapshot(data.context);

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
          content: `⚠️ **Error al conectar con el Copiloto**: ${
            err instanceof Error ? err.message : "Error desconocido"
          }. Comprueba tu sesión e inténtalo de nuevo.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isError: true,
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsTyping(false);
      }
    },
    [inputQuery, isTyping, messages, selectedQuarter, selectedYear, buildHistory]
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Motor Explicativo OpenAI gpt-4o-mini
          </span>
          <span className="size-2 rounded-full bg-primary animate-pulse" />

          {/* Selector de trimestre */}
          <div className="ml-auto flex items-center gap-1.5">
            <div className="flex rounded-lg border border-border overflow-hidden text-[11px] font-mono">
              {QUARTERS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleQuarterChange(q)}
                  className={`px-2.5 py-1 transition-colors ${
                    selectedQuarter === q
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-card text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Selector de año */}
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(Number(e.target.value));
                  handleReset();
                }}
                className="appearance-none bg-card border border-border rounded-lg text-[11px] font-mono px-2.5 py-1 pr-6 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
              >
                {[currentYear - 1, currentYear].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground pointer-events-none" />
            </div>

            {/* Botón limpiar conversación */}
            <button
              onClick={handleReset}
              title="Nueva conversación"
              className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              <RotateCcw className="size-3.5" />
            </button>
          </div>
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Copiloto Fiscal — &quot;Explícame mis números&quot;
        </h1>
        <p className="text-sm text-muted-foreground">
          Asistencia técnica fundamentada en la normativa tributaria española y en los datos{" "}
          <strong className="text-foreground">reales</strong> de tu negocio. Recuerda el contexto
          de la conversación para preguntas de seguimiento.
        </p>
      </div>

      {/* Main Grid: Chat (8 cols) vs Snapshot (4 cols) */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Chat (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Quick prompts */}
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

          {/* Ventana de chat */}
          <Card className="flex flex-col h-[560px] p-0 overflow-hidden border-border/80">
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
                    {/* Markdown mínimo: negrita */}
                    <div className="whitespace-pre-line leading-relaxed">
                      {m.content.split("\n").map((line, i) => {
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
                    Consultando datos fiscales reales del {selectedQuarter} {selectedYear}...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border bg-card/80">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder={`Pregunta sobre el ${selectedQuarter} ${selectedYear}...`}
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

              {/* Indicador de contexto activo */}
              {messages.length > 1 && (
                <p className="text-[10px] text-muted-foreground/60 mt-1.5 text-center font-mono">
                  {Math.floor((messages.length - 1) / 2)} turno
                  {Math.floor((messages.length - 1) / 2) !== 1 ? "s" : ""} en contexto ·{" "}
                  <button onClick={handleReset} className="hover:text-muted-foreground underline">
                    Nueva conversación
                  </button>
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Trimestre activo */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Contexto Fiscal Activo</CardTitle>
                <Badge variant="primary" className="text-[10px] font-mono">
                  {selectedQuarter} {selectedYear}
                </Badge>
              </div>
              <CardDescription>
                {snapshot
                  ? "Datos reales — actualizados tras cada consulta"
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
                    <span className={`font-bold ${snapshot.netVat >= 0 ? "text-destructive" : "text-primary"}`}>
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
                    El panel se actualizará con datos reales del{" "}
                    <strong className="text-foreground">
                      {selectedQuarter} {selectedYear}
                    </strong>{" "}
                    tras tu primera consulta
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
