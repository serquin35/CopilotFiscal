# AGENTS.md — Instrucciones obligatorias para modelos IA (Antigravity y otros)

> Este fichero se lee ANTES de cualquier cambio. Su incumplimiento causó el
> incidente GitGuardian #37833997 (service_role filtrada en historial, oct-2026).
> Fuente de verdad del producto: `COPILOTO_FISCAL_MASTER_PLAN.md`.

## 1. Secretos — TOLERANCIA CERO

1. **NUNCA** escribir en el repo (código, JSON de n8n, docs, seeds, tests):
   `eyJ…` (JWT), `sk-proj-…`/`sk-…`, `sb_secret_…`, `sbp_…`, passwords, tokens, `.pem`.
2. La `anon`/`publishable` SOLO vive en variables de entorno (`NEXT_PUBLIC_*`).
   Prohibido hardcodearla como fallback en `web/src/**`.
3. Exportar un workflow n8n ⇒ **sanitizar antes de `git add`**: sin bloques
   `"value": "Bearer …"`, `"value": "eyJ…"` ni `credentials` embebidas.
   n8n guarda secretos SOLO en su gestor de credenciales.
4. Antes de cada commit: `node scripts/check-keys.mjs` (también corre en pre-commit).
   Si falla, sanitizar. Sin excepciones, sin “es solo la anon”.
5. `.env`, `.env.local`, `*secret*`, `*credentials*` están en `.gitignore`.
   Antes de `push`: `git status` + `git diff --stat` y revisar cada fichero nuevo.

## 2. Cambios atómicos y verificados

6. Un commit = una responsabilidad. No mezclar UI + migración + refactor.
7. Prohibido `git push --force` sin aprobación explícita del dueño
   (la purga de oct-2026 fue excepción autorizada por fuga).
8. Tras tocar `web/`: `npx tsc --noEmit` en `web/`. Tras tocar `src/engine`:
   `npx vitest run` en raíz. No se entrega en rojo.
9. Los pushes a `main` redespliegan `corrala.vercel.app`: no pushear de noche
   cambios sin probar ni con `TODO` funcionales.

## 3. Dominio fiscal (resumen — el detalle manda en el MASTER PLAN)

10. La IA propone/explica; **el código determinista valida y calcula**.
    Nada de importes decididos por prompts.
11. Solo datos ficticios en DEMO. Ninguna cifra es declaración oficial.
12. Cada cifra del dashboard debe poder rastrearse a su documento origen.

## 4. Protocolo de sesión

13. Leer `docs/PROJECT_STATUS.md` al empezar y actualizarlo al terminar
    (versión, fecha, hitos, deuda técnica).
14. Si una instrucción de este fichero choca con la tarea pedida: DETENERSE
    y preguntar. La seguridad manda sobre la velocidad.

## 5. SQL con RLS (lección del 04/10/2026)

15. En policies con subconsultas a tablas que comparten nombre de columna
    (`name`, `id`…), cualificar SIEMPRE la tabla del objeto
    (`split_part(storage.objects.name, …)`, nunca `name` a secas):
    Postgres lo enlaza a la tabla interior y deniega todo en silencio.
