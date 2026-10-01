import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ChatRequest {
  message: string;
  quarter?: string; // e.g. "4T", "3T" — opcional, se detecta del trimestre activo
  year?: number;
}

interface FiscalContext {
  quarter: string;
  year: number;
  collectedVat: number;      // IVA repercutido (suma de income.vat_amount)
  deductibleVat: number;     // IVA soportado deducible (suma de expenses.vat_amount * deductibility)
  netVat: number;            // Resultado Modelo 303
  totalExpenses: number;     // Suma base imponible gastos
  totalIncome: number;       // Suma ingresos brutos
  pendingDocuments: number;  // Documentos en NEEDS_REVIEW
  openAlerts: number;        // Alertas OPEN
  topSuppliers: { name: string; total: number }[];
  expensesByCategory: { category: string; total: number; vat: number }[];
  recentDocuments: { supplier: string; amount: number; status: string; date: string }[];
  businessName: string;
}

// ─── Supabase server client (usa la sesion del usuario autenticado) ───────────

function createSupabaseServer() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  );
}

// ─── Aggregar contexto fiscal desde Supabase ──────────────────────────────────

async function buildFiscalContext(quarter: string, year: number): Promise<FiscalContext | null> {
  const supabase = createSupabaseServer();

  // Verificar sesion
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Obtener business_id del perfil
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) return null;
  const businessId = profile.business_id;

  // Obtener nombre del negocio
  const { data: business } = await supabase
    .from("businesses")
    .select("name")
    .eq("id", businessId)
    .single();

  // Calcular rango de fechas del trimestre
  const quarterMonths: Record<string, [number, number]> = {
    "1T": [1, 3], "2T": [4, 6], "3T": [7, 9], "4T": [10, 12],
  };
  const [startMonth, endMonth] = quarterMonths[quarter] ?? [10, 12];
  const startDate = `${year}-${String(startMonth).padStart(2, "0")}-01`;
  const lastDay = new Date(year, endMonth, 0).getDate();
  const endDate = `${year}-${String(endMonth).padStart(2, "0")}-${lastDay}`;

  // Gastos del trimestre
  const { data: expenses } = await supabase
    .from("expenses")
    .select("base_amount, vat_amount, total_amount, category, deductibility_percentage, supplier_name, expense_date, status")
    .eq("business_id", businessId)
    .gte("expense_date", startDate)
    .lte("expense_date", endDate);

  // Ingresos del trimestre
  const { data: income } = await supabase
    .from("income")
    .select("amount, vat_amount, description, income_date")
    .eq("business_id", businessId)
    .gte("income_date", startDate)
    .lte("income_date", endDate);

  // Documentos pendientes de revision
  const { count: pendingDocs } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .in("status", ["NEEDS_REVIEW", "EXTRACTING"]);

  // Alertas abiertas
  const { count: openAlerts } = await supabase
    .from("alerts")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("status", "OPEN");

  // Documentos recientes (ultimos 5)
  const { data: recentDocs } = await supabase
    .from("document_extractions")
    .select("supplier_name, total_amount, invoice_date, documents!inner(status, business_id)")
    .eq("documents.business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(5);

  // ── Calcular agregados ────────────────────────────────────────────────────

  const totalIncome = income?.reduce((s, r) => s + (r.amount ?? 0), 0) ?? 0;
  const collectedVat = income?.reduce((s, r) => s + (r.vat_amount ?? 0), 0) ?? 0;

  const totalExpenses = expenses?.reduce((s, r) => s + (r.base_amount ?? 0), 0) ?? 0;
  const deductibleVat = expenses?.reduce((s, r) => {
    const ded = (r.deductibility_percentage ?? 100) / 100;
    return s + (r.vat_amount ?? 0) * ded;
  }, 0) ?? 0;

  const netVat = collectedVat - deductibleVat;

  // Top 5 proveedores por gasto total
  const supplierMap: Record<string, number> = {};
  expenses?.forEach((e) => {
    const name = e.supplier_name ?? "Sin proveedor";
    supplierMap[name] = (supplierMap[name] ?? 0) + (e.total_amount ?? 0);
  });
  const topSuppliers = Object.entries(supplierMap)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Gastos por categoria
  const categoryMap: Record<string, { total: number; vat: number }> = {};
  expenses?.forEach((e) => {
    const cat = e.category ?? "otros";
    if (!categoryMap[cat]) categoryMap[cat] = { total: 0, vat: 0 };
    categoryMap[cat].total += e.base_amount ?? 0;
    categoryMap[cat].vat += (e.vat_amount ?? 0) * ((e.deductibility_percentage ?? 100) / 100);
  });
  const expensesByCategory = Object.entries(categoryMap)
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.total - a.total);

  // Documentos recientes formateados
  const recentDocuments = (recentDocs ?? []).map((d) => ({
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
    netVat,
    totalExpenses,
    totalIncome,
    pendingDocuments: pendingDocs ?? 0,
    openAlerts: openAlerts ?? 0,
    topSuppliers,
    expensesByCategory,
    recentDocuments,
    businessName: business?.name ?? "Tu negocio",
  };
}

// ─── System prompt con contexto real ─────────────────────────────────────────

function buildSystemPrompt(ctx: FiscalContext): string {
  const fmt = (n: number) =>
    n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

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

  const netVatLabel = ctx.netVat >= 0 ? "A INGRESAR a Hacienda" : "A COMPENSAR / DEVOLVER";

  const deadlineMonth = ctx.quarter === "1T" ? "abril" : ctx.quarter === "2T" ? "julio"
    : ctx.quarter === "3T" ? "octubre" : "enero";

  return `Eres el Copiloto Fiscal de "${ctx.businessName}", un asistente experto en fiscalidad espanola especializado en el Modelo 303 (IVA) y normativa AEAT.

## DATOS REALES DEL ${ctx.quarter} ${ctx.year} (extraidos de la base de datos en tiempo real)

### Liquidacion Modelo 303
- IVA Repercutido (ventas): ${fmt(ctx.collectedVat)}
- IVA Soportado Deducible (compras): ${fmt(ctx.deductibleVat)}
- Resultado neto: ${fmt(ctx.netVat)} -> ${netVatLabel}
- Ingresos totales (base): ${fmt(ctx.totalIncome)}
- Gastos totales (base): ${fmt(ctx.totalExpenses)}

### Estado operativo
- Documentos pendientes de revision: ${ctx.pendingDocuments}
- Alertas fiscales activas: ${ctx.openAlerts}

### Top proveedores por gasto
${suppliersText}

### Gastos por categoria
${categoriesText}

### Facturas recientes
${recentDocsText}

## TUS REGLAS DE COMPORTAMIENTO

1. **SOLO usa los datos anteriores** para responder preguntas sobre cifras. Nunca inventes importes.
2. **Cita la normativa espanola** cuando expliques criterios fiscales (LIVA, LIRPF, consultas DGT).
3. **Se preciso y conciso**. El usuario es un autonomo o pyme espanola sin perfil de asesor fiscal.
4. **Si no tienes datos suficientes**, dilo claramente y sugiere que documentos falta cargar.
5. **Formato**: usa markdown (negrita, listas). Maximo 4 parrafos por respuesta.
6. **Idioma**: siempre en espanol. Formato numerico: 1.284,50 euro.
7. El plazo de presentacion del ${ctx.quarter} es el 20 de ${deadlineMonth} (o 15 si hay domiciliacion bancaria).`;
}

// ─── Handler principal ────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Parsear body
  let body: ChatRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalido" }, { status: 400 });
  }

  const { message, quarter = "4T", year = 2026 } = body;
  if (!message?.trim()) {
    return NextResponse.json({ error: "El campo 'message' es requerido" }, { status: 400 });
  }

  // 2. Verificar API key de OpenAI
  const openAiKey = process.env.OPENAI_API_KEY;
  if (!openAiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY no configurada en el servidor" }, { status: 500 });
  }

  // 3. Construir contexto fiscal real
  const ctx = await buildFiscalContext(quarter, year);
  if (!ctx) {
    return NextResponse.json(
      { error: "Sesion no valida. Inicia sesion para usar el Copiloto." },
      { status: 401 }
    );
  }

  // 4. Llamar a OpenAI
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
        messages: [
          { role: "system", content: buildSystemPrompt(ctx) },
          { role: "user", content: message },
        ],
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

  // 5. Devolver respuesta + fuentes contextuales
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
