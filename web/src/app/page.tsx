"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { StatusBadge, FiscalDataBadge } from "@/components/ui/badge";
import { ProgressBar, VatSegmentedBar } from "@/components/ui/progress";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { FiscalDocument, AnomalyAlert, QuarterlySummary } from "@/types";
import { supabase } from "@/lib/supabase";

const QUARTER_MONTHS: Record<string, { name: string; idx: number }[]> = {
  "1T": [
    { name: "Enero", idx: 0 },
    { name: "Febrero", idx: 1 },
    { name: "Marzo", idx: 2 },
  ],
  "2T": [
    { name: "Abril", idx: 3 },
    { name: "Mayo", idx: 4 },
    { name: "Junio", idx: 5 },
  ],
  "3T": [
    { name: "Julio", idx: 6 },
    { name: "Agosto", idx: 7 },
    { name: "Septiembre", idx: 8 },
  ],
  "4T": [
    { name: "Octubre", idx: 9 },
    { name: "Noviembre", idx: 10 },
    { name: "Diciembre", idx: 11 },
  ],
};

const DEFAULT_DEADLINES: Record<string, string> = {
  "1T": "2026-04-20",
  "2T": "2026-07-20",
  "3T": "2026-10-20",
  "4T": "2027-01-30",
};

export default function DashboardPage() {
  const [selectedQuarter, setSelectedQuarter] = useState<"1T" | "2T" | "3T" | "4T">("4T");
  const [documents, setDocuments] = useState<FiscalDocument[]>([]);
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [incomeData, setIncomeData] = useState<{ vat_amount: number; base_amount: number; date: string }[]>([]);
  const [summary, setSummary] = useState<QuarterlySummary>({
    quarter: "4T",
    year: 2026,
    deadline: "2027-01-30",
    daysRemaining: 121,
    collectedVat: 0,
    deductibleVat: 0,
    netVat: 0,
    dataCompleteness: 100,
    totalInvoices: 0,
    pendingReviewCount: 0,
    urgentAlertsCount: 0,
    totalSalesBase: 0,
    totalExpensesBase: 0,
    operatingResult: 0,
    pendingExpensesBase: 0,
    pendingExpensesVat: 0,
    monthlyBreakdown: [
      { month: "Octubre", collected: 0, deductible: 0 },
      { month: "Noviembre", collected: 0, deductible: 0 },
      { month: "Diciembre", collected: 0, deductible: 0 },
    ],
  });

  const STORAGE_KEY = "copiloto_fiscal_documents_v1";

  const calculateSummary = useCallback(
    (
      docs: FiscalDocument[],
      quarter: "1T" | "2T" | "3T" | "4T",
      income: { vat_amount: number; base_amount: number; date: string }[]
    ) => {
      // Filtrar facturas demo si fueron descartadas
      const realDocs = docs.filter((d) => !d.id.startsWith("doc-"));

      const quarterMonthsList = QUARTER_MONTHS[quarter];
      const validIndices = quarterMonthsList.map((m) => m.idx);

      const quarterDocs = realDocs.filter((d) => {
        if (!d.date) return true;
        const dMonth = new Date(d.date).getMonth();
        return validIndices.includes(dMonth);
      });

      const activeDocs = quarterDocs.length > 0 ? quarterDocs : realDocs;

      const approvedDocs = activeDocs.filter(
        (d) => d.status === "CONFIRMED" || d.status === "REVIEWED" || d.status === "APPROVED"
      );
      const pendingDocs = activeDocs.filter(
        (d) => d.status === "PENDING_REVIEW" || d.status === "EXTRACTED" || d.status === "UPLOADED"
      );

      const deductibleBase = approvedDocs.reduce((sum, d) => sum + (d.baseAmount || 0), 0);
      const deductibleVat = approvedDocs.reduce((sum, d) => {
        const pct = (d.deductiblePercentage ?? 100) / 100;
        return sum + (d.vatAmount || 0) * pct;
      }, 0);

      const pendingExpensesBase = pendingDocs.reduce((sum, d) => sum + (d.baseAmount || 0), 0);
      const pendingExpensesVat = pendingDocs.reduce((sum, d) => sum + (d.vatAmount || 0), 0);

      // IVA Repercutido: suma del IVA y base de los ingresos (ventas) del trimestre seleccionado
      const quarterIncome = income.filter((row) => {
        if (!row.date) return false;
        return validIndices.includes(new Date(row.date).getMonth());
      });
      const collectedVat = quarterIncome.reduce((sum, row) => sum + (row.vat_amount || 0), 0);
      const collectedBase = quarterIncome.reduce((sum, row) => sum + (row.base_amount || 0), 0);

      const roundedCollected = Number(collectedVat.toFixed(2));
      const roundedDeductible = Number(deductibleVat.toFixed(2));
      const netVat = Number((roundedCollected - roundedDeductible).toFixed(2));
      const totalCount = activeDocs.length || 1;
      const completeness = Math.min(100, Math.round((approvedDocs.length / totalCount) * 100));

      const totalSalesBase = Number(collectedBase.toFixed(2));
      const totalExpensesBase = Number(deductibleBase.toFixed(2));
      const operatingResult = Number((totalSalesBase - totalExpensesBase).toFixed(2));

      // Desglose mensual dinámico (IVA repercutido + IVA soportado por mes)
      const breakdown = quarterMonthsList.map((m) => {
        const monthDocs = approvedDocs.filter((d) => {
          if (!d.date) return false;
          return new Date(d.date).getMonth() === m.idx;
        });
        const monthDeductible = monthDocs.reduce((acc, d) => {
          const pct = (d.deductiblePercentage ?? 100) / 100;
          return acc + (d.vatAmount || 0) * pct;
        }, 0);
        const monthIncome = income.filter((row) => row.date && new Date(row.date).getMonth() === m.idx);
        const monthCollected = monthIncome.reduce((acc, row) => acc + (row.vat_amount || 0), 0);
        return {
          month: m.name,
          collected: Number(monthCollected.toFixed(2)),
          deductible: Number(monthDeductible.toFixed(2)),
        };
      });

      // Anomalías de los documentos reales
      const activeAlerts = activeDocs.flatMap((d) => d.anomalies || []).filter((a) => !a.resolved);
      setAlerts(activeAlerts);

      const deadlineStr = DEFAULT_DEADLINES[quarter] || "2027-01-30";
      const targetDate = new Date(deadlineStr);
      const today = new Date();
      const diffTime = targetDate.getTime() - today.getTime();
      const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      setSummary({
        quarter,
        year: 2026,
        deadline: deadlineStr,
        daysRemaining,
        collectedVat: roundedCollected,
        deductibleVat: roundedDeductible,
        netVat,
        dataCompleteness: activeDocs.length === 0 ? 100 : completeness,
        totalInvoices: activeDocs.length,
        pendingReviewCount: pendingDocs.length,
        urgentAlertsCount: activeAlerts.length,
        totalSalesBase,
        totalExpensesBase,
        operatingResult,
        pendingExpensesBase: Number(pendingExpensesBase.toFixed(2)),
        pendingExpensesVat: Number(pendingExpensesVat.toFixed(2)),
        monthlyBreakdown: breakdown,
      });
    },
    []
  );

  const loadDashboardData = useCallback(async () => {
    let currentDocs: FiscalDocument[] = [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as FiscalDocument[];
        if (Array.isArray(parsed)) {
          currentDocs = parsed;
        }
      }
    } catch (e) {
      console.warn("Error leyendo localStorage:", e);
    }

    // Cargar ingresos (ventas) desde Supabase para calcular IVA Repercutido real
    let fetchedIncome: { vat_amount: number; base_amount: number; date: string }[] = [];
    try {
      const { data: incomeRows, error: incomeError } = await supabase
        .from("income")
        .select("vat_amount, base_amount, date")
        .eq("fiscal_period_year", 2026);
      if (!incomeError && incomeRows) {
        fetchedIncome = incomeRows.map((r: Record<string, unknown>) => ({
          vat_amount: Number(r.vat_amount || 0),
          base_amount: Number(r.base_amount || 0),
          date: String(r.date || ""),
        }));
        setIncomeData(fetchedIncome);
      }
    } catch (err) {
      console.warn("Error consultando ingresos en Supabase:", err);
    }

    // Cargar gastos contables de la tabla expenses de Supabase
    let dbExpenses: FiscalDocument[] = [];
    try {
      const { data: expRows, error: expError } = await supabase
        .from("expenses")
        .select("*, suppliers(name, tax_id_masked)")
        .order("date", { ascending: false });

      if (!expError && expRows && expRows.length > 0) {
        dbExpenses = expRows.map((item: Record<string, unknown>) => {
          const sup = item.suppliers as Record<string, unknown> | null;
          const deductPct =
            item.deductibility_status === "NON_DEDUCTIBLE"
              ? 0
              : item.deductibility_status === "PARTIAL"
              ? 50
              : 100;

          return {
            id: String(item.id || ""),
            filename: String(item.description || "Gasto contabilizado"),
            fileSize: 0,
            uploadedAt: String(item.created_at || new Date().toISOString()),
            status: item.validation_status === "VALIDATED" ? "CONFIRMED" : "PENDING_REVIEW",
            providerName: String(sup?.name || item.notes || "Proveedor"),
            nif: String(sup?.tax_id_masked || "-"),
            invoiceNumber: String(item.description || `EXP-${String(item.id || "").substring(0, 8)}`),
            date: String(item.date || ""),
            baseAmount: Number(item.base_amount || 0),
            vatRate: Number(item.vat_rate || 21),
            vatAmount: Number(item.vat_amount || 0),
            totalAmount: Number(item.total_amount || 0),
            category: String(item.category || "Gastos deducibles"),
            deductiblePercentage: deductPct,
            url: item.document_id ? `/documents/${item.document_id}/review` : undefined,
            anomalies: [],
          };
        });
      }
    } catch (err) {
      console.warn("Error consultando expenses en Supabase:", err);
    }

    try {
      const { data: dbDocs, error } = await supabase
        .from("documents")
        .select("*, document_extractions(*)")
        .order("uploaded_at", { ascending: false });

      if (!error && dbDocs && dbDocs.length > 0) {
        const mappedDbDocs: FiscalDocument[] = dbDocs
          .filter((item: Record<string, unknown>) => {
            return !dbExpenses.some(
              (e) => e.url === `/documents/${item.id}/review` || e.id === String(item.id)
            );
          })
          .map((item: Record<string, unknown>) => {
            const extList = item.document_extractions as Record<string, unknown>[] | null;
            const ext = Array.isArray(extList) && extList.length > 0 ? extList[0] : null;

            let publicUrl = "";
            if (item.storage_path) {
              const { data: urlData } = supabase.storage.from("documents").getPublicUrl(String(item.storage_path));
              publicUrl = urlData?.publicUrl || "";
            }

            const localMatch = currentDocs.find((cd) => cd.id === String(item.id));

            return {
              id: String(item.id || ""),
              filename: String(item.original_filename || localMatch?.filename || "Documento"),
              fileSize: Number(item.file_size_bytes) || localMatch?.fileSize || 120000,
              uploadedAt: String(item.uploaded_at || localMatch?.uploadedAt || new Date().toISOString()),
              status: (item.status as FiscalDocument["status"]) || localMatch?.status || "PENDING_REVIEW",
              url: publicUrl || localMatch?.url,
              providerName: (ext?.extracted_supplier_name as string) || localMatch?.providerName || String(item.notes || "Proveedor detectado"),
              nif: (ext?.extracted_supplier_nif as string) || localMatch?.nif || "-",
              invoiceNumber: (ext?.extracted_invoice_number as string) || localMatch?.invoiceNumber || `F-${String(item.id || "").substring(0, 8)}`,
              date: (ext?.extracted_date as string) || localMatch?.date || String(item.uploaded_at || "").split("T")[0] || new Date().toISOString().split("T")[0],
              baseAmount: Number(ext?.extracted_base_amount ?? localMatch?.baseAmount ?? 0),
              vatRate: Number(ext?.extracted_vat_rate ?? localMatch?.vatRate ?? 21),
              vatAmount: Number(ext?.extracted_vat_amount ?? localMatch?.vatAmount ?? 0),
              totalAmount: Number(ext?.extracted_total_amount ?? localMatch?.totalAmount ?? 0),
              category: (ext?.extracted_category as string) || localMatch?.category || String(item.type || "Factura"),
              deductiblePercentage: localMatch?.deductiblePercentage ?? 100,
              anomalies: localMatch?.anomalies || [],
            };
          });

        const combined = [
          ...dbExpenses,
          ...mappedDbDocs,
          ...currentDocs.filter((cd) => !dbExpenses.some((de) => de.id === cd.id) && !mappedDbDocs.some((md) => md.id === cd.id) && !cd.id.startsWith("doc-")),
        ];
        setDocuments(combined);
        calculateSummary(combined, selectedQuarter, fetchedIncome);
        return;
      }
    } catch (err) {
      console.warn("Error consultando Supabase en Dashboard:", err);
    }

    if (dbExpenses.length > 0) {
      const combined = [
        ...dbExpenses,
        ...currentDocs.filter((cd) => !dbExpenses.some((de) => de.id === cd.id) && !cd.id.startsWith("doc-")),
      ];
      setDocuments(combined);
      calculateSummary(combined, selectedQuarter, fetchedIncome);
      return;
    }

    const realOnly = currentDocs.filter((cd) => !cd.id.startsWith("doc-"));
    setDocuments(realOnly);
    calculateSummary(realOnly, selectedQuarter, fetchedIncome);
  }, [calculateSummary, selectedQuarter]);

  useEffect(() => {
    loadDashboardData();

    const handleUpdate = () => {
      loadDashboardData();
    };

    window.addEventListener("storage", handleUpdate);
    window.addEventListener("fiscal_docs_updated", handleUpdate);
    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("fiscal_docs_updated", handleUpdate);
    };
  }, [loadDashboardData]);

  const handleSelectQuarter = (q: "1T" | "2T" | "3T" | "4T") => {
    setSelectedQuarter(q);
    calculateSummary(documents, q, incomeData);
  };

  const handleQuickApprove = async (docId: string) => {
    const updated = documents.map((d) =>
      d.id === docId ? { ...d, status: "CONFIRMED" as const } : d
    );
    setDocuments(updated);
    calculateSummary(updated, selectedQuarter, incomeData);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("Error guardando en localStorage:", e);
    }

    try {
      await supabase
        .from("documents")
        .update({ status: "CONFIRMED", status_updated_at: new Date().toISOString() })
        .eq("id", docId);
    } catch (e) {
      console.warn("Error actualizando Supabase en QuickApprove:", e);
    }

    window.dispatchEvent(new Event("fiscal_docs_updated"));
  };

  const handleQuickReject = async (docId: string) => {
    const updated = documents.map((d) =>
      d.id === docId ? { ...d, status: "REJECTED" as const } : d
    );
    setDocuments(updated);
    calculateSummary(updated, selectedQuarter, incomeData);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("Error guardando en localStorage:", e);
    }

    try {
      await supabase
        .from("documents")
        .update({ status: "REJECTED", status_updated_at: new Date().toISOString() })
        .eq("id", docId);
    } catch (e) {
      console.warn("Error actualizando Supabase en QuickReject:", e);
    }

    window.dispatchEvent(new Event("fiscal_docs_updated"));
  };

  const isDeductibleFavorable = summary.netVat < 0 || (summary.collectedVat === 0 && summary.deductibleVat > 0);
  const displayAmount = isDeductibleFavorable
    ? summary.deductibleVat - summary.collectedVat
    : summary.netVat;

  const maxEvolutionValue = Math.max(
    50,
    ...summary.monthlyBreakdown.flatMap((m) => [m.collected, m.deductible])
  );

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
              onClick={() => handleSelectQuarter(q)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                q === selectedQuarter
                  ? "bg-secondary text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Panel de Trazabilidad Operativa y Naturaleza de Saldos (MVP §7.1) */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Card Ventas / Ingresos */}
        <Card className="p-4 border-border/80 bg-card/60 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Ventas del Trimestre (Base)
              </span>
              <FiscalDataBadge type="DATO" size="xs" />
            </div>
            <div className="font-mono text-2xl font-bold text-foreground">
              {formatCurrency(summary.totalSalesBase || 0)}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-3 pt-2 border-t border-border/40">
            <span>IVA Repercutido ({selectedQuarter}):</span>
            <span className="font-mono font-medium text-foreground">{formatCurrency(summary.collectedVat)}</span>
          </div>
        </Card>

        {/* Card Gastos / Compras */}
        <Card className="p-4 border-border/80 bg-card/60 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Gastos Deducibles (Base)
              </span>
              <FiscalDataBadge type="DATO" size="xs" />
            </div>
            <div className="font-mono text-2xl font-bold text-foreground">
              {formatCurrency(summary.totalExpensesBase || 0)}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-3 pt-2 border-t border-border/40">
            <span>IVA Soportado Deducible:</span>
            <span className="font-mono font-medium text-primary">{formatCurrency(summary.deductibleVat)}</span>
          </div>
        </Card>

        {/* Card Resultado Operativo (EBITDA Est.) */}
        <Card className="p-4 border-border/80 bg-card/60 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Resultado Operativo Bruto
              </span>
              <FiscalDataBadge type="ESTIMACION" size="xs" />
            </div>
            <div
              className={cn(
                "font-mono text-2xl font-bold",
                (summary.operatingResult || 0) >= 0 ? "text-emerald-500" : "text-destructive"
              )}
            >
              {formatCurrency(summary.operatingResult || 0)}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-3 pt-2 border-t border-border/40">
            <span>Margen antes de impuestos:</span>
            <span className="font-mono font-medium text-foreground">
              {summary.totalSalesBase && summary.totalSalesBase > 0
                ? `${(((summary.operatingResult || 0) / summary.totalSalesBase) * 100).toFixed(1)}%`
                : "0.0%"}
            </span>
          </div>
        </Card>
      </div>

      {/* 3. Top Metric Cards Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* IVA a Liquidar Card (Main Card) */}
        <Card className="md:col-span-2 relative overflow-hidden border-border/80 bg-gradient-to-br from-card to-secondary/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CardDescription>Liquidación fiscal Modelo 303</CardDescription>
                <FiscalDataBadge type="ESTIMACION" size="xs" />
              </div>
              <CardTitle className={cn("text-xl mt-0.5", isDeductibleFavorable ? "text-primary" : "text-foreground")}>
                {isDeductibleFavorable ? "IVA a Compensar (A tu favor)" : "IVA Neto a Ingresar (AEAT)"}
              </CardTitle>
            </div>
            <div
              className={cn(
                "rounded-xl border p-2",
                isDeductibleFavorable
                  ? "bg-primary/10 border-primary/20 text-primary"
                  : "bg-warning/10 border-warning/20 text-warning"
              )}
            >
              <TrendingDown className="size-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div
                className={cn(
                  "font-mono text-5xl md:text-6xl font-semibold tracking-tight",
                  isDeductibleFavorable ? "text-primary" : "text-warning"
                )}
              >
                {formatCurrency(displayAmount)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {isDeductibleFavorable
                  ? "Tienes saldo a tu favor frente a Hacienda: el IVA soportado deducible supera a las ventas emitidas."
                  : "Diferencia entre IVA repercutido a tus clientes e IVA soportado en compras deducibles."}
              </p>
            </div>

            {/* Trazabilidad Matemática Oficial AEAT (Casilla 71) */}
            <div className="rounded-xl border border-border/60 bg-background/50 p-3 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground flex items-center gap-1.5">
                  <span>Fórmula Oficial Modelo 303 (Casilla 71):</span>
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  [IVA Repercutido] − [IVA Soportado Deducible]
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/30 text-center font-mono text-xs">
                <div className="p-2 rounded-lg bg-card border border-border/50 flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">Repercutido</span>
                    <FiscalDataBadge type="ESTIMACION" size="xs" />
                  </div>
                  <span className="font-semibold text-foreground text-sm">{formatCurrency(summary.collectedVat)}</span>
                </div>
                <div className="p-2 rounded-lg bg-card border border-border/50 flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">Soportado</span>
                    <FiscalDataBadge type="DATO" size="xs" />
                  </div>
                  <span className="font-semibold text-primary text-sm">{formatCurrency(summary.deductibleVat)}</span>
                </div>
                <div className="p-2 rounded-lg bg-card border border-border/50 flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">Saldo Final</span>
                    <FiscalDataBadge type="ESTIMACION" size="xs" />
                  </div>
                  <span className={cn("font-semibold text-sm", isDeductibleFavorable ? "text-primary" : "text-warning")}>
                    {formatCurrency(displayAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Aviso si existen facturas pendientes de conciliar */}
            {summary.pendingReviewCount > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-500/25 p-3 text-xs">
                <div className="flex items-center gap-2">
                  <FiscalDataBadge type="PENDIENTE" size="xs" />
                  <span className="text-foreground text-[11px]">
                    Hay <strong>{summary.pendingReviewCount} documentos</strong> ({formatCurrency(summary.pendingExpensesVat || 0)} de IVA) pendientes de conciliación humana.
                  </span>
                </div>
                <Link href="/documents" className="text-primary font-semibold hover:underline flex items-center gap-1 text-[11px] whitespace-nowrap">
                  Conciliar <ChevronRight className="size-3" />
                </Link>
              </div>
            )}

            {/* Segmented VAT visualizer */}
            <div className="space-y-2 pt-2 border-t border-border/40">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1.5 text-primary">
                  <span className="size-2 rounded-full bg-primary" />
                  Soportado (deducible): <strong>{formatCurrency(summary.deductibleVat)}</strong>
                </span>
                <span
                  className={cn(
                    "flex items-center gap-1.5",
                    isDeductibleFavorable ? "text-primary font-medium" : "text-warning"
                  )}
                >
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      isDeductibleFavorable ? "bg-primary" : "bg-warning"
                    )}
                  />
                  {isDeductibleFavorable ? "A Compensar AEAT: " : "A Ingresar a Hacienda: "}
                  <strong>{formatCurrency(displayAmount)}</strong>
                </span>
              </div>
              <VatSegmentedBar
                deductiblePercentage={
                  summary.collectedVat === 0 ? (summary.deductibleVat > 0 ? 100 : 0) : 100
                }
              />
              <div className="flex justify-between text-[11px] text-muted-foreground pt-1">
                <span>Total Repercutido (Ventas): {formatCurrency(summary.collectedVat)}</span>
                <span>
                  Tasa soportada: {summary.deductibleVat > 0 ? "100.0%" : "0.0%"}
                </span>
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
                <AlertTriangle
                  className={cn(
                    "size-4",
                    alerts.length > 0 ? "text-warning" : "text-muted-foreground"
                  )}
                />
                <CardTitle className="text-base">Anomalías Pendientes</CardTitle>
              </div>
              <span
                className={cn(
                  "size-5 rounded-full text-xs flex items-center justify-center font-mono",
                  alerts.length > 0
                    ? "bg-destructive/15 text-destructive border border-destructive/20 font-semibold"
                    : "bg-muted text-muted-foreground border border-border"
                )}
              >
                {alerts.length}
              </span>
            </div>
            <CardDescription>
              Discrepancias detectadas por los workflows de n8n
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <CheckCircle2 className="size-4" />
                </div>
                <p className="text-foreground font-medium">Sin anomalías fiscales</p>
                <span className="text-[11px] text-muted-foreground max-w-[220px]">
                  Todas las facturas procesadas cumplen los criterios de la AEAT.
                </span>
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
                <CardTitle className="text-base">
                  Evolución Mensual ({summary.quarter})
                </CardTitle>
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
                const collPercent = (item.collected / maxEvolutionValue) * 100;
                const dedPercent = (item.deductible / maxEvolutionValue) * 100;
                const monthDiff = item.collected - item.deductible;

                return (
                  <div key={item.month} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-foreground">{item.month}</span>
                      <span className="font-mono text-muted-foreground">
                        Diferencia:{" "}
                        <strong
                          className={cn(
                            monthDiff < 0 ? "text-primary" : "text-foreground"
                          )}
                        >
                          {formatCurrency(monthDiff)}
                        </strong>
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
          {documents.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-3">
              <div className="size-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <FileText className="size-5" />
              </div>
              <p className="text-foreground font-medium">No hay facturas en el sistema</p>
              <span className="text-[11px] max-w-sm">
                Sube tus facturas o tickets desde el Gestor de Archivos para comenzar a computar el Modelo 303.
              </span>
              <Link href="/documents">
                <Button size="sm" variant="primary" className="text-xs gap-1.5 mt-2">
                  <UploadCloud className="size-3.5" />
                  Subir mi primera factura
                </Button>
              </Link>
            </div>
          ) : (
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
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {doc.invoiceNumber || "S/N"}
                            </div>
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
                            href={doc.url ? doc.url : "/expenses"}
                            className="size-7 rounded-lg border border-border bg-background flex items-center justify-center hover:bg-muted hover:text-primary transition-colors text-muted-foreground"
                            title={doc.url ? "Revisión Humana en Detalle" : "Ver en Gastos"}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
