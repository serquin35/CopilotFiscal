# SECURITY — COPILOTO FISCAL

> **Versión:** 1.0 — 03/10/2026
> Reglas operativas: `AGENTS.md` §1. Incidente de referencia: GitGuardian #37833997.

## Secretos

- Prohibido commitear: `eyJ…` (JWT), `sk-…`, `sb_secret_…`, `sbp_…`,
  passwords, tokens, `.pem`, credenciales n8n embebidas.
- Claves activas (03/10/2026): formato `sb_*` (`sb_publishable_…` en cliente,
  `sb_secret_…` solo servidor/n8n). Legacy `anon`/`service_role` JWT:
  **desactivadas** (`Disable JWT-based API keys`) tras la fuga.
- `.env`, `.env.local`, `*secret*`, `*credentials*` están en `.gitignore`.
- Workflows n8n: secretos solo vía gestor de credenciales o `$env`;
  sanitizar exports antes de `git add`.
- Guardián: `scripts/check-keys.mjs` + hook pre-commit (bloquea el commit).

## Datos y acceso

- RLS activo en las 11 tablas; `service_role`/`sb_secret_` nunca en frontend.
- Aislamiento por `business_id` (`owner_id = auth.uid()`).
- Auditoría: `audit_events` imborrable; `tax_snapshots` inmutables.
- Storage `documents` **público solo aceptable en DEMO**; Fase 8 exige
  bucket privado + signed URLs (WF-01 usa hoy URL pública).
- Webhook WF-01 sin autenticación: deuda DT-18 (header secreto pendiente).

## Respuesta a fugas

1. Rotar la clave (revocar la comprometida).
2. Propagar (Vercel, n8n, `.env` local) y verificar con un solo request.
3. Purgar historial (`git-filter-repo` + force-push) y marcar el incidente.
