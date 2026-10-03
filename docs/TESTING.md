# TESTING — COPILOTO FISCAL

> **Versión:** 1.0 — 03/10/2026

## Unitarios (vitest, `npm run test` en raíz)

- `src/engine/fiscal/__tests__/FiscalEngine.test.ts`: RuleRegistry,
  PeriodCalculator, VatCalculator, SnapshotCalculator, validadores, anomalías.
- `src/engine/fiscal/__tests__/NifValidator.test.ts`: DNI/NIE/CIF,
  checksums, DEMO solo con `allowDemo`, enmascarado.
- Regla: todo bug fiscal reproducible se convierte en regression test.

## Estáticos

- `npx tsc --noEmit` en `web/` (obligatorio antes de push).
- `node scripts/check-keys.mjs` (secretos) — también en pre-commit.

## Base de datos (SQL Editor, manual)

- `supabase/tests/rls_smoke.sql`: RLS + policies en 11 tablas.
- `supabase/tests/rls_matrix.sql`: matriz tabla×comando con `auth.uid()`,
  sonda anon (0 filas) y guía del test de 2 usuarios con JWT.

## E2E (manual, caso principal)

Crear negocio demo → subir factura → extraer (WF-01) → revisar →
confirmar → gasto en `expenses` → dashboard recalcula → alerta →
trazabilidad visible. Medir `usage` (`prompt_tokens`) en
`document_extractions` para comparar modelos (3-5 documentos).
