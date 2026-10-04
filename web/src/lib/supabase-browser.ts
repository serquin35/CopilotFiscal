import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://rqcpwxucgkcodccrykpv.supabase.co";

const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export function createClient() {
  if (!SUPABASE_ANON_KEY) {
    throw new Error("Falta NEXT_PUBLIC_SUPABASE_ANON_KEY en variables de entorno.");
  }
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
