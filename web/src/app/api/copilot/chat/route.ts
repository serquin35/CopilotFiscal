import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  message: string;
  quarter?: string; // "1T" | "2T" | "3T" | "4T"
  year?: number;
  history?: HistoryMessage[]; // Ultimos N mensajes para contexto multi-turno
}

interface FiscalContext {
  quarter: string;
  year: number;
  collectedVat: number;
  deductibleVat: number;
  netVat: number;
  totalExpenses: number;
  totalIncome: number;
  pendingDocuments: number;
  openAlerts: number;
  topSuppliers: { name: string; total: number }[];
  expensesByCategory: { category: string; total: number; vat: number }[];
  recentDocuments: { supplier: string; amount: number; status: string; date: string }[];
  businessName: string;
}

// ─── Agregador de contexto fiscal ─────────────────────────────────────────────

async function buildFiscalContext(quarter: string, year: number): Promise<FiscalContext | null> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) return null;
  const businessId = profile.business_id;

  const { data: business } = await supabase
    .from("businesses")
    .select("name")
    .eq("id", businessId)
    .single();

  // Rango de fechas del trimestre
  const quarterMonths: Record<string, [number, number]> = {
    "1T": [1, 3], "2T": [4, 6], "3T": [7, 9], "4T": [10, 12],
  };
  const [startMonth, endMonth] = quarterMonths[quarter] ?? [10, 12];
  const startDate = `${year}-${String(startMonth).padStart(2, "0")}-01`;
  const lastDay = new Date(year, endMonth, 0).getDate();
  const endDate = `${year}-${String(endMonth).padStart(2, "0")}-${lastDay}`;

  // Consultas paralelas para minimizar latencia
  const [expensesRes, incomeRes, pendingDocsRes, openAlertsRes, recentDocsRes] = await Promise.all([
    supabase
      .from("expenses")
      .select("base_amount, vat_amount, total_amount, category, deductibility_percentage, supplier_name, expense_date, status")
      .eq("business_id", businessId)
      .gte("expense_date", startDate)
      .lte("expense_date", endDate),

    supabase
      .from("income")
      .select("amount, vat_amount, income_date")
      .eq("business_id", businessId)
      .gte("income_date", startDate)
      .lte("income_date", endDate),

    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .in("status", ["NEEDS_REVIEW", "EXTRACTING"]),

    supabase
      .from("alerts")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("status", "OPEN"),

    supabase
      .from("document_extractions")
      .select("supplier_name, total_amount, invoice_date, documents!inner(status, business_id)")
      .eq("documents.business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const expenses = expensesRes.data ?? [];
  const income = incomeRes.data ?? [];

  const totalIncome = income.reduce((s, r) => s + (r.amount ?? 0), 0);
  const collectedVat = income.reduce((s, r) => s + (r.vat_amount ?? 0), 0);
  const totalExpenses = expenses.reduce((s, r) => s + (r.base_amount ?? 0), 0);
  const deductibleVat = expenses.reduce((s, r) => {
    const ded = (r.deductibility_percentage ?? 100) / 100;
    return s + (r.vat_amount ?? 0) * ded;
  }, 0);

  const supplierMap: Record<string, number> = {};
  expenses.forEach((e) => {
    const name = e.supplier_name ?? "Sin proveedor";
    supplierMap[name] = (supplierMap[name] ?? 0) + (e.total_amount ?? 0);
  });
  const topSuppliers = Object.entries(supplierMap)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const categoryMap: Record<string, { total: number; vat: number }> = {};
  expenses.forEach((e) => {
    const cat = e.category ?? "otros";
    if (!categoryMap[cat]) categoryMap[cat] = { total: 0, vat: 0 };
    categoryMap[cat].total += e.base_amount ?? 0;
    categoryMap[cat].vat += (e.vat_amount ?? 0) * ((e.deductibility_percentage ?? 100) / 100);
  });
  const expensesByCategory = Object.entries(categoryMap)
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.total - a.total);

  const recentDocuments = (recentDocsRes.data ?? []).map((d) => ({
    supplier: d.supplier_name ?? "Desconocido",
    amount: d.total_amount ?? 0,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    status: (d.documents as any)?.status ?? "UNKNOWN",
    date: d.invoice_date ?? "",
  }));

  return {
    quarter,
    year,
    collectedVat,
    deductibleVat,
    netVat: collectedVat - deductibleVat,
    totalExpenses,
    totalIncome,
    pendingDocuments: pendingDocsRes.count ?? 0,
    openAlerts: openAlertsRes.count ?? 0,
    topSuppliers,
    expensesByCategory,
    recentDocuments,
    businessName: business?.name ?? "Tu negocio",
  };
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(ctx: FiscalContext): string {
  const fmt = (n: number) =>
    n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

  const netVatLabel = ctx.netVat >= 0 ? "A INGRESAR a Hacienda" : "A COMPENSAR / DEVOLVER";
  const deadlineMonth =
    ctx.quarter === "1T" ? "abril" : ctx.quarter === "2T" ? "julio"
    : ctx.quarter === "3T" ? "octubre" : "enero";

  const suppliersText = ctx.topSuppliers.length
    ? ctx.topSuppliers.map((s) => `  - ${s.name}: ${fmt(s.total)}`).join("\n")
    : "  - Sin gastos registrados";

  const categoriesText = ctx.expensesByCategory.length
    ? ctx.expensesByCategory
        .map((c) => `  - ${c.category}: base ${fmt(c.total)}, IVA deducible ${fmt(c.vat)}`)
        .join("\n")
    : "  - Sin categorias";

  const recentDocsText = ctx.recentDocuments.length
    ? ctx.recentDocuments
        .map((d) => `  - ${d.supplier} | ${fmt(d.amount)} | ${d.status} | ${d.date}`)
        .join("\n")
    : "  - Sin facturas recientes";

  return `Eres el Copiloto Fiscal de "${ctx.businessName}", experto en fiscalidad espanola y Modelo 303 (IVA).

## DATOS REALES — ${ctx.quarter} ${ctx.year}

### Liquidacion Modelo 303
- IVA Repercutido (ventas): ${fmt(ctx.collectedVat)}
- IVA Soportado Deducible (compras): ${fmt(ctx.deductibleVat)}
- Resultado neto: ${fmt(ctx.netVat)} -> ${netVatLabel}
- Ingresos totales (base): ${fmt(ctx.totalIncome)}
- Gastos totales (base): ${fmt(ctx.totalExpenses)}

### Estado operativo
- Documentos pendientes de revision: ${ctx.pendingDocuments}
- Alertas fiscales activas: ${ctx.openAlerts}

### Top proveedores
${suppliersText}

### Gastos por categoria
${categoriesText}

### Facturas recientes
${recentDocsText}

## REGLAS
1. Usa SOLO los datos anteriores para cifras. Nunca inventes importes.
2. Cita normativa espanola cuando expliques criterios (LIVA, LIRPF, DGT).
3. Sé conciso. Maximo 4 parrafos. Formato numerico: 1.284,50 EUR.
4. Si no tienes datos suficientes, indicalo y sugiere que documentos cargar.
5. Plazo de presentacion del ${ctx.quarter}: 20 de ${deadlineMonth} (15 con domiciliacion bancaria).
6. IMPORTANTE: Tienes acceso al historial de la conversacion. Usalo para dar respuestas coherentes y conectadas.`;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: ChatRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalido" }, { status: 400 });
  }

  const { message, quarter = "4T", year = 2026, history = [] } = body;
  if (!message?.trim()) {
    return NextResponse.json({ error: "El campo 'message' es requerido" }, { status: 400 });
  }

  const openAiKey = process.env.OPENAI_API_KEY;
  if (!openAiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY no configurada" }, { status: 500 });
  }

  const ctx = await buildFiscalContext(quarter, year);
  if (!ctx) {
    return NextResponse.json(
      { error: "Sesion no valida. Inicia sesion para usar el Copiloto." },
      { status: 401 }
    );
  }

  // Construir array de mensajes: system + historial (max 10 turnos) + mensaje actual
  const historySlice = history.slice(-10); // Ultimos 10 mensajes para no inflar el contexto
  const openAiMessages = [
    { role: "system" as const, content: buildSystemPrompt(ctx) },
    ...historySlice.map((h) => ({ role: h.role, content: h.content })),
    { role: "user" as const, content: message },
  ];

  let openAiResponse: Response;
  try {
    openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 600,
        messages: openAiMessages,
      }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error de red";
    console.error("[copilot/chat] OpenAI fetch error:", msg);
    return NextResponse.json({ error: `Error al conectar con OpenAI: ${msg}` }, { status: 502 });
  }

  if (!openAiResponse.ok) {
    const errBody = await openAiResponse.text();
    console.error("[copilot/chat] OpenAI error:", openAiResponse.status, errBody);
    return NextResponse.json(
      { error: `OpenAI devolvio error ${openAiResponse.status}` },
      { status: 502 }
    );
  }

  const openAiData = await openAiResponse.json();
  const reply = openAiData.choices?.[0]?.message?.content ?? "";

  const sources = [
    `BD en tiempo real — ${ctx.quarter} ${ctx.year}`,
    "Normativa AEAT Espana",
    ...(ctx.openAlerts > 0 ? [`${ctx.openAlerts} alertas activas`] : []),
    ...(ctx.pendingDocuments > 0 ? [`${ctx.pendingDocuments} docs pendientes`] : []),
  ];

  return NextResponse.json({
    reply,
    sources,
    context: {
      netVat: ctx.netVat,
      collectedVat: ctx.collectedVat,
      deductibleVat: ctx.deductibleVat,
      pendingDocuments: ctx.pendingDocuments,
      openAlerts: ctx.openAlerts,
      quarter: ctx.quarter,
      year: ctx.year,
    },
  });
}
