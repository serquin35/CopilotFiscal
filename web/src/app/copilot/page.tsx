"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  BotMessageSquare,
  Send,
  Sparkles,
  ShieldCheck,
  User,
  Lightbulb,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { initialSummary, initialAlerts } from "@/lib/mockData";

interface Message {
  id: string;
  sender: "user" | "copilot";
  content: string;
  timestamp: string;
  sources?: string[];
}

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg-1",
      sender: "copilot",
      content:
        "Hola. Soy tu **Copiloto Fiscal**. Analizo en tiempo real tus facturas y snapshots del **Modelo 303 (3T 2026)**. Toda mi información procede directamente de tu base de datos inmutable. ¿En qué duda tributaria o análisis de cifras puedo ayudarte hoy?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const QUICK_PROMPTS = [
    "¿Por qué tengo que pagar 2.710,30 € en este trimestre?",
    "¿Qué anomalías tengo pendientes que puedan generar inspección AEAT?",
    "¿Puedo deducir el 100% de la factura de gasolina de Repsol?",
    "¿Cuál es el plazo improrrogable para presentar el Modelo 303?",
  ];

  const handleSend = (textToSend?: string) => {
    const query = textToSend || inputQuery;
    if (!query.trim()) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputQuery("");
    setIsTyping(true);

    setTimeout(() => {
      let botResponse = "";
      let sources: string[] = [];

      const lower = query.toLowerCase();

      if (lower.includes("por qué") || lower.includes("pagar") || lower.includes("2.710")) {
        botResponse = `Tu liquidación provisional del **3T 2026** arroja un resultado a ingresar de **${formatCurrency(
          initialSummary.netVat
        )}** debido a la siguiente fórmula oficial:\n\n1. **IVA Repercutido (Tus ventas):** ${formatCurrency(
          initialSummary.collectedVat
        )}\n2. **IVA Soportado Deducible (Tus compras):** ${formatCurrency(
          initialSummary.deductibleVat
        )}\n\n**Resultado neto:** ${formatCurrency(
          initialSummary.collectedVat
        )} - ${formatCurrency(initialSummary.deductibleVat)} = **${formatCurrency(
          initialSummary.netVat
        )}**.\n\nActualmente tienes **${
          initialSummary.pendingReviewCount
        } facturas pendientes de validar**. Si apruebas los gastos pendientes, tu cuota soportada aumentará y el importe a ingresar se reducirá.`;
        sources = ["Modelo 303 - Snapshot 3T", "Casillas 27 y 28 AEAT"];
      } else if (lower.includes("anomalía") || lower.includes("inspección")) {
        botResponse = `Actualmente tu Centro de Anomalías registra **${initialAlerts.length} alertas activas**:\n\n- **Posible duplicado en AWS Cloud (${formatCurrency(
          145.2
        )})**: Misma fecha e importe que otra factura. Riesgo de doble cómputo indebido.\n- **Gasto elevado en Legal Tech (${formatCurrency(
          5200.0
        )})**: Supera el umbral de 3.000 € y requiere justificación de retención IRPF.\n- **Ticket de combustible sin desglose de IVA**.\n\nTe recomiendo revisar la sección **/alerts** para justificarlas antes de exportar el borrador definitivo.`;
        sources = ["Motor de Reglas n8n AnomalyDetector", "Censo AEAT VIES"];
      } else if (lower.includes("gasolina") || lower.includes("repsol") || lower.includes("vehículo")) {
        botResponse = `Conforme al **artículo 95 de la Ley del IVA (LIVA)** y la doctrina de la DGT para vehículos turismos utilizados por profesionales:\n\n- Se presume una **afectación máxima del 50%** de los gastos de carburante y mantenimiento, salvo que el vehículo sea de uso comercial exclusivo o transporte de mercancías.\n- El sistema ha clasificado provisionalmente tu ticket de Repsol al **50% de deducibilidad** (${formatCurrency(
          7.38
        )} de IVA deducible sobre los 14,75 € totales) para evitar requerimientos automáticos de la AEAT.`;
        sources = ["Ley 37/1992 del IVA (Art. 95)", "Consulta Vinculante DGT V0138-20"];
      } else if (lower.includes("plazo") || lower.includes("fecha") || lower.includes("límite")) {
        botResponse = `El plazo legal para la presentación de la declaración del **3T 2026 (Modelo 303)** finaliza el **${formatDate(
          initialSummary.deadline
        )}**.\n\n- Si deseas **domiciliación bancaria**, la fecha límite es el **15 de Octubre de 2026**.\n- Te quedan **${
          initialSummary.daysRemaining
        } días** para completar la conciliación documental.`;
        sources = ["Calendario del Contribuyente AEAT 2026"];
      } else {
        botResponse = `He revisado tus datos fiscales. En tu cuenta actual del 3T tienes un **IVA Repercutido de ${formatCurrency(
          initialSummary.collectedVat
        )}** y **${formatCurrency(
          initialSummary.deductibleVat
        )} deducibles**, con una completitud del **${initialSummary.dataCompleteness}%**.\n\n¿Quieres que profundicemos en algún proveedor, anomalía o categoría de gasto específica?`;
        sources = ["Base de Datos Fiscal Copiloto"];
      }

      const copilotMsg: Message = {
        id: `cop-${Date.now()}`,
        sender: "copilot",
        content: botResponse,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        sources,
      };

      setMessages((prev) => [...prev, copilotMsg]);
      setIsTyping(false);
    }, 900);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Motor Explicativo OpenAI gpt-4o
          </span>
          <span className="size-2 rounded-full bg-primary animate-pulse" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Copiloto Fiscal — &quot;Explícame mis números&quot;
        </h1>
        <p className="text-sm text-muted-foreground">
          Asistencia técnica fundamentada en la normativa tributaria española y en los datos reales de tu negocio. Sin respuestas genéricas.
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
                className="text-[11px] rounded-lg border border-border/80 bg-card px-2.5 py-1 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all text-left"
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
                        : "bg-secondary/70 border border-border/60 text-foreground rounded-tl-none"
                    }`}
                  >
                    <div className="whitespace-pre-line prose prose-invert prose-xs">
                      {m.content}
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
                    Consultando libro contable y normativa AEAT...
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
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Contexto Fiscal Activo</CardTitle>
                <Badge variant="primary" className="text-[10px]">
                  3T 2026
                </Badge>
              </div>
              <CardDescription>
                Datos inmutables en los que el Copiloto apoya sus respuestas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-2 text-xs font-mono">
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground font-sans">IVA Repercutido:</span>
                <span className="text-warning font-semibold">
                  {formatCurrency(initialSummary.collectedVat)}
                </span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground font-sans">IVA Soportado:</span>
                <span className="text-primary font-semibold">
                  {formatCurrency(initialSummary.deductibleVat)}
                </span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground font-sans">Resultado Modelo 303:</span>
                <span className="text-foreground font-bold">
                  {formatCurrency(initialSummary.netVat)}
                </span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground font-sans">Completitud:</span>
                <span className="text-foreground">{initialSummary.dataCompleteness}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-sans">Días para el cierre:</span>
                <span className="text-foreground">{initialSummary.daysRemaining} días</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-secondary/30">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="size-4 text-warning" />
                <CardTitle className="text-xs">Regla de Oro Anti-Alucinación</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-[11px] text-muted-foreground leading-relaxed">
              El Copiloto opera en modo determinista asistido: <strong>no inventa importes ni deducciones ficticias</strong>. Si un gasto no está amparado por una factura formal registrada en el sistema, no es computado.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
