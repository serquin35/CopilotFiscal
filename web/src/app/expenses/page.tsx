"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Receipt,
  Download,
  Search,
} from "lucide-react";
import { Card, CardHeader, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FiscalDocument } from "@/types";
import { useAuth } from "@/context/AuthContext";

export default function ExpensesPage() {
  const { business, supabase } = useAuth();
  const [documents, setDocuments] = useState<FiscalDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [vatRateFilter, setVatRateFilter] = useState("ALL");
  const [deductibilityFilter, setDeductibilityFilter] = useState("ALL");

  const currentBizId = business?.id;
  const STORAGE_KEY = currentBizId
    ? `copiloto_fiscal_documents_${currentBizId}`
    : "copiloto_fiscal_documents_demo";

  const loadExpensesData = useCallback(async () => {
    if (!currentBizId) return;

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
      console.warn("Error leyendo localStorage en Expenses:", e);
    }

    // 1. Cargar gastos contables reales de la tabla `expenses` de Supabase filtrados por business_id
    let dbExpenses: FiscalDocument[] = [];
    try {
      const { data: expRows, error: expError } = await supabase
        .from("expenses")
        .select("*, suppliers(name, tax_id_masked)")
        .eq("business_id", currentBizId)
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
            // Guardamos el document_id original para poder deduplicar contra la tabla documents
            documentId: item.document_id ? String(item.document_id) : undefined,
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
          };
        });
      }
    } catch (err) {
      console.warn("Error consultando expenses en Supabase:", err);
    }

    // 2. Cargar documentos pendientes o subidos de documents
    try {
      const { data: dbDocs, error } = await supabase
        .from("documents")
        .select("*, document_extractions(*)")
        .eq("business_id", currentBizId)
        .order("uploaded_at", { ascending: false });

      if (!error && dbDocs && dbDocs.length > 0) {
        const mappedDbDocs: FiscalDocument[] = dbDocs
          .filter((item: Record<string, unknown>) => {
            // Excluir documentos que ya tienen un expense contabilizado vinculado a su ID
            // La comparacion correcta es: expense.document_id === document.id
            // (el campo documentId del expense, o bien el url que construimos como /documents/{document_id}/review)
            return !dbExpenses.some(
              (e) => e.documentId === String(item.id) || e.url === `/documents/${item.id}/review`
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
              category: (ext?.extracted_category as string) || localMatch?.category || String(item.type || "Gastos deducibles"),
              deductiblePercentage: localMatch?.deductiblePercentage ?? 100,
            };
          });

        const combined = [
          ...dbExpenses,
          ...mappedDbDocs,
          ...currentDocs.filter((cd) => !dbExpenses.some((de) => de.id === cd.id) && !mappedDbDocs.some((md) => md.id === cd.id) && !cd.id.startsWith("doc-")),
        ];
        setDocuments(combined);
        return;
      }
    } catch (err) {
      console.warn("Error consultando Supabase en Expenses:", err);
    }

    if (dbExpenses.length > 0) {
      const combined = [
        ...dbExpenses,
        ...currentDocs.filter((cd) => !dbExpenses.some((de) => de.id === cd.id) && !cd.id.startsWith("doc-")),
      ];
      setDocuments(combined);
      return;
    }

    // Filtrar docs mock iniciales si el usuario los eliminó
    const realOnly = currentDocs.filter((cd) => !cd.id.startsWith("doc-"));
    setDocuments(realOnly);
  }, [currentBizId, STORAGE_KEY, supabase]);

  useEffect(() => {
    loadExpensesData();

    const handleUpdate = () => {
      loadExpensesData();
    };

    window.addEventListener("storage", handleUpdate);
    window.addEventListener("fiscal_docs_updated", handleUpdate);
    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("fiscal_docs_updated", handleUpdate);
    };
  }, [loadExpensesData]);

  // Métricas agregadas
  const totalInvoiced = documents.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
  const totalBase = documents.reduce((sum, d) => sum + (d.baseAmount || 0), 0);
  const approvedDocs = documents.filter(
    (d) => d.status === "CONFIRMED" || d.status === "REVIEWED" || d.status === "APPROVED"
  );
  const totalDeductibleVat = approvedDocs.reduce((sum, d) => {
    const rate = (d.deductiblePercentage ?? 100) / 100;
    return sum + (d.vatAmount || 0) * rate;
  }, 0);

  const categories = Array.from(
    new Set(documents.map((d) => d.category).filter(Boolean) as string[])
  );

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      (doc.providerName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (doc.nif?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (doc.filename.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      categoryFilter === "ALL" || doc.category === categoryFilter;

    const matchesVat =
      vatRateFilter === "ALL" || doc.vatRate?.toString() === vatRateFilter;

    const matchesDeduct =
      deductibilityFilter === "ALL" ||
      doc.deductiblePercentage?.toString() === deductibilityFilter;

    return matchesSearch && matchesCategory && matchesVat && matchesDeduct;
  });

  const exportCSV = () => {
    const headers = "ID,Proveedor,NIF,Factura,Fecha,Base,IVA_Tipo,IVA_Cuota,Total,Categoria,Deducibilidad\n";
    const rows = filteredDocs
      .map(
        (d) =>
          `"${d.id}","${d.providerName || ""}","${d.nif || ""}","${d.invoiceNumber || ""}","${
            d.date || ""
          }",${d.baseAmount || 0},${d.vatRate || 0},${d.vatAmount || 0},${d.totalAmount || 0},"${
            d.category || ""
          }",${d.deductiblePercentage ?? 100}%`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `gastos_copiloto_fiscal_3T_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Libro de Gastos &amp; Compras
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground mt-1">
            Explorador de Facturas y Deducciones
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Registro justificado de gastos, control de deducibilidad IRPF y segregación de tipos de gravamen.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          className="gap-2 text-xs self-start sm:self-auto"
          onClick={exportCSV}
        >
          <Download className="size-3.5" />
          <span>Exportar Libro CSV</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <CardDescription>Gasto Total Acumulado (Bruto)</CardDescription>
          <div className="font-mono text-2xl font-semibold text-foreground mt-1">
            {formatCurrency(totalInvoiced)}
          </div>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            Base imponible total: {formatCurrency(totalBase)}
          </span>
        </Card>

        <Card className="p-5 border-primary/30 bg-primary/5">
          <CardDescription className="text-primary/80">IVA Soportado Deducible</CardDescription>
          <div className="font-mono text-2xl font-semibold text-primary mt-1">
            {formatCurrency(totalDeductibleVat)}
          </div>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            Computable directamente en Casilla 28 Modelo 303
          </span>
        </Card>

        <Card className="p-5">
          <CardDescription>Facturas Contabilizadas</CardDescription>
          <div className="font-mono text-2xl font-semibold text-foreground mt-1">
            {documents.length}{" "}
            <span className="text-xs font-normal text-muted-foreground">documentos</span>
          </div>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            {approvedDocs.length} validados por el gestor
          </span>
        </Card>
      </div>

      {/* Filters and Search Bar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Search input */}
            <div className="relative flex-1 max-w-md">
              <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por proveedor, NIF o concepto..."
                className="h-8 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Select dropdown filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Category */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:ring-1 focus:ring-ring"
              >
                <option value="ALL">Todas las Categorías</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {/* VAT Rate */}
              <select
                value={vatRateFilter}
                onChange={(e) => setVatRateFilter(e.target.value)}
                className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:ring-1 focus:ring-ring"
              >
                <option value="ALL">Todos los IVA</option>
                <option value="21">21% General</option>
                <option value="10">10% Reducido</option>
                <option value="4">4% Superreducido</option>
                <option value="0">0% Exento</option>
              </select>

              {/* Deductibility */}
              <select
                value={deductibilityFilter}
                onChange={(e) => setDeductibilityFilter(e.target.value)}
                className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:ring-1 focus:ring-ring"
              >
                <option value="ALL">Deducibilidad</option>
                <option value="100">100% Total</option>
                <option value="50">50% Parcial</option>
                <option value="0">0% No deducible</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filteredDocs.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No hay facturas que coincidan con los filtros aplicados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border/60 text-muted-foreground uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="pb-3 font-medium">Factura / Proveedor</th>
                    <th className="pb-3 font-medium">Categoría</th>
                    <th className="pb-3 font-medium">Fecha</th>
                    <th className="pb-3 font-medium text-right">Base</th>
                    <th className="pb-3 font-medium text-right">IVA</th>
                    <th className="pb-3 font-medium text-right">Total</th>
                    <th className="pb-3 font-medium text-center">Deducción</th>
                    <th className="pb-3 font-medium text-center">Estado</th>
                    <th className="pb-3 font-medium text-right">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono">
                  {filteredDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 pr-2 font-sans font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <Receipt className="size-4 text-muted-foreground shrink-0" />
                          <div>
                            <div className="text-xs">{doc.providerName || "Desconocido"}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {doc.invoiceNumber || doc.filename}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-2 text-muted-foreground font-sans text-xs">
                        <span className="truncate max-w-[150px] inline-block">
                          {doc.category || "General"}
                        </span>
                      </td>
                      <td className="py-3.5 px-2 text-muted-foreground font-sans text-xs">
                        {doc.date ? formatDate(doc.date) : "-"}
                      </td>
                      <td className="py-3.5 px-2 text-right text-foreground">
                        {doc.baseAmount ? formatCurrency(doc.baseAmount) : "-"}
                      </td>
                      <td className="py-3.5 px-2 text-right text-muted-foreground">
                        {doc.vatAmount ? `${formatCurrency(doc.vatAmount)} (${doc.vatRate}%)` : "-"}
                      </td>
                      <td className="py-3.5 px-2 text-right font-semibold text-foreground">
                        {doc.totalAmount ? formatCurrency(doc.totalAmount) : "-"}
                      </td>
                      <td className="py-3.5 px-2 text-center font-sans">
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full border font-mono ${
                            doc.deductiblePercentage === 100
                              ? "bg-primary/15 text-primary border-primary/20"
                              : doc.deductiblePercentage === 50
                              ? "bg-warning/15 text-warning border-warning/20"
                              : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {doc.deductiblePercentage ?? 100}%
                        </span>
                      </td>
                      <td className="py-3.5 px-2 text-center font-sans">
                        <StatusBadge status={doc.status} />
                      </td>
                      <td className="py-3.5 pl-2 text-right font-sans">
                        {doc.url ? (
                          <Link href={doc.url}>
                            <Button size="sm" variant="ghost" className="text-xs h-7">
                              Revisar
                            </Button>
                          </Link>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-mono px-2 py-1 rounded bg-muted/40 border border-border/40">
                            Asiento
                          </span>
                        )}
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
