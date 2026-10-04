// web/src/lib/signed-url.ts
// URLs firmadas bajo demanda para el bucket privado `documents` (tarea A3).
// - Caducidad corta (30 min) con renovación al caducar (margen 60 s).
// - Caché SOLO en memoria: jamás en BD, localStorage ni logs.
// - Las claves de caché local antiguas (con URLs públicas) se purgan al cargar.

import type { SupabaseClient } from "@supabase/supabase-js";

const SIGNED_TTL_SECONDS = 1800;
const RENEW_SKEW_SECONDS = 60;

interface CacheEntry {
  url: string;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry>();

/** Claves de localStorage que pueden contener URLs públicas (inventario A1). */
export const LEGACY_CACHE_KEYS = [
  "copiloto_fiscal_documents_v1",
  "copiloto_fiscal_documents_demo",
] as const;

export function legacyBusinessCacheKeys(businessId: string): string[] {
  return [`copiloto_fiscal_documents_${businessId}`];
}

export function purgeLegacyDocCache(businessId?: string): void {
  try {
    const keys: string[] = [...LEGACY_CACHE_KEYS];
    if (businessId) keys.push(...legacyBusinessCacheKeys(businessId));
    for (const k of keys) localStorage.removeItem(k);
  } catch {
    // almacenamiento no disponible: no bloquea
  }
}

export async function getSignedDocumentUrl(
  supabase: SupabaseClient,
  storagePath: string | null | undefined,
  expiresIn: number = SIGNED_TTL_SECONDS
): Promise<string> {
  if (!storagePath) throw new Error("storage_path ausente: no se puede firmar.");
  const now = Date.now();
  const hit = memoryCache.get(storagePath);
  if (hit && hit.expiresAt - now > RENEW_SKEW_SECONDS * 1000) return hit.url;
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(storagePath, expiresIn);
  if (error || !data?.signedUrl) {
    throw new Error(`No se pudo firmar ${storagePath}: ${error?.message || "sin URL"}.`);
  }
  memoryCache.set(storagePath, { url: data.signedUrl, expiresAt: now + expiresIn * 1000 });
  return data.signedUrl;
}

export function clearSignedUrlCache(): void {
  memoryCache.clear();
}
