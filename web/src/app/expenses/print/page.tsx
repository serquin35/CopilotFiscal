"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams } from "next/navigation";

interface Row {
  base: number;
  vat: number;
  factor: number;
  rate: number;
  date: string;
  q?: number | null;
  y?: number | null;
}

function quarterOf(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getMonth() + 1) / 3);
}

export default function PrintDraftPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground text-center">Cargando…</p>}>
      <PrintDraftInner />
    </Suspense>
  );
}

function PrintDraftInner() {
  const { business, supabase } = useAuth();
  const params = useSearchParams();
  const now = new Date();
  const q = params.get("q") ?? `${Math.ceil((now.getMonth() + 1) / 3)}T`;
  const y = Number(params.get("y") ?? now.getFullYear());

  const [rows, setRows] = useState<Row[]>([]);
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!business?.id) return;
    setLoading(true);
    const { data: exp } = await supabase
      .from("expenses")
      .select("base_amount, vat_amount, vat_rate, deductibility_status, date, fiscal_period_year, fiscal_period_quarter")
      .eq("business_id", business.id);
    const { count } = await supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .in("status", ["UPLOADED", "EXTRACTING", "EXTRACTED", "NEEDS_REVIEW"]);
    setPending(count ?? 0);
    const qNum = Number(q.replace("T", ""));
    setRows(
      (exp ?? [])
        .map((r: Record<string, unknown>) => ({
          base: Number(r.base_amount || 0),
          vat: Number(r.vat_amount || 0),
          factor:
            r.deductibility_status === "NON_DEDUCTIBLE"
              ? 0
              : r.deductibility_status === "PARTIAL"
              ? 0.5
              : 1,
          rate: Number(r.vat_rate ?? 21),
          date: String(r.date || ""),
          q: typeof r.fiscal_period_quarter === "number" ? (r.fiscal_period_quarter as number) : null,
          y: typeof r.fiscal_period_year === "number" ? (r.fiscal_period_year as number) : null,
        }))
        .filter(
          (r) =>
            (r.q ?? quarterOf(r.date)) === qNum &&
            (r.y ?? new Date(r.date).getFullYear()) === y
        )
    );
    setLoading(false);
  }, [business?.id, supabase, q, y]);

  useEffect(() => {
    load();
  }, [load]);

  const buckets = [21, 10, 4, 0].map((rate) => {
    const inRate = rows.filter((r) => r.rate === rate);
    return {
      rate,
      base: inRate.reduce((s, r) => s + r.base, 0),
      vat: inRate.reduce((s, r) => s + r.vat * r.factor, 0),
      count: inRate.length,
    };
  });
  const other = rows.filter((r) => ![21, 10, 4, 0].includes(r.rate));
  const totalBase = rows.reduce((s, r) => s + r.base, 0);
  const totalVat = rows.reduce((s, r) => s + r.vat * r.factor, 0);

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/expenses"
          className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <Button size="sm" className="gap-2 text-xs" onClick={() => window.print()}>
          <Printer className="size-3.5" />
          Imprimir / Guardar PDF
        </Button>
      </div>

      <Card className="p-8">
        <CardContent className="space-y-6">
          <div className="text-center border-b border-border pb-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Borrador no oficial — entorno DEMO</p>
            <h1 className="text-2xl font-semibold mt-1">Modelo 303 — IVA soportado deducible</h1>
            <p className="text-sm text-muted-foreground">
              {business?.name || "Mi negocio"} · {business?.nif || "NIF no configurado"} · Trimestre {q} {y}
            </p>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground text-center">Cargando datos…</p>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground text-xs uppercase">
                    <th className="py-2">Tipo IVA</th>
                    <th className="py-2 text-right">Nº facturas</th>
                    <th className="py-2 text-right">Base imponible</th>
                    <th className="py-2 text-right">Cuota deducible</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {buckets
                    .filter((b) => b.count > 0)
                    .map((b) => (
                      <tr key={b.rate} className="border-b border-border/40">
                        <td className="py-2">{b.rate}%</td>
                        <td className="py-2 text-right">{b.count}</td>
                        <td className="py-2 text-right">{formatCurrency(b.base)}</td>
                        <td className="py-2 text-right">{formatCurrency(b.vat)}</td>
                      </tr>
                    ))}
                  {other.length > 0 && (
                    <tr className="border-b border-border/40">
                      <td className="py-2">Otros tipos</td>
                      <td className="py-2 text-right">{other.length}</td>
                      <td className="py-2 text-right">{formatCurrency(other.reduce((s, r) => s + r.base, 0))}</td>
                      <td className="py-2 text-right">{formatCurrency(other.reduce((s, r) => s + r.vat * r.factor, 0))}</td>
                    </tr>
                  )}
                  <tr className="font-bold">
                    <td className="py-2">TOTAL</td>
                    <td className="py-2 text-right">{rows.length}</td>
                    <td className="py-2 text-right">{formatCurrency(totalBase)}</td>
                    <td className="py-2 text-right">{formatCurrency(totalVat)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="text-xs text-muted-foreground space-y-1 border-t border-border pt-4">
                <p>Reglas aplicadas: DEMO_v1 (ficticias, solo simulación).</p>
                <p>Generado: {new Date().toLocaleString("es-ES")} · Registros computados: {rows.length}.</p>
                <p className={pending > 0 ? "text-warning font-medium" : ""}>
                  {pending > 0
                    ? `⚠️ ${pending} documento(s) pendiente(s) de revisión NO incluidos en este borrador.`
                    : "✅ Sin documentos pendientes: cálculo completo."}
                </p>
                <p>Este documento no constituye declaración oficial ni asesoramiento fiscal.</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
