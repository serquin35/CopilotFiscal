"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  ZoomIn,
  ZoomOut,
  Share2,
  Sparkles,
  Check,
  FileCheck,
  ShieldAlert,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { initialDocuments } from "@/lib/mockData";
import { FiscalDocument } from "@/types";

export default function DocumentReviewPage() {
  const params = useParams();
  const router = useRouter();
  const docId = params.id as string;

  // Encontrar o seleccionar documento por defecto
  const baseDoc = initialDocuments.find((d) => d.id === docId) || initialDocuments[0];

  // Estado local para los campos editables
  const [doc, setDoc] = useState<FiscalDocument>(baseDoc);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const handleFieldChange = (field: keyof FiscalDocument, value: string | number | undefined) => {
    setDoc((prev) => {
      const updated = { ...prev, [field]: value };
      // Recalcular cuota y total si cambia base o tasa de IVA
      if (field === "baseAmount" || field === "vatRate") {
        const base = field === "baseAmount" ? Number(value) || 0 : prev.baseAmount || 0;
        const rate = field === "vatRate" ? Number(value) || 0 : prev.vatRate || 0;
        const vat = Number(((base * rate) / 100).toFixed(2));
        updated.vatAmount = vat;
        updated.totalAmount = Number((base + vat).toFixed(2));
      }
      return updated;
    });
  };

  const handleDismissAnomaly = (alertId: string) => {
    setDoc((prev) => ({
      ...prev,
      anomalies: prev.anomalies?.filter((a) => a.id !== alertId),
    }));
  };

  const handleApprove = () => {
    setDoc((prev) => ({ ...prev, status: "REVIEWED" }));
    setActionFeedback("¡Documento validado y aprobado para el Modelo 303!");
    setTimeout(() => {
      router.push("/documents");
    }, 1500);
  };

  const handleReject = () => {
    setDoc((prev) => ({ ...prev, status: "REJECTED" }));
    setActionFeedback("Documento marcado como rechazado/no deducible.");
    setTimeout(() => {
      router.push("/documents");
    }, 1500);
  };

  const handleEscalate = () => {
    setActionFeedback("Expediente escalado al buzón del Gestor Contable externo.");
    setTimeout(() => {
      setActionFeedback(null);
    }, 3000);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Breadcrumb & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/documents"
            className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Human-in-the-Loop Review
              </span>
              <StatusBadge status={doc.status} />
            </div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight flex items-center gap-2">
              {doc.filename}
              <span className="text-xs text-muted-foreground font-mono font-normal">
                ({doc.id})
              </span>
            </h1>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {actionFeedback && (
          <div className="inline-flex items-center gap-2 rounded-xl bg-primary/20 text-primary border border-primary/30 px-3.5 py-1.5 text-xs font-medium animate-pulse">
            <Check className="size-3.5" />
            <span>{actionFeedback}</span>
          </div>
        )}
      </div>

      {/* Main Split Layout: Left Viewer (60%) vs Right Panel (40%) */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left Column: Document Viewer (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-2 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileCheck className="size-4 text-primary" />
              <span>Visor de Documento Original (Sandbox Inmutable)</span>
            </div>
            {/* Viewer Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
                className="size-7 rounded-md border border-border bg-secondary flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
                title="Reducir zoom"
              >
                <ZoomOut className="size-3.5" />
              </button>
              <span className="font-mono text-xs px-2 text-muted-foreground">
                {zoomLevel}%
              </span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
                className="size-7 rounded-md border border-border bg-secondary flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
                title="Aumentar zoom"
              >
                <ZoomIn className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Visual Document Canvas Simulation */}
          <div className="relative min-h-[560px] rounded-2xl border border-border bg-black/40 p-6 flex items-center justify-center overflow-auto shadow-inner">
            <div
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
              className="w-full max-w-lg rounded-xl bg-white text-neutral-900 p-8 shadow-2xl transition-transform duration-200"
            >
              {/* Simulated Invoice Header */}
              <div className="flex justify-between items-start border-b border-neutral-200 pb-4 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
                    {doc.providerName || "PROVEEDOR S.L."}
                  </h2>
                  <p className="text-xs text-neutral-500 font-mono mt-0.5">NIF: {doc.nif || "B00000000"}</p>
                  <p className="text-xs text-neutral-500">Calle Fiscal 10, Planta 2, Madrid</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2 py-0.5 rounded bg-neutral-100 text-[11px] font-mono font-semibold text-neutral-700">
                    FACTURA OFICIAL
                  </span>
                  <p className="text-xs font-mono font-semibold text-neutral-800 mt-1">
                    {doc.invoiceNumber || "INV-2026-X"}
                  </p>
                  <p className="text-xs text-neutral-500 font-mono">
                    Fecha: {doc.date || "2026-09-25"}
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="py-4 space-y-3">
                <div className="text-xs font-semibold text-neutral-700 uppercase tracking-wider border-b border-neutral-100 pb-1 flex justify-between">
                  <span>Concepto</span>
                  <span>Importe</span>
                </div>
                <div className="flex justify-between text-xs text-neutral-800">
                  <div>
                    <p className="font-medium">{doc.category || "Servicios profesionales prestados"}</p>
                    <p className="text-[11px] text-neutral-500">Periodo septiembre 2026</p>
                  </div>
                  <span className="font-mono">{formatCurrency(doc.baseAmount || 0)}</span>
                </div>
              </div>

              {/* Totals Breakdown */}
              <div className="border-t border-neutral-200 pt-4 mt-8 space-y-1.5 text-xs">
                <div className="flex justify-between text-neutral-600">
                  <span>Base Imponible:</span>
                  <span className="font-mono">{formatCurrency(doc.baseAmount || 0)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>IVA ({doc.vatRate || 21}%):</span>
                  <span className="font-mono">{formatCurrency(doc.vatAmount || 0)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-neutral-900 border-t border-neutral-200 pt-2">
                  <span>TOTAL A PAGAR:</span>
                  <span className="font-mono text-base">{formatCurrency(doc.totalAmount || 0)}</span>
                </div>
              </div>

              {/* Footer Stamp / Watermark */}
              <div className="mt-8 pt-4 border-t border-neutral-100 flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                <span>DIGITALIZADO POR COPILOTO FISCAL</span>
                <span>SHA-256: 7f8a9...b4c2</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Extracted Fields & Validation (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Anomalies Card (if any) */}
          {doc.anomalies && doc.anomalies.length > 0 && (
            <Card className="border-destructive/40 bg-destructive/10">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-destructive">
                  <ShieldAlert className="size-4" />
                  <CardTitle className="text-sm">Alertas Detectadas por la IA</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {doc.anomalies.map((anom) => (
                  <div
                    key={anom.id}
                    className="rounded-xl border border-destructive/30 bg-card p-3 text-xs space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <span className="font-medium text-foreground">{anom.title}</span>
                      <span className="text-[10px] font-mono uppercase bg-destructive/20 text-destructive px-1.5 py-0.5 rounded">
                        {anom.severity}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                      {anom.description}
                    </p>
                    <button
                      onClick={() => handleDismissAnomaly(anom.id)}
                      className="text-xs text-primary font-medium hover:underline pt-1"
                    >
                      Descartar anomalía (Confirmada correcta)
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Extracted Data Form */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  <CardTitle className="text-base">Datos Extraídos por el Pipeline</CardTitle>
                </div>
                <Badge variant="primary" className="text-[10px]">
                  Confianza: 98%
                </Badge>
              </div>
              <CardDescription>
                Puedes editar cualquier campo antes de aprobar. La decisión es 100% tuya.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Proveedor y NIF */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground block mb-1">
                    Proveedor / Razón Social
                  </label>
                  <input
                    type="text"
                    value={doc.providerName || ""}
                    onChange={(e) => handleFieldChange("providerName", e.target.value)}
                    className="w-full h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">
                    NIF / CIF Emisor
                  </label>
                  <input
                    type="text"
                    value={doc.nif || ""}
                    onChange={(e) => handleFieldChange("nif", e.target.value)}
                    className="w-full h-8 font-mono rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">
                    Nº Factura
                  </label>
                  <input
                    type="text"
                    value={doc.invoiceNumber || ""}
                    onChange={(e) => handleFieldChange("invoiceNumber", e.target.value)}
                    className="w-full h-8 font-mono rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              {/* Fecha y Categoría */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">
                    Fecha de Emisión
                  </label>
                  <input
                    type="date"
                    value={doc.date || ""}
                    onChange={(e) => handleFieldChange("date", e.target.value)}
                    className="w-full h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">
                    Categoría de Gasto
                  </label>
                  <select
                    value={doc.category || "Servicios"}
                    onChange={(e) => handleFieldChange("category", e.target.value)}
                    className="w-full h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:ring-1 focus:ring-ring"
                  >
                    <option value="Servicios Cloud / Hosting">Servicios Cloud / Hosting</option>
                    <option value="Software y Licencias">Software y Licencias</option>
                    <option value="Servicios Profesionales / Legal">Servicios Profesionales</option>
                    <option value="Comidas de Negocios / Relaciones Públicas">Restauración y Dietas</option>
                    <option value="Combustible y Desplazamientos">Combustible / Transporte</option>
                    <option value="Suministros y Material">Suministros Oficina</option>
                  </select>
                </div>
              </div>

              {/* Importes e IVA */}
              <div className="rounded-xl border border-border/80 bg-secondary/30 p-3 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">
                      Base Imponible (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={doc.baseAmount || 0}
                      onChange={(e) => handleFieldChange("baseAmount", e.target.value)}
                      className="w-full h-8 font-mono rounded-lg border border-border bg-background px-2 text-xs text-foreground text-right focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">
                      IVA (%)
                    </label>
                    <select
                      value={doc.vatRate || 21}
                      onChange={(e) => handleFieldChange("vatRate", e.target.value)}
                      className="w-full h-8 font-mono rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:ring-1 focus:ring-ring"
                    >
                      <option value={21}>21% General</option>
                      <option value={10}>10% Reducido</option>
                      <option value={4}>4% Superreducido</option>
                      <option value={0}>0% Exento</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">
                      Cuota IVA (€)
                    </label>
                    <input
                      type="number"
                      readOnly
                      value={doc.vatAmount || 0}
                      className="w-full h-8 font-mono rounded-lg border border-border/60 bg-muted px-2 text-xs text-muted-foreground text-right"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <span className="text-xs font-medium text-foreground">TOTAL FACTURA:</span>
                  <span className="text-base font-semibold font-mono text-primary">
                    {formatCurrency(doc.totalAmount || 0)}
                  </span>
                </div>
              </div>

              {/* Grado de Deducibilidad IRPF / IVA */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">
                  Nivel de Deducibilidad Fiscal
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 100, label: "100% Total" },
                    { val: 50, label: "50% Parcial" },
                    { val: 0, label: "0% No Deducible" },
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => handleFieldChange("deductiblePercentage", item.val)}
                      className={`h-8 rounded-lg border text-xs font-medium transition-all ${
                        doc.deductiblePercentage === item.val
                          ? "border-primary bg-primary/20 text-primary font-semibold"
                          : "border-border bg-background text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Reasoning Note */}
              {doc.aiNotes && (
                <div className="rounded-xl bg-card border border-border/60 p-3 text-xs text-muted-foreground flex gap-2">
                  <Sparkles className="size-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    <strong className="text-foreground">Criterio IA:</strong> {doc.aiNotes}
                  </p>
                </div>
              )}
            </CardContent>

            {/* Bottom Actions Bar */}
            <CardFooter className="flex flex-col gap-2 pt-4">
              <Button
                variant="primary"
                className="w-full gap-2 text-xs h-10 shadow-sm"
                onClick={handleApprove}
              >
                <CheckCircle2 className="size-4" />
                <span>Aprobar Extracción &amp; Conciliar en Modelo 303</span>
              </Button>

              <div className="grid grid-cols-2 gap-2 w-full">
                <Button
                  variant="destructive"
                  className="gap-1.5 text-xs h-9"
                  onClick={handleReject}
                >
                  <XCircle className="size-3.5" />
                  <span>Rechazar Gasto</span>
                </Button>
                <Button
                  variant="secondary"
                  className="gap-1.5 text-xs h-9"
                  onClick={handleEscalate}
                >
                  <Share2 className="size-3.5" />
                  <span>Escalar a Gestor</span>
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
