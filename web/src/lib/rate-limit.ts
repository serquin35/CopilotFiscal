// web/src/lib/rate-limit.ts
// Helper de Rate Limiting en memoria para Edge/Serverless (Vercel / Next.js)
// Protege los endpoints críticos de costes de IA y llamadas abusivas.

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Limpieza periódica de registros expirados cada 10 minutos
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    rateLimitStore.forEach((record, key) => {
      if (record.resetAt <= now) {
        rateLimitStore.delete(key);
      }
    });
  }, 10 * 60 * 1000);
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

/**
 * Verifica si una clave (ej: userId o IP) ha superado el límite dentro de la ventana de tiempo.
 * @param key Identificador único del cliente o usuario.
 * @param limit Número máximo de peticiones permitidas en la ventana.
 * @param windowSeconds Duración de la ventana en segundos.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const record = rateLimitStore.get(key);

  if (!record || record.resetAt <= now) {
    // Primera petición o ventana expirada: iniciar nuevo ciclo
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      success: true,
      limit,
      remaining: limit - 1,
      resetSeconds: windowSeconds,
    };
  }

  // Ventana activa: incrementar contador
  record.count += 1;
  const remaining = Math.max(0, limit - record.count);
  const resetSeconds = Math.ceil((record.resetAt - now) / 1000);

  if (record.count > limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      resetSeconds,
    };
  }

  return {
    success: true,
    limit,
    remaining,
    resetSeconds,
  };
}
