import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
  stream?: boolean; // true → respuesta SSE palabra a palabra
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
  allRecentExpenses: { supplier: string; amount: number; vat: number; date: string; deductibility: string }[];
  businessName: string;
}

// ─── Agregador de contexto fiscal ─────────────────────────────────────────────

async function buildFiscalContext(
  token: string,
  quarter: string,
  year: number
): Promise<FiscalContext | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !anonKey) {
    console.error("[copilot/chat] Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o ANON_KEY");
    return null;
  }

  // Cliente para validar token
  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error: userError } = await authClient.auth.getUser(token);
  if (userError || !user) {
    console.error("[copilot/chat] Token de usuario no valido:", userError?.message);
    return null;
  }

  // Cliente para consultas con el token del usuario (respeta RLS)
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Si hay serviceRoleKey configurada y funcional la usamos como fallback para queries administrativas
  const queryClient = userClient;

  // 1. Obtener el negocio del usuario (businesses.owner_id = user.id)
  const { data: userBusiness } = await queryClient
    .from("businesses")
    .select("id, name")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let businessId = userBusiness?.id;
  let businessName = userBusiness?.name || "Mi Negocio";

  if (!businessId) {
    // Si no tiene negocio con owner_id, buscar si hay algún negocio disponible (demo fallback)
    const { data: fallbackBiz } = await queryClient
      .from("businesses")
      .select("id, name")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fallbackBiz) {
      businessId = fallbackBiz.id;
      businessName = fallbackBiz.name || "Mi Negocio";
    }
  }

  if (!businessId) {
    console.error("[copilot/chat] No se encontro ningun negocio para el usuario", user.id);
    return null;
  }

  // Rango de fechas del trimestre
  const quarterMonths: Record<string, [number, number]> = {
    "1T": [1, 3], "2T": [4, 6], "3T": [7, 9], "4T": [10, 12],
  };
  const [startMonth, endMonth] = quarterMonths[quarter] ?? [10, 12];
  const startDate = `${year}-${String(startMonth).padStart(2, "0")}-01`;
  const lastDay = new Date(year, endMonth, 0).getDate();
  const endDate = `${year}-${String(endMonth).padStart(2, "0")}-${lastDay}`;

  // Consultas paralelas con nombres reales de columnas
  const [expensesRes, incomeRes, pendingDocsRes, openAlertsRes, recentDocsRes, allRecentExpensesRes] = await Promise.all([
    // A. Gastos del trimestre
    queryClient
      .from("expenses")
      .select("base_amount, vat_amount, total_amount, category, deductibility_status, description, date, suppliers(name)")
      .eq("business_id", businessId)
      .gte("date", startDate)
      .lte("date", endDate),

    // B. Ingresos del trimestre
    queryClient
      .from("income")
      .select("base_amount, vat_amount, total_amount, category, date")
      .eq("business_id", businessId)
      .gte("date", startDate)
      .lte("date", endDate),

    // C. Documentos pendientes de revision
    queryClient
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .in("status", ["NEEDS_REVIEW", "EXTRACTING"]),

    // D. Alertas abiertas
    queryClient
      .from("alerts")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("status", "OPEN"),

    // E. Ultimas extracciones de documentos
    queryClient
      .from("document_extractions")
      .select("extracted_supplier_name, extracted_total_amount, extracted_date, documents!inner(status, business_id)")
      .eq("documents.business_id", businessId)
      .order("extracted_at", { ascending: false })
      .limit(5),

    // F. Ultimos gastos del negocio (sin restriccion de fecha para que el copiloto conozca facturas recientes cargadas)
    queryClient
      .from("expenses")
      .select("base_amount, vat_amount, total_amount, category, deductibility_status, description, date, suppliers(name)")
      .eq("business_id", businessId)
      .order("date", { ascending: false })
      .limit(10),
  ]);

  const expenses = expensesRes.data ?? [];
  const income = incomeRes.data ?? [];
  const allExpenses = allRecentExpensesRes.data ?? [];

  const totalIncome = income.reduce((s, r) => s + (Number(r.base_amount) || 0), 0);
  const collectedVat = income.reduce((s, r) => s + (Number(r.vat_amount) || 0), 0);
  const totalExpenses = expenses.reduce((s, r) => s + (Number(r.base_amount) || 0), 0);
  const deductibleVat = expenses.reduce((s, r) => {
    const factor =
      r.deductibility_status === "NON_DEDUCTIBLE"
        ? 0
        : r.deductibility_status === "PARTIAL"
        ? 0.5
        : 1;
    return s + (Number(r.vat_amount) || 0) * factor;
  }, 0);

  // Top proveedores del trimestre
  const supplierMap: Record<string, number> = {};
  expenses.forEach((e) => {
    const supObj = e.suppliers as { name?: string } | null;
    const name = supObj?.name || e.description || "Proveedor";
    supplierMap[name] = (supplierMap[name] ?? 0) + (Number(e.total_amount) || 0);
  });
  const topSuppliers = Object.entries(supplierMap)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Gastos por categoria del trimestre
  const categoryMap: Record<string, { total: number; vat: number }> = {};
  expenses.forEach((e) => {
    const cat = e.category ?? "otros";
    if (!categoryMap[cat]) categoryMap[cat] = { total: 0, vat: 0 };
    const factor =
      e.deductibility_status === "NON_DEDUCTIBLE"
        ? 0
        : e.deductibility_status === "PARTIAL"
        ? 0.5
        : 1;
    categoryMap[cat].total += Number(e.base_amount) || 0;
    categoryMap[cat].vat += (Number(e.vat_amount) || 0) * factor;
  });
  const expensesByCategory = Object.entries(categoryMap)
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.total - a.total);

  // Documentos recientes extraidos
  const recentDocuments = (recentDocsRes.data ?? []).map((d) => {
    const doc = d.documents as { status?: string } | null;
    return {
      supplier: d.extracted_supplier_name ?? "Desconocido",
      amount: Number(d.extracted_total_amount) || 0,
      status: doc?.status ?? "UNKNOWN",
      date: d.extracted_date ?? "",
    };
  });

  // Gastos recientes globales formateados
  const formattedRecentExpenses = allExpenses.map((e) => {
    const supObj = e.suppliers as { name?: string } | null;
    return {
      supplier: supObj?.name || e.description || "Gasto",
      amount: Number(e.total_amount) || 0,
      vat: Number(e.vat_amount) || 0,
      date: e.date || "",
      deductibility: e.deductibility_status || "DEDUCTIBLE",
    };
  });

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
    allRecentExpenses: formattedRecentExpenses,
    businessName,
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
    : "  - Sin gastos en este trimestre";

  const categoriesText = ctx.expensesByCategory.length
    ? ctx.expensesByCategory
        .map((c) => `  - ${c.category}: base ${fmt(c.total)}, IVA deducible ${fmt(c.vat)}`)
        .join("\n")
    : "  - Sin categorias en este trimestre";

  const recentDocsText = ctx.recentDocuments.length
    ? ctx.recentDocuments
        .map((d) => `  - ${d.supplier} | ${fmt(d.amount)} | Estado: ${d.status} | Fecha: ${d.date}`)
        .join("\n")
    : "  - Sin documentos pendientes o recientes";

  const allExpensesText = ctx.allRecentExpenses?.length
    ? ctx.allRecentExpenses
        .map((e) => `  - ${e.supplier} | ${fmt(e.amount)} (IVA ${fmt(e.vat)}) | Fecha: ${e.date} | Deduccion: ${e.deductibility}`)
        .join("\n")
    : "  - Sin gastos registrados";

  return `Eres el Copiloto Fiscal de "${ctx.businessName}", experto en fiscalidad espanola y Modelo 303 (IVA).

## DATOS REALES DEL NEGOCIO

### Liquidacion Modelo 303 (${ctx.quarter} ${ctx.year})
- IVA Repercutido (ventas): ${fmt(ctx.collectedVat)}
- IVA Soportado Deducible (compras): ${fmt(ctx.deductibleVat)}
- Resultado neto: ${fmt(ctx.netVat)} -> ${netVatLabel}
- Ingresos totales (base): ${fmt(ctx.totalIncome)}
- Gastos totales (base): ${fmt(ctx.totalExpenses)}

### Estado operativo
- Documentos pendientes de revision: ${ctx.pendingDocuments}
- Alertas fiscales activas: ${ctx.openAlerts}

### Top proveedores del periodo (${ctx.quarter} ${ctx.year})
${suppliersText}

### Gastos por categoria del periodo (${ctx.quarter} ${ctx.year})
${categoriesText}

### Facturas y gastos registrados en el sistema (ultimos movimientos)
${allExpensesText}

### Documentos escaneados / procesados recientemente
${recentDocsText}

## REGLAS DE RESPUESTA
1. Usa SOLO los datos anteriores para cifras reales de facturas o modelos. Nunca inventes importes o proveedores.
2. Cita normativa espanola cuando expliques criterios tributarios (Ley 37/1992 del IVA, Ley 35/2006 del IRPF, consultas vinculantes de la DGT).
3. Sé conciso y claro. Maximo 4 parrafos bien estructurados. Formato numerico espanol: 1.284,50 EUR.
4. Si el usuario pregunta por una factura especifica (por ejemplo Iberdrola u otros suministros), busca en los gastos y documentos listados arriba para darle una respuesta precisa sobre su deducibilidad y estado.
5. Plazo de presentacion del ${ctx.quarter}: 20 de ${deadlineMonth} (15 si se opta por domiciliacion bancaria).
6. Tienes acceso al historial de la conversacion. Mantén la coherencia con preguntas previas.`;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<Response> {
  let body: ChatRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalido" }, { status: 400 });
  }

  const { message, quarter = "4T", year = 2026, history = [], stream = false } = body;
  if (!message?.trim()) {
    return NextResponse.json({ error: "El campo 'message' es requerido" }, { status: 400 });
  }

  const openAiKey = process.env.OPENAI_API_KEY;
  if (!openAiKey && process.env.OPENAI_MOCK_STREAM !== "1") {
    return NextResponse.json({ error: "OPENAI_API_KEY no configurada" }, { status: 500 });
  }

  // Extraer JWT del header Authorization: "Bearer <token>"
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return NextResponse.json(
      { error: "No autorizado. Inicia sesion para usar el Copiloto." },
      { status: 401 }
    );
  }

  const ctx = await buildFiscalContext(token, quarter, year);
  if (!ctx) {
    return NextResponse.json(
      { error: "Sesion no valida. Comprueba que tu sesion no haya expirado." },
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

  const sources = [
    `BD en tiempo real — ${ctx.quarter} ${ctx.year}`,
    "Normativa AEAT Espana",
    ...(ctx.openAlerts > 0 ? [`${ctx.openAlerts} alertas activas`] : []),
    ...(ctx.pendingDocuments > 0 ? [`${ctx.pendingDocuments} docs pendientes`] : []),
  ];

  const snapshot = {
    netVat: ctx.netVat,
    collectedVat: ctx.collectedVat,
    deductibleVat: ctx.deductibleVat,
    pendingDocuments: ctx.pendingDocuments,
    openAlerts: ctx.openAlerts,
    quarter: ctx.quarter,
    year: ctx.year,
  };

  // ── Modo mock (dev sin cuota OpenAI): stream local con datos reales del contexto ──
  if (process.env.OPENAI_MOCK_STREAM === "1") {
    const fmt = (n: number) =>
      n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
    const mockReply =
      `Según tus datos reales del ${ctx.quarter} ${ctx.year}: IVA repercutido ${fmt(ctx.collectedVat)}, ` +
      `IVA soportado deducible ${fmt(ctx.deductibleVat)} y resultado neto ${fmt(ctx.netVat)}. ` +
      `Tienes ${ctx.pendingDocuments} documento(s) pendiente(s) y ${ctx.openAlerts} alerta(s) activa(s). ` +
      `(Respuesta simulada sin coste: activa OPENAI_API_KEY para el copiloto completo.)`;
    if (!stream) {
      return NextResponse.json({ reply: mockReply, sources, context: snapshot });
    }
    const encoder = new TextEncoder();
    const words = mockReply.split(" ");
    const readable = new ReadableStream({
      async start(controller) {
        for (const w of words) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: w + " " })}\n\n`));
          await new Promise((r) => setTimeout(r, 30));
        }
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true, sources, context: snapshot })}\n\n`)
        );
        controller.close();
      },
    });
    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  // ── Modo streaming SSE: reemite deltas de OpenAI al cliente ──
  if (stream) {
    let upstream: Response;
    try {
      upstream = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.3,
          max_tokens: 600,
          stream: true,
          messages: openAiMessages,
        }),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error de red";
      console.error("[copilot/chat] OpenAI fetch error:", msg);
      return NextResponse.json({ error: `Error al conectar con OpenAI: ${msg}` }, { status: 502 });
    }

    if (!upstream.ok || !upstream.body) {
      const errBody = await upstream.text().catch(() => "");
      console.error("[copilot/chat] OpenAI error:", upstream.status, errBody);
      return NextResponse.json(
        { error: `OpenAI devolvio error ${upstream.status}` },
        { status: 502 }
      );
    }

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const reader = upstream.body!.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() ?? "";
            for (const line of lines) {
              const t = line.trim();
              if (!t.startsWith("data:")) continue;
              const payload = t.slice(5).trim();
              if (payload === "[DONE]") continue;
              try {
                const j = JSON.parse(payload);
                const delta: string = j.choices?.[0]?.delta?.content ?? "";
                if (delta) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`)
                  );
                }
              } catch {
                // fragmento parcial: se recompone en el siguiente chunk
              }
            }
          }
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, sources, context: snapshot })}\n\n`
            )
          );
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      },
    });
    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

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

  return NextResponse.json({
    reply,
    sources,
    context: snapshot,
  });
}
