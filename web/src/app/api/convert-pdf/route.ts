import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ConvertPdfRequest {
  storageUrl: string;   // URL pública del PDF en Supabase Storage
  documentId: string;   // UUID del documento (para nombrar el JPEG)
  businessId: string;   // UUID del negocio (para la carpeta en Storage)
}

interface ConvertPdfResponse {
  success: boolean;
  imageUrl?: string;    // URL pública de la imagen JPEG generada
  error?: string;
}

// ─── Supabase admin client (service_role) ─────────────────────────────────────

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing Supabase environment variables");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse<ConvertPdfResponse>> {
  // 1. Validar secret de webhook (mismo token que usa n8n)
  const secret = req.headers.get("x-webhook-secret");
  const expectedSecret = process.env.N8N_WEBHOOK_SECRET;
  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parsear body
  let body: ConvertPdfRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { storageUrl, documentId, businessId } = body;
  if (!storageUrl || !documentId || !businessId) {
    return NextResponse.json(
      { success: false, error: "Missing required fields: storageUrl, documentId, businessId" },
      { status: 400 }
    );
  }

  try {
    // 3. Descargar el PDF desde Supabase Storage
    const pdfResponse = await fetch(storageUrl);
    if (!pdfResponse.ok) {
      return NextResponse.json(
        { success: false, error: `Failed to download PDF: ${pdfResponse.statusText}` },
        { status: 502 }
      );
    }
    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());

    // 4. Renderizar página 1 del PDF con pdfjs-dist + canvas
    // Importaciones dinámicas para evitar problemas con el bundle de Edge Runtime
    const canvasModule = await import("canvas");
    const { createCanvas } = canvasModule;

    // Polyfill necesario para pdfjs-dist en entorno Node.js / Vercel Serverless
    const g = globalThis as unknown as Record<string, unknown>;
    if (typeof g.DOMMatrix === "undefined" && canvasModule.DOMMatrix) {
      g.DOMMatrix = canvasModule.DOMMatrix;
    }
    if (typeof g.ImageData === "undefined" && canvasModule.ImageData) {
      g.ImageData = canvasModule.ImageData;
    }
    if (typeof g.Path2D === "undefined" && (canvasModule as Record<string, unknown>).Path2D) {
      g.Path2D = (canvasModule as Record<string, unknown>).Path2D;
    }

    // Cargar worker directamente en memoria para que Vercel no intente buscar un archivo externo
    if (!g.pdfjsWorker) {
      // @ts-expect-error pdf.worker.mjs lacks separate typescript declarations
      g.pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
    }

    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

    // Cargar el documento PDF desde el buffer
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBuffer),
      useSystemFonts: true,
      disableFontFace: true,
    });
    const pdfDoc = await loadingTask.promise;
    const page = await pdfDoc.getPage(1);

    // Escalar a 150 DPI para buena calidad de OCR (factor ~2.0 sobre 72 DPI base)
    const SCALE = 2.0;
    const viewport = page.getViewport({ scale: SCALE });

    // Crear canvas con las dimensiones de la página
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const ctx = canvas.getContext("2d");

    // Fondo blanco (evita transparencias en JPEG)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Renderizar la página PDF en el canvas pasando canvas y canvasContext
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.render({ canvas: canvas as any, canvasContext: ctx as any, viewport }).promise;

    // 5. Convertir canvas a JPEG buffer (calidad 92%)
    const jpegBuffer = canvas.toBuffer("image/jpeg", { quality: 0.92 });

    // 6. Subir JPEG a Supabase Storage
    const supabase = getSupabaseAdmin();
    const storagePath = `${businessId}/previews/${documentId}-page1.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, jpegBuffer, {
        contentType: "image/jpeg",
        upsert: true,  // Sobreescribir si ya existe (reintentos idempotentes)
      });

    if (uploadError) {
      return NextResponse.json(
        { success: false, error: `Storage upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // 7. Obtener URL pública del JPEG
    const { data: publicUrlData } = supabase.storage
      .from("documents")
      .getPublicUrl(storagePath);

    const imageUrl = publicUrlData.publicUrl;

    return NextResponse.json({ success: true, imageUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[convert-pdf] Error:", message);
    return NextResponse.json(
      { success: false, error: `Conversion failed: ${message}` },
      { status: 500 }
    );
  }
}
