import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const accessToken = authHeader.slice(7);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      console.error("[account/delete] Faltan variables de entorno de Supabase");
      return NextResponse.json({ error: "Error de configuración del servidor" }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // 1. Validar identidad del usuario mediante su JWT
    const { data: { user }, error: authError } = await adminClient.auth.getUser(accessToken);
    if (authError || !user) {
      return NextResponse.json({ error: "Sesión inválida o expirada" }, { status: 401 });
    }

    // 2. Proteger cuenta DEMO
    if (user.id === "00000000-0000-0000-0000-000000000001" || user.email === "demo@copilotfiscal.es") {
      return NextResponse.json({ error: "La cuenta DEMO institucional no puede eliminarse" }, { status: 403 });
    }

    // 3. Eliminar archivos de Storage mediante la Storage API oficial (Supabase prohíbe DELETE directo en storage.objects)
    try {
      const { data: businesses } = await adminClient
        .from("businesses")
        .select("id")
        .eq("owner_id", user.id);

      if (businesses && businesses.length > 0) {
        for (const biz of businesses) {
          const { data: files } = await adminClient.storage
            .from("documents")
            .list(biz.id, { limit: 100 });
          if (files && files.length > 0) {
            const filePaths = files.map((f) => `${biz.id}/${f.name}`);
            await adminClient.storage.from("documents").remove(filePaths);
          }
        }
      }

      // Limpiar avatares si existieran
      const { data: avatarFiles } = await adminClient.storage
        .from("avatars")
        .list(user.id, { limit: 100 });
      if (avatarFiles && avatarFiles.length > 0) {
        const avatarPaths = avatarFiles.map((f) => `${user.id}/${f.name}`);
        await adminClient.storage.from("avatars").remove(avatarPaths);
      }
    } catch (storageErr) {
      console.warn("[account/delete] Error al limpiar Storage:", storageErr);
    }

    // 4. Ejecutar función transaccional de borrado atómico en base de datos
    const { error: rpcError } = await adminClient.rpc("delete_user_account", {
      p_user_id: user.id,
    });

    if (rpcError) {
      console.error("[account/delete] Error en RPC delete_user_account:", rpcError);
      return NextResponse.json({ error: `Error al eliminar datos: ${rpcError.message}` }, { status: 500 });
    }

    // 5. Asegurar eliminación en el subsistema de GoTrue / Auth de Supabase
    try {
      await adminClient.auth.admin.deleteUser(user.id);
    } catch (authDelErr) {
      // Si la RPC ya lo eliminó de auth.users, puede que no exista; se ignora
      console.warn("[account/delete] User auth delete follow-up:", authDelErr);
    }

    return NextResponse.json({ success: true, message: "Cuenta eliminada correctamente" });
  } catch (error: unknown) {
    console.error("[account/delete] Error inesperado:", error);
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
