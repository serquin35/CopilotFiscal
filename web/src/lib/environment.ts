// web/src/lib/environment.ts
// Separación DEMO / STAGING / PRODUCTION (Fase 8 prerrequisito).
// Fuente: businesses.is_demo (server). El banner global lo consume AppShell.

import type { Business } from "@/context/AuthContext";

export function isDemoBusiness(business: Business | null | undefined): boolean {
  return business?.is_demo ?? false;
}

export const DEMO_BANNER_TEXT =
  "ENTORNO DE SIMULACIÓN — Datos y cálculos ficticios, sin validez fiscal ni tributaria.";
