"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  FileText,
  ExternalLink,
  Info,
  Clock,
  Check,
} from "lucide-react";
import { Card, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AnomalyAlert, FiscalDocument } from "@/types";
import { useAuth } from "@/context/AuthContext";
import {
  detectFiscalAnomalies,
  AnomalyEngineExpense,
  AnomalyEngineIncome,
  AnomalyEngineSupplier,
} from "@/lib/anomalyEngine";

export default function AlertsPage() {
  const { business, supabase } = useAuth();
  const currentBizId = business?.id;

  const [documents, setDocuments] = useState<FiscalDocument[]>([]);
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<string>("ALL");
  const [feedback, setFeedback] = useState<string | null>(null);

  const STORAGE_KEY = currentBizId
    ? `copiloto_fiscal_documents_${currentBizId}`
    : "copiloto_fiscal_documents_demo";
  const RESOLVED_ALERTS_KEY = currentBizId
    ? `copiloto_fiscal_resolved_alerts_${currentBizId}`
    : "copiloto_fiscal_resolved_alerts_demo";

  const loadAlertsData = useCallback(async () => {
    if (!currentBizId) return;

    let resolvedMap: Record<string, string> = {};
    try {
      const savedRes = localStorage.getItem(RESOLVED_ALERTS_KEY);
      if (savedRes) {
        resolvedMap = JSON.parse(savedRes);
      }
    } catch {}

    let currentDocs: FiscalDocument[] = [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as FiscalDocument[];
        if (Array.isArray(parsed)) {
          currentDocs = parsed.filter((d) => !d.id.startsWith("doc-"));
        }
      }
    } catch (e) {
      console.warn("Error leyendo localStorage en Alerts:", e);
    }

    let fetchedExpenses: AnomalyEngineExpense[] = [];
    let fetchedDocs: FiscalDocument[] = [];
    let fetchedIncome: AnomalyEngineIncome[] = [];
    let fetchedSuppliers: AnomalyEngineSupplier[] = [];

    try {
      const [expRes, docRes, incRes, supRes, dbAlertsRes] = await Promise.all([
        supabase
          .from("expenses")
          .select("*, suppliers(name, tax_id_masked)")
          .eq("business_id", currentBizId)
          .order("date", { ascending: false }),
        supabase
          .from("documents")
          .select("*, document_extractions(*)")
          .eq("business_id", currentBizId)
          .order("uploaded_at", { ascending: false }),
        supabase
          .from("income")
          .select("id, date, base_amount, vat_amount, total_amount, fiscal_period_quarter")
          .eq("business_id", currentBizId),
        supabase
          .from("suppliers")
          .select("id, name, tax_id_masked")
          .eq("business_id", currentBizId),
        supabase
          .from("alerts")
          .select("*")
          .eq("business_id", currentBizId),
      ]);

      if (expRes.data) fetchedExpenses = expRes.data as AnomalyEngineExpense[];
      if (incRes.data) fetchedIncome = incRes.data as AnomalyEngineIncome[];
      if (supRes.data) fetchedSuppliers = supRes.data as AnomalyEngineSupplier[];

      if (docRes.data && docRes.data.length > 0) {
        fetchedDocs = docRes.data.map((item: Record<string, unknown>) => {
          const extList = item.document_extractions as Record<string, unknown>[] | null;
          const ext = Array.isArray(extList) && extList.length > 0 ? extList[0] : null;
          return {
            id: String(item.id),
            filename: String(item.original_filename || "Documento"),
            fileSize: Number(item.file_size_bytes || 0),
            uploadedAt: String(item.uploaded_at || new Date().toISOString()),
            status: (item.status as FiscalDocument["status"]) || "PENDING_REVIEW",
            providerName: (ext?.extracted_supplier_name as string) || String(item.notes || "Proveedor"),
            nif: (ext?.extracted_supplier_nif as string) || "-",
            invoiceNumber: (ext?.extracted_invoice_number as string) || `F-${String(item.id).substring(0, 8)}`,
            date: (ext?.extracted_date as string) || String(item.uploaded_at || "").split("T")[0],
            baseAmount: Number(ext?.extracted_base_amount ?? 0),
            vatRate: Number(ext?.extracted_vat_rate ?? 21),
            vatAmount: Number(ext?.extracted_vat_amount ?? 0),
            totalAmount: Number(ext?.extracted_total_amount ?? 0),
            category: (ext?.extracted_category as string) || String(item.type || "Factura"),
            deductiblePercentage: 100,
          };
        });
      }

      // Si hay alertas en BD con estado RESOLVED, marcarlas
      if (dbAlertsRes.data) {
        for (const row of dbAlertsRes.data) {
          if (row.status === "RESOLVED" || row.status === "DISMISSED") {
            resolvedMap[row.id] = row.notes || "Resuelta en base de datos";
          }
        }
      }
    } catch (e) {
      console.warn("Error consultando Supabase en Alerts:", e);
    }

    const mergedDocs = [
      ...fetchedDocs,
      ...currentDocs.filter((cd) => !fetchedDocs.some((fd) => fd.id === cd.id)),
    ];
    setDocuments(mergedDocs);

    // 2. Ejecutar motor determinista de anomalías
    const detected = detectFiscalAnomalies({
      documents: mergedDocs,
      expenses: fetchedExpenses,
      income: fetchedIncome,
      suppliers: fetchedSuppliers,
      selectedQuarter: "4T",
      selectedYear: 2026,
    });

    // 3. Aplicar resoluciones guardadas
    const finalAlerts: AnomalyAlert[] = detected.map((a) => {
      if (resolvedMap[a.id]) {
        return { ...a, resolved: true, resolutionReason: resolvedMap[a.id] };
      }
      return a;
    });

    setAlerts(finalAlerts);

    // Guardar conteo activo para Navbar y Sidebar
    const activeCount = finalAlerts.filter((a) => !a.resolved).length;
    try {
      localStorage.setItem("copiloto_fiscal_active_alerts_count", String(activeCount));
    } catch {}
  }, [currentBizId, RESOLVED_ALERTS_KEY, STORAGE_KEY, supabase]);

  useEffect(() => {
    loadAlertsData();

    window.addEventListener("storage", loadAlertsData);
    window.addEventListener("fiscal_docs_updated", loadAlertsData);
    return () => {
      window.removeEventListener("storage", loadAlertsData);
      window.removeEventListener("fiscal_docs_updated", loadAlertsData);
    };
  }, [loadAlertsData]);

  const handleResolveAlert = async (id: string, reason: string) => {
    // 1. Actualizar estado local
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, resolved: true, resolutionReason: reason } : a
      )
    );

    // 2. Persistir resolución en localStorage
    try {
      const savedRes = localStorage.getItem(RESOLVED_ALERTS_KEY);
      const map: Record<string, string> = savedRes ? JSON.parse(savedRes) : {};
      map[id] = reason;
      localStorage.setItem(RESOLVED_ALERTS_KEY, JSON.stringify(map));

      const remainingCount = alerts.filter((a) => a.id !== id && !a.resolved).length;
      localStorage.setItem("copiloto_fiscal_active_alerts_count", String(remainingCount));
    } catch {}

    // 3. Registrar auditoría en Supabase
    try {
      await supabase.from("audit_events").insert([
        {
          business_id: currentBizId || "00000000-0000-0000-0000-000000000001",
          entity_type: "alert",
          entity_id: id.startsWith("anom-") ? null : id,
          action: "ALERT_DISMISSED",
          actor_type: "user",
          metadata: { alertId: id, reason, dismissedAt: new Date().toISOString() },
        },
      ]);
    } catch {}

    // 4. Notificar a Navbar y Sidebar
    window.dispatchEvent(new Event("fiscal_docs_updated"));
    window.dispatchEvent(new Event("storage"));

    setFeedback(`Alerta justificada y archivada: "${reason}"`);
    setTimeout(() => setFeedback(null), 3500);
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filterSeverity === "RESOLVED") return a.resolved;
    if (a.resolved) return false;
    if (filterSeverity === "ALL") return true;
    return a.severity === filterSeverity.toLowerCase();
  });

  const activeAlertsCount = alerts.filter((a) => !a.resolved).length;
  const highSeverityCount = alerts.filter((a) => !a.resolved && a.severity === "high").length;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-warning">
          Auditoría Predictiva &amp; Workflows n8n
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Centro de Anomalías y Alertas AEAT
        </h1>
        <p className="text-sm text-muted-foreground">
          Monitorización proactiva de discrepancias fiscales, facturas sospechosas de duplicidad y riesgos de comprobación limitada antes del cierre del 3T.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5 border-destructive/30 bg-destructive/5">
          <div className="flex items-center justify-between">
            <CardDescription className="text-destructive/80">Alertas Críticas</CardDescription>
            <ShieldAlert className="size-4 text-destructive" />
          </div>
          <div className="font-mono text-3xl font-semibold text-destructive mt-1">
            {highSeverityCount}
          </div>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            Riesgo directo de sanción o requerimiento AEAT
          </span>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <CardDescription>Total Pendientes</CardDescription>
            <Clock className="size-4 text-warning" />
          </div>
          <div className="font-mono text-3xl font-semibold text-foreground mt-1">
            {activeAlertsCount}
          </div>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            Esperando confirmación o corrección humana
          </span>
        </Card>

        <Card className="p-5 border-primary/30 bg-primary/5">
          <div className="flex items-center justify-between">
            <CardDescription className="text-primary/80">Resueltas / Justificadas</CardDescription>
            <ShieldCheck className="size-4 text-primary" />
          </div>
          <div className="font-mono text-3xl font-semibold text-primary mt-1">
            {alerts.filter((a) => a.resolved).length}
          </div>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            Trazabilidad y justificación archivada
          </span>
        </Card>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className="inline-flex items-center gap-2 rounded-xl bg-primary/20 text-primary border border-primary/30 px-4 py-2 text-xs font-medium animate-pulse">
          <Check className="size-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-lg bg-muted p-1">
          {[
            { id: "ALL", label: `Todas activas (${activeAlertsCount})` },
            { id: "HIGH", label: `Alta prioridad (${highSeverityCount})` },
            { id: "MEDIUM", label: "Media prioridad" },
            { id: "RESOLVED", label: "Historial resueltas" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterSeverity(tab.id)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                filterSeverity === tab.id
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Cards List */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <Card className="py-12 text-center text-xs text-muted-foreground">
            No se han encontrado anomalías en esta categoría. Todos los indicadores fiscales están conformes.
          </Card>
        ) : (
          filteredAlerts.map((alert) => {
            const relatedDoc = documents.find((d) => d.id === alert.documentId);

            return (
              <Card
                key={alert.id}
                className={`border transition-all ${
                  alert.resolved
                    ? "border-border/40 opacity-70"
                    : alert.severity === "high"
                    ? "border-destructive/40 bg-card hover:border-destructive/60"
                    : "border-warning/30 bg-card hover:border-warning/50"
                }`}
              >
                <div className="p-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left: Icon & Alert description */}
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex size-10 items-center justify-center rounded-xl shrink-0 mt-0.5 ${
                        alert.severity === "high"
                          ? "bg-destructive/15 text-destructive border border-destructive/25"
                          : "bg-warning/15 text-warning border border-warning/25"
                      }`}
                    >
                      <AlertTriangle className="size-5" />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-foreground">
                          {alert.title}
                        </h3>
                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                            alert.severity === "high"
                              ? "bg-destructive/15 text-destructive border-destructive/30"
                              : "bg-warning/15 text-warning border-warning/30"
                          }`}
                        >
                          Prioridad {alert.severity}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          ID: {alert.id}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
                        {alert.description}
                      </p>

                      {relatedDoc && (
                        <div className="inline-flex items-center gap-2 rounded-lg bg-secondary/60 border border-border/40 px-2.5 py-1 text-[11px] text-foreground mt-2">
                          <FileText className="size-3 text-muted-foreground" />
                          <span>
                            Documento asociado: <strong>{relatedDoc.filename}</strong> (
                            {relatedDoc.providerName})
                          </span>
                          <Link
                            href={`/documents/${relatedDoc.id}/review`}
                            className="text-primary hover:underline flex items-center gap-0.5 ml-1"
                          >
                            Ir a revisar <ExternalLink className="size-3" />
                          </Link>
                        </div>
                      )}

                      {alert.resolved && alert.resolutionReason && (
                        <div className="rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs text-primary mt-2">
                          <strong>Resolución:</strong> {alert.resolutionReason}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Resolution Buttons */}
                  {!alert.resolved && (
                    <div className="flex sm:flex-col items-center gap-2 shrink-0 self-end md:self-center">
                      <Button
                        size="sm"
                        variant="primary"
                        className="text-xs gap-1.5 h-8 w-full"
                        onClick={() =>
                          handleResolveAlert(
                            alert.id,
                            "Comprobado y justificado documentalmente por el usuario"
                          )
                        }
                      >
                        <CheckCircle2 className="size-3.5" />
                        <span>Descartar (Justificado)</span>
                      </Button>

                      {relatedDoc && (
                        <Link href={`/documents/${relatedDoc.id}/review`} className="w-full">
                          <Button size="sm" variant="secondary" className="text-xs gap-1.5 h-8 w-full">
                            <Info className="size-3.5" />
                            <span>Inspeccionar Factura</span>
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
