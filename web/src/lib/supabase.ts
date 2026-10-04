import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function buildClient(): SupabaseClient {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_SUPABASE_URL ||
    "https://rqcpwxucgkcodccrykpv.supabase.co";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_SUPABASE_ANON_KEY ||
    "";
  if (!key) {
    throw new Error("Falta NEXT_PUBLIC_SUPABASE_ANON_KEY en variables de entorno.");
  }
  return createClient(url, key);
}

// Proxy perezoso: el módulo debe poder importarse en build sin env
// (Vercel evalúa rutas al compilar); el error sale al primer uso real.
let cached: SupabaseClient | null = null;

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    if (!cached) cached = buildClient();
    const value = (cached as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? (value as () => unknown).bind(cached) : value;
  },
});

