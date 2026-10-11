import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ─── A5 / DT-18: Proxy autenticado hacia n8n ──────────────────────────────────
// Reemplaza la llamada directa cliente→n8n por un proxy SSR que:
//   1. Verifica sesión activa de Supabase (usuario autenticado)
//   2. Valida que el businessId pertenece al usuario (RLS check manual)
//   3. Añade X-Webhook-Secret al llamar a n8n (nunca expuesto al cliente)
//   4. Devuelve la respuesta de n8n al cliente
//
// Variables de entorno necesarias (en .env.local, nunca en repo):
//   NEXT_PUBLIC_SUPABASE_URL       (ya existe)
//   SUPABASE_SERVICE_ROLE_KEY      (ya existe)
//   N8N_WEBHOOK_SECRET             (nueva — generar con: openssl rand -hex 32)
//   NEXT_PUBLIC_N8N_WEBHOOK_URL    (ya existe, ahora usada solo server-side)

interface ProcessPayload {
  documentId: string;
}

export async function POST(req: NextRequest) {
  // ── 1. Validar sesión ─────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const accessToken = authHeader.slice(7);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !serviceKey) {
    console.error("[documents/process] Faltan variables de entorno de Supabase");
    return NextResponse.json({ error: "Configuración de servidor incompleta" }, { status: 500 });
  }

  // Verificar el JWT del usuario con Supabase Admin
  const adminClient = createClient(supabaseUrl, serviceKey);
  const { data: { user }, error: authError } = await adminClient.auth.getUser(accessToken);

  if (authError || !user) {
    return NextResponse.json({ error: "Sesión inválida o expirada" }, { status: 401 });
  }

  // ── 2. Validar payload de entrada ──────────────────────────────────────────
  let body: Partial<ProcessPayload>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload JSON inválido" }, { status: 400 });
  }

  const { documentId } = body;
  if (!documentId || typeof documentId !== "string") {
    return NextResponse.json({ error: "Campo obligatorio: documentId" }, { status: 400 });
  }

  // ── 3. Consultar documento con RLS del usuario (defensa estricta) ───────────
  // No confiamos en storagePath, businessId ni mimeType enviados por el cliente.
  // Se leen directamente de la base de datos validando ownership por RLS.
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false },
  });

  const { data: docRow, error: docError } = await userClient
    .from("documents")
    .select("id, business_id, storage_path, original_filename, file_size_bytes, mime_type, uploaded_at")
    .eq("id", documentId)
    .maybeSingle();

  if (docError || !docRow) {
    console.warn(`[documents/process] Usuario ${user.id} intentó acceder a documentId ${documentId} inexistente o de otro negocio`);
    return NextResponse.json({ error: "Documento no encontrado o acceso no autorizado" }, { status: 404 });
  }

  // Verificar que storage_path existe y coincide con la convención del negocio
  if (!docRow.storage_path || !docRow.storage_path.startsWith(`${docRow.business_id}/`)) {
    console.error(`[documents/process] storage_path anómalo o vacío para doc ${documentId}`);
    return NextResponse.json({ error: "Ruta de almacenamiento no válida" }, { status: 400 });
  }

  // ── 4. Llamar a n8n con el secreto y los datos verificados de BD ───────────
  const n8nUrl =
    process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL ||
    "https://n8n.cheosdesign.info/webhook/copilot-document-intake";

  const webhookSecret = process.env.N8N_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn("[documents/process] N8N_WEBHOOK_SECRET no configurado — llamada sin autenticación");
  }

  const n8nPayload = {
    documentId: docRow.id,
    businessId: docRow.business_id,
    storagePath: docRow.storage_path,
    originalFilename: docRow.original_filename || "documento",
    fileSize: docRow.file_size_bytes || 0,
    mimeType: docRow.mime_type || "application/pdf",
    uploadedAt: docRow.uploaded_at || new Date().toISOString(),
  };

  let n8nResponse: Response;
  try {
    n8nResponse = await fetch(n8nUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(webhookSecret ? { "X-Webhook-Secret": webhookSecret } : {}),
      },
      body: JSON.stringify(n8nPayload),
      signal: AbortSignal.timeout(65000),
    });
  } catch (fetchErr) {
    console.error("[documents/process] Error conectando con n8n:", fetchErr);
    return NextResponse.json({ error: "Error de conexión con el procesador de documentos" }, { status: 502 });
  }

  if (!n8nResponse.ok) {
    const errBody = await n8nResponse.text().catch(() => "");
    console.error(`[documents/process] n8n respondió ${n8nResponse.status}: ${errBody}`);
    return NextResponse.json(
      { error: `El procesador de documentos devolvió error ${n8nResponse.status}` },
      { status: n8nResponse.status >= 500 ? 502 : n8nResponse.status }
    );
  }

  // ── 5. Reenviar respuesta de n8n al cliente ───────────────────────────────
  let n8nData: unknown;
  try {
    n8nData = await n8nResponse.json();
  } catch {
    n8nData = {};
  }

  return NextResponse.json(n8nData, { status: 200 });
}
