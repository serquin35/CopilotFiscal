"use client";

import React, { useState } from "react";
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
import { initialDocuments } from "@/lib/mockData";
import { FiscalDocument } from "@/types";

export default function ExpensesPage() {
  const [documents] = useState<FiscalDocument[]>(initialDocuments);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [vatRateFilter, setVatRateFilter] = useState("ALL");
  const [deductibilityFilter, setDeductibilityFilter] = useState("ALL");

  // Métricas agregadas
  const totalInvoiced = documents.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
  const totalBase = documents.reduce((sum, d) => sum + (d.baseAmount || 0), 0);
  const totalDeductibleVat = documents.reduce((sum, d) => {
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
            {documents.filter((d) => d.status === "REVIEWED").length} validados por el gestor
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
                        <Link href={`/documents/${doc.id}/review`}>
                          <Button size="sm" variant="ghost" className="text-xs h-7">
                            Revisar
                          </Button>
                        </Link>
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
