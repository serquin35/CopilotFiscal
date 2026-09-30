"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  UploadCloud,
  ChevronRight,
  TrendingDown,
  Info,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { ProgressBar, VatSegmentedBar } from "@/components/ui/progress";
import { formatCurrency, formatDate } from "@/lib/utils";
import { initialSummary, initialDocuments, initialAlerts } from "@/lib/mockData";
import { FiscalDocument } from "@/types";

export default function DashboardPage() {
  const [summary] = useState(initialSummary);
  const [documents, setDocuments] = useState<FiscalDocument[]>(initialDocuments);
  const [alerts] = useState(initialAlerts.filter((a) => !a.resolved));

  const handleQuickApprove = (docId: string) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, status: "REVIEWED" } : d))
    );
  };

  const handleQuickReject = (docId: string) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, status: "REJECTED" } : d))
    );
  };

  const deductiblePercentage =
    (summary.deductibleVat / (summary.collectedVat || 1)) * 100;

  return (
    <div className="flex flex-col gap-8">
      {/* 1. Header / Eyebrow */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Liquidación Trimestral AEAT
          </span>
          <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl text-foreground mt-1">
            Modelo 303 — {summary.quarter} {summary.year}
          </h1>
          <p className="text-pretty text-sm text-muted-foreground mt-1">
            Conciliación en tiempo real de facturas emitidas, recibidas y deducibilidad fiscal calculada.
          </p>
        </div>

        {/* Trimestre Selector */}
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 self-start md:self-auto">
          {(["1T", "2T", "3T", "4T"] as const).map((q) => (
            <button
              key={q}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                q === summary.quarter
                  ? "bg-secondary text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Top Metric Cards Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* IVA a Liquidar Card (Main Card) */}
        <Card className="md:col-span-2 relative overflow-hidden border-border/80 bg-gradient-to-br from-card to-secondary/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardDescription>Resultado estimado de liquidación</CardDescription>
              <CardTitle className="text-xl mt-0.5">IVA Neto a Ingresar</CardTitle>
            </div>
            <div className="rounded-xl bg-warning/10 border border-warning/20 p-2 text-warning">
              <TrendingDown className="size-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="font-mono text-5xl md:text-6xl font-semibold tracking-tight text-warning">
                {formatCurrency(summary.netVat)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Diferencia entre IVA repercutido a tus clientes e IVA soportado en compras deducibles.
              </p>
            </div>

            {/* Segmented VAT visualizer */}
            <div className="space-y-2 pt-2 border-t border-border/40">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1.5 text-primary">
                  <span className="size-2 rounded-full bg-primary" />
                  Soportado (deducible): <strong>{formatCurrency(summary.deductibleVat)}</strong>
                </span>
                <span className="flex items-center gap-1.5 text-warning">
                  <span className="size-2 rounded-full bg-warning" />
                  A Ingresar a Hacienda: <strong>{formatCurrency(summary.netVat)}</strong>
                </span>
              </div>
              <VatSegmentedBar deductiblePercentage={deductiblePercentage} />
              <div className="flex justify-between text-[11px] text-muted-foreground pt-1">
                <span>Total Repercutido: {formatCurrency(summary.collectedVat)}</span>
                <span>Tasa efectiva soportada: {deductiblePercentage.toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deadline & Completeness Card */}
        <div className="flex flex-col gap-6">
          {/* Deadline Card */}
          <Card className="flex-1 flex flex-col justify-between">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>Plazo de presentación oficial</CardDescription>
                <Calendar className="size-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-lg">Fecha límite AEAT</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-mono text-4xl font-semibold tabular-nums text-foreground">
                {summary.daysRemaining} <span className="text-lg font-normal text-muted-foreground">días</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Límite de domiciliación: <strong>{formatDate(summary.deadline)}</strong>
              </p>
            </CardContent>
          </Card>

          {/* Data Completeness Card */}
          <Card className="flex-1 flex flex-col justify-between">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>Completitud de datos fiscales</CardDescription>
                <span className="font-mono text-xs font-semibold text-primary">
                  {summary.dataCompleteness}%
                </span>
              </div>
              <CardTitle className="text-lg">Cierre de Facturación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ProgressBar value={summary.dataCompleteness} />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{summary.pendingReviewCount} facturas sin conciliar</span>
                <Link
                  href="/documents"
                  className="text-primary hover:underline flex items-center gap-0.5"
                >
                  Subir pendientes <ChevronRight className="size-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 3. Secondary Section: Urgent Alerts & Monthly Progression */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Urgent Alerts Widget (1 col) */}
        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-warning" />
                <CardTitle className="text-base">Anomalías Pendientes</CardTitle>
              </div>
              <span className="size-5 rounded-full bg-destructive/15 text-destructive border border-destructive/20 text-xs flex items-center justify-center font-mono">
                {alerts.length}
              </span>
            </div>
            <CardDescription>
              Discrepancias detectadas por los workflows de n8n
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No hay anomalías pendientes. Todo en orden.
              </div>
            ) : (
              alerts.slice(0, 2).map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-xl border border-border/60 bg-secondary/50 p-3 text-xs space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-foreground leading-tight">
                      {alert.title}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase ${
                        alert.severity === "high"
                          ? "bg-destructive/20 text-destructive border border-destructive/30"
                          : "bg-warning/20 text-warning border border-warning/30"
                      }`}
                    >
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">
                    {alert.description}
                  </p>
                </div>
              ))
            )}
            <Link
              href="/alerts"
              className="mt-2 block w-full text-center text-xs text-primary font-medium hover:underline pt-2"
            >
              Ver todas las anomalías &rarr;
            </Link>
          </CardContent>
        </Card>

        {/* Monthly Progression / Evolution (2 cols) */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Evolución Mensual del Trimestre</CardTitle>
                <CardDescription>
                  Comparativa de IVA repercutido (ventas) frente a soportado (gastos)
                </CardDescription>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-warning" /> Repercutido
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-primary" /> Soportado
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 pt-2">
              {summary.monthlyBreakdown.map((item) => {
                const maxVal = 2500;
                const collPercent = (item.collected / maxVal) * 100;
                const dedPercent = (item.deductible / maxVal) * 100;
                const monthDiff = item.collected - item.deductible;

                return (
                  <div key={item.month} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-foreground">{item.month}</span>
                      <span className="font-mono text-muted-foreground">
                        Diferencia: <strong className="text-foreground">{formatCurrency(monthDiff)}</strong>
                      </span>
                    </div>
                    {/* Bars */}
                    <div className="space-y-1">
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-warning"
                          style={{ width: `${collPercent}%` }}
                          title={`Repercutido: ${formatCurrency(item.collected)}`}
                        />
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${dedPercent}%` }}
                          title={`Soportado: ${formatCurrency(item.deductible)}`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Recent Documents with Quick Validation Actions */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 gap-2">
          <div>
            <CardTitle className="text-base">Documentos Recientes e Ingesta</CardTitle>
            <CardDescription>
              Facturas extraídas por el pipeline n8n pendientes de tu aprobación o ya confirmadas
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/documents">
              <Button size="sm" variant="secondary" className="gap-1.5">
                <UploadCloud className="size-3.5" />
                <span>Gestor de Archivos</span>
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/60 text-muted-foreground uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="pb-3 font-medium">Documento</th>
                  <th className="pb-3 font-medium">Proveedor / NIF</th>
                  <th className="pb-3 font-medium">Fecha</th>
                  <th className="pb-3 font-medium text-right">Base</th>
                  <th className="pb-3 font-medium text-right">IVA (%)</th>
                  <th className="pb-3 font-medium text-right">Total</th>
                  <th className="pb-3 font-medium text-center">Estado</th>
                  <th className="pb-3 font-medium text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-mono">
                {documents.slice(0, 5).map((doc) => (
                  <tr key={doc.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 pr-2 font-sans font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-muted-foreground shrink-0" />
                        <div>
                          <div className="text-xs truncate max-w-[180px]">{doc.filename}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{doc.invoiceNumber || "S/N"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-2 font-sans">
                      <div className="text-foreground">{doc.providerName || "Desconocido"}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{doc.nif || "-"}</div>
                    </td>
                    <td className="py-3.5 px-2 text-muted-foreground font-sans text-xs">
                      {doc.date ? formatDate(doc.date) : "-"}
                    </td>
                    <td className="py-3.5 px-2 text-right text-foreground">
                      {doc.baseAmount ? formatCurrency(doc.baseAmount) : "-"}
                    </td>
                    <td className="py-3.5 px-2 text-right text-muted-foreground">
                      {doc.vatRate ? `${doc.vatRate}%` : "-"}
                    </td>
                    <td className="py-3.5 px-2 text-right font-semibold text-foreground">
                      {doc.totalAmount ? formatCurrency(doc.totalAmount) : "-"}
                    </td>
                    <td className="py-3.5 px-2 text-center font-sans">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td className="py-3.5 pl-2 text-center font-sans">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          href={`/documents/${doc.id}/review`}
                          className="size-7 rounded-lg border border-border bg-background flex items-center justify-center hover:bg-muted hover:text-primary transition-colors text-muted-foreground"
                          title="Revisión Humana en Detalle"
                        >
                          <Info className="size-3.5" />
                        </Link>
                        {doc.status === "PENDING_REVIEW" && (
                          <>
                            <button
                              onClick={() => handleQuickApprove(doc.id)}
                              className="size-7 rounded-lg border border-border bg-background flex items-center justify-center hover:bg-muted hover:text-primary transition-colors text-muted-foreground"
                              title="Aprobar extracción"
                            >
                              <CheckCircle2 className="size-3.5" />
                            </button>
                            <button
                              onClick={() => handleQuickReject(doc.id)}
                              className="size-7 rounded-lg border border-border bg-background flex items-center justify-center hover:bg-muted hover:text-destructive transition-colors text-muted-foreground"
                              title="Rechazar"
                            >
                              <XCircle className="size-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
