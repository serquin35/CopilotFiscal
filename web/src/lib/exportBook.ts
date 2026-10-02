// web/src/lib/exportBook.ts
// Exportación determinista del libro de gastos para gestoría.
// CSV con separador ";" y decimales con coma (Excel ES), escape RFC4180,
// BOM para tildes y líneas "#" de trazabilidad (reglas, fecha, nº registros).

import type { FiscalDocument } from "@/types";

export interface BookMeta {
  businessName: string;
  rulesVersion: string;
  generatedAt: string;
}

const BOM = "\uFEFF";

function esc(value: string | number | null | undefined): string {
  const s = String(value ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

function num(n: number | null | undefined): string {
  return (Number(n) || 0).toFixed(2).replace(".", ",");
}

export function sanitizeFilename(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "negocio";
}

export function buildExpensesCSV(docs: FiscalDocument[], meta: BookMeta): string {
  const lines: string[] = [
    `# Libro de gastos - ${meta.businessName}`,
    `# Generado: ${meta.generatedAt} | Reglas: ${meta.rulesVersion} | Registros: ${docs.length} | BORRADOR NO OFICIAL - DEMO`,
    "# Solo incluye registros visibles con los filtros aplicados en pantalla.",
    "ID;Proveedor;NIF;Factura;Fecha;Base;IVA_Tipo;IVA_Cuota;Total;Categoria;Deducibilidad;Estado",
  ];
  for (const d of docs) {
    lines.push(
      [
        esc(d.id),
        esc(d.providerName),
        esc(d.nif),
        esc(d.invoiceNumber),
        esc(d.date),
        num(d.baseAmount),
        num(d.vatRate),
        num(d.vatAmount),
        num(d.totalAmount),
        esc(d.category),
        `${d.deductiblePercentage ?? 100}%`,
        esc(d.status),
      ].join(";")
    );
  }
  return BOM + lines.join("\r\n");
}

export function downloadTextFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function bookFilename(businessName: string, suffix: string): string {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `libro_gastos_${sanitizeFilename(businessName)}_${suffix}_${stamp}.csv`;
}
