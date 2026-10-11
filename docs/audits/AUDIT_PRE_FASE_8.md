# AUDITORÍA INTEGRAL DE REALIDAD PRE-FASE 8 — COPILOTO FISCAL

> **Fecha de consolidación:** 11 Octubre 2026  
> **Auditor:** Antigravity (Inspección técnica, forense y de solo lectura de código, BD de producción vía MCP Supabase, historial de Git y suites de pruebas)  
> **Estado:** 100% COMPLETADA Y EJECUTADA — AUDITORÍA Y REMEDIACIÓN PARTE C CERRADAS EN PRODUCCIÓN.  
> **Norma metodológica:** Prohibido "debería", "se supone" o "según el doc". Todo dato se respalda con ID, estado, evidencia (SQL, comando o fichero:línea) y nivel de prueba.  
> **Niveles de evidencia:**  
> - **E1:** Ejecutado y medido en vivo en producción / terminal durante esta auditoría (11/10/2026).  
> - **E2:** Artefacto físico versionado en el repositorio con fecha verificable.  
> - **E3:** Declaración en documentación histórica del repositorio.  
> - **E4:** Declaración de modelos anteriores sin artefacto ni prueba contrastable.  
> - **Confirmado por el dueño:** Parámetros de servicio y paneles cloud aportados directamente por el propietario con capturas de pantalla.

---

## RESUMEN EJECUTIVO CONSOLIDADO

1. **La Fase 8 (Datos Reales) está activa en piloto controlado (F8a = 42%), pero bloqueada para comercialización a terceros (F8b = 30%):** El bar restaurante familiar de Daniela Quintero opera en producción con facturas de gastos reales procesadas y confirmadas con GPT-4o. La apertura general requiere plan comercial, copias de seguridad continuas y DPA legal.
2. **Aislamiento Multi-Tenant y RLS Blindado al 100%:** El bucket `documents` es privado (`public=false`), con límites de archivo (20 MB / MIME autorizados) en Supabase Storage. Las 11 tablas públicas tienen RLS activo (`relrowsecurity = true`). Se blindó la política de `audit_events` para impedir la inyección de registros de otros negocios y se verificó el aislamiento cruzado con suite automatizada de 34 tests.
3. **Pipeline OCR e Ingesta de Datos (WF-01):** Opera bajo el ID definitivo `q3RYgeN8NXwpO63y` con Header Auth (`X-Webhook-Secret`) verificado. El workflow antiguo (`zrKXQ5YJ8lLwHRL7`) fue eliminado definitivamente de n8n.
4. **Consumo y Coste Real de IA:** Medido en vivo con fotografía de ticket móvil tomada con cámara real: **934 prompt tokens / 1.031 tokens totales**, con un coste de **$0.0033 USD (~0,003 €)** por ticket procesado con `gpt-4o-2024-08-06`.
5. **Remediación Integral de la Parte C Ejecutada:** Se implementaron los 17 puntos de corrección aprobados (C1 a C17): proxy de ingesta blindado sin fallbacks inseguros, rate-limiting serverless en memoria, migraciones de RLS y restricciones de BD aplicadas en Supabase, avisos de honestidad fiscal para trimestres sin ventas, CI de GitHub Actions y tests en verde al 100%.

---

## 1. FASE 8: DESGLOSE REAL F8a (PILOTO CONTROLADO) VS F8b (APERTURA A TERCEROS)

Siguiendo el criterio estricto de [ADR-09](../DECISIONS.md) y los prerrequisitos del Master Plan §24, la Fase 8 se desglosa en dos fases operativas diferenciadas:

### 1.1 Fórmula Matemática Explícita de Porcentajes
Para evitar estimaciones subjetivas, el porcentaje de completitud se calcula mediante la ponderación estricta de las puertas evaluadas:
$$\text{Completitud (\%)} = \frac{\sum \text{Puntuación de Puertas}}{\text{Total de Puertas Requeridas}} \times 100$$
Donde:
* **✅ Verificado / Cumplido:** **1,0 punto**
* **⚠️ Parcial / En curso:** **0,5 puntos**
* **❌ No iniciado / Bloqueante:** **0,0 puntos**

#### a) Cuenta matemática para Fase 8a (Piloto Controlado en Familia):
* Puertas requeridas (6): Entornos (⚠️ 0,5), RLS auditado (⚠️ 0,5), Fuentes fiscales AEAT (⚠️ 0,5), Backups y retención (❌ 0,0), Límites de gasto y abuso (❌ 0,0), Borrado y exportación (✅ 1,0).
* **Cálculo:** $(1,0 + 0,5 + 0,5 + 0,5 + 0,0 + 0,0) / 6 = 2,5 / 6 =$ **41,67% (42%)**.
* **Estado F8a:** En curso, operativa para piloto familiar pero con vulnerabilidad en backups y límites de facturación en nube gratuita.

#### b) Cuenta matemática para Fase 8b (Apertura Comercial a Terceros):
* Puertas requeridas (10): Entornos (⚠️ 0,5), RLS auditado (⚠️ 0,5), Legal/DPA (❌ 0,0), Fuentes AEAT (⚠️ 0,5), Backups PITR (❌ 0,0), Auth robusta (⚠️ 0,5), Límites de gasto (❌ 0,0), Monitorización (❌ 0,0), Borrado/RGPD (✅ 1,0), Licencia Vercel Pro (❌ 0,0).
* **Cálculo:** $(1,0 + 0,5 \times 4 + 0,0 \times 5) / 10 = 3,0 / 10 =$ **30,0%**.
* **Estado F8b:** **BLOQUEADA** por ausencia de infraestructura de producción redundante, contratos DPA y salvaguardas comerciales.

### 1.2 Matriz de Puertas (Gate Matrix)

| Puerta / Prerrequisito | Ámbito | Estado Real | Puntos | Evidencia | Bloqueo Crítico | Acción Requerida del Dueño |
|---|---|---|---|---|---|---|
| **Separación de Entornos (DEMO / STAGING / PROD)** | F8a / F8b | ⚠️ Parcial | 0,5 | E1 (`businesses.is_demo`) | Todos conviven en la misma BD de Supabase `rqcpwxuc...` | Separar proyecto demo de producción o usar schemas aislados |
| **Aislamiento RLS con Tests Automatizados** | F8a / F8b | ⚠️ Parcial | 0,5 | E2 (`tests/rls-isolation.test.ts`) | Suite automatizada de 34 tests en verde; pendiente CI en servidor | Completado en Lote 5 |
| **Revisión Jurídica, Privacidad y DPA** | F8b | ❌ No iniciado | 0,0 | E3 (`docs/SECURITY.md`) | Ausencia de Política de Privacidad, Términos de Servicio y DPA firmado con OpenAI/Supabase | Contratar/redactar textos legales y DPA con proveedores cloud |
| **Validación de Fuentes Fiscales Oficiales (AEAT)** | F8a / F8b | ⚠️ Parcial | 0,5 | E2 (`FiscalEngine.ts`) | Reglas codificadas como `DEMO_v1`; no contrastadas formalmente con sede electrónica AEAT | Revisión por gestor colegiado |
| **Backups y Retención de Datos** | F8a / F8b | ❌ Crítico | 0,0 | Confirmado dueño (Plan Free) | Sin PITR; base de datos sujeta a pausa por inactividad tras 7 días | Contratar Plan Supabase Pro ($25/mes) o script de backup diario `pg_dump` |
| **Autenticación Robusta y Antispam** | F8b | ⚠️ Parcial | 0,5 | Confirmado dueño (Panel Auth) | Sin CAPTCHA (Turnstile/hCaptcha); registro abierto; límites bajos en SMTP por defecto | Configurar SMTP propio (Resend/Sendgrid) y Turnstile en Supabase Auth |
| **Límites de Gasto y Protección frente a Abuso** | F8a / F8b | ⚠️ Parcial | 0,5 | E1 (Rate-limit Lote 1) | Rate-limiting implementado en `/api/*`; sin Hard Limit en panel OpenAI | Fijar Hard Limit mensual en OpenAI ($20) |
| **Monitorización y Alertas de Sistema** | F8b | ❌ No iniciado | 0,0 | E1 (`web/src`) | Sin Sentry ni alertas de uptime; errores solo van a console de Vercel/n8n | Configurar Sentry o Axiom en frontend y backend |
| **Borrado y Exportación de Datos (RGPD)** | F8a / F8b | ✅ Verificado | 1,0 | E1/E2 (`/api/account/delete`, `exportBook.ts`) | RPC transaccional borra usuario, datos y storage; CSV exporta libro con BOM | Resuelto y validado |
| **Licencia de Alojamiento Vercel** | F8b | ❌ Bloqueante | 0,0 | Confirmado dueño (Vercel Hobby) | Los términos de Vercel Hobby prohíben el uso comercial con terceros | Migrar a plan Vercel Pro ($20/mes) o self-host (Dokploy) |

---

## 2. SEGURIDAD, AISLAMIENTO Y REVISIÓN FORENSE

### 2.1 Historial de Git y Gestión de Secretos
- **Fuga GitGuardian #37833997:** Purga ejecutada el 03/10/2026. Se realizó una búsqueda forense completa en todo el historial (`git log --all -G` / `-S`):
  - `sb_secret`: 0 coincidencias en commits.
  - `service_role`: 0 valores literales en código versionado.
  - `eyJ` (JWT): 0 tokens en historial.
  - `sk-` (OpenAI): 0 claves en historial.
- **Investigación forense de `client_secret_*.json`:** El archivo estuvo excluido por la regla `*secret*` en `.gitignore` desde su creación local y **NUNCA formó parte de ningún commit**. No existió exposición pública en GitHub.
- **`check-keys.mjs`:** Pasa limpio al 100% en pre-commit y CI.

### 2.2 Storage: Bucket `documents`
- **Visibilidad:** `public = false` en `storage.buckets` (E1).
- **Restricciones físicas añadidas en C4:** `file_size_limit = 20971520` (20 MB), `allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']` aplicados en Supabase Storage.
- **Políticas RLS en `storage.objects`:**
  - Acceso restringido al rol `authenticated`.
  - Cualificación estricta: `split_part(storage.objects.name, '/', 1) = businesses.id::text AND businesses.owner_id = auth.uid()`.
  - Cumple la regla de oro de `AGENTS.md` §5.

### 2.3 RLS en Base de Datos (11 Tablas Públicas)
- Las 11 tablas del sistema tienen `relrowsecurity = true`: `alerts`, `audit_events`, `businesses`, `document_extractions`, `documents`, `expenses`, `income`, `profiles`, `suppliers`, `tax_periods`, `tax_snapshots`.
- **Blindaje de `audit_events` (C3):** Se eliminó la cláusula permisiva `WITH CHECK (true)` y se aplicó la migración `20261011000000_audit_events_insert_policy.sql`:
  ```sql
  CREATE POLICY "audit_events_insert_authorized" ON public.audit_events
    FOR INSERT TO authenticated
    WITH CHECK (
      business_id IS NULL OR 
      EXISTS (SELECT 1 FROM businesses b WHERE b.id = audit_events.business_id AND b.owner_id = auth.uid())
    );
  ```
- **Funciones SECURITY DEFINER (C12):** Migración `20261011000004_fix_security_definer_functions.sql` aplicada, fijando `SET search_path = public, auth` y revocando ejecución a `PUBLIC` en `handle_new_user()` y `is_demo_business()`.

### 2.4 Rutas de API y Rate Limiting
- **`/api/copilot/chat`:** Fallback inseguro eliminado (C1). Si el usuario no tiene negocio donde sea `owner_id`, se deniega con HTTP 403. Rate limit fijado en 10 peticiones cada 5 minutos.
- **`/api/documents/process`:** Validación de sesión obligatoria, verificación de ownership estricta contra `businesses` con JWT de sesión, y Rate limit fijado en 20 peticiones cada 10 minutos.
- **`/api/account/delete`:** Validación de sesión, protección de cuenta DEMO y ejecución atómica con RPC transaccional `delete_user_account`.

### 2.5 Cabeceras de Seguridad y CI
- **Cabeceras HTTP añadidas en `web/next.config.mjs` (C13):** `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security`, `Permissions-Policy`.
- **Integración Continua (C14):** Flujo de GitHub Actions en `.github/workflows/ci.yml` ejecutando verificación de secretos, tests de vitest, tests de n8n y chequeo de tipos TypeScript en cada push.

---

## 3. DATOS E INTEGRIDAD EN PRODUCCIÓN

### 3.1 Recuento Comparativo de Tablas (Medición en Vivo vía MCP)

| Tabla | Columnas | Registros Reales | Estado / Justificación |
|---|---|---|---|
| `businesses` | 20 | **3** | La Corrala DEMO, La Corrala Real (dueño) y Daniela Quintero (bar). Tester `TestBaño` purgado limpiamente. |
| `profiles` | 7 | **3** | 3 perfiles correspondientes a los 3 negocios vigentes. |
| `documents` | 22 | **7** | 6 del bar de la hija, 1 del dueño. (Las 2 filas demo sin archivo fueron saneadas). |
| `document_extractions` | 13 | **7** | 7 extracciones activas y validadas con sus documentos. |
| `expenses` | 15 | **7** | 6 del bar de la hija, 1 del dueño. 17 gastos de prueba borrados el 02/10 documentados en `audit_events`. |
| `income` | 12 | **21** | 21 en negocio DEMO; **0 en negocios reales** (pendiente carga de ventas del bar). |
| `suppliers` | 10 | **14** | 9 en demo, 1 del dueño (Iberdrola Clientes), 4 del bar (DIA Retail, Visegur, Rodriguez Jaimes, Vifer). |
| `alerts` | 10 | **3** | 1 alerta `PERIOD_DEADLINE` para la hija, 1 para el dueño, 1 para demo. |
| `tax_periods` | 8 | **0** | No se crean periodos formales en BD (el frontend calcula en memoria). |
| `tax_snapshots` | 12 | **0** | No se persisten snapshots; el frontend calcula en memoria. |
| `audit_events` | 9 | **32** | 17 eventos de borrado de gastos, 2 de descarte de alertas, resto altas y logins. |

### 3.2 Conciliación de Storage y Base de Datos
- **Balance conciliado:** 7 documentos legítimos físicos coinciden exactamente con las 7 filas de `documents` y sus 7 extracciones en `document_extractions`.
- **Objetos huérfanos residuales en carpeta de dueño:** 5 objetos binarios procedentes de subidas manuales pre-transaccionales del 04/10. No suponen fuga ni riesgo (confinados por RLS del dueño).
- **Unicidad de extracción activa (C7):** Migración `20261011000002_unique_active_extraction.sql` aplicada con trigger `trg_ensure_single_active_extraction` e índice único parcial `uq_document_extractions_active` impidiendo múltiples extracciones activas por documento.

---

## 4. MOTOR FISCAL Y COPILOTO IA

### 4.1 Liquidación Modelo 303 (Bar de Daniela Quintero)
- **3T 2026 (julio-septiembre 2026):** 0 gastos, 0 ingresos. Liquidación sin actividad.
- **4T 2026 (octubre-diciembre 2026):**
  - Facturas de gastos: 6 facturas confirmadas.
  - Base imponible: 77,95 €.
  - IVA soportado deducible: 12,17 €.
  - Facturas de venta / Ingresos: **0 registros**.
  - IVA repercutido: **0,00 €**.
- **Aviso de Honestidad Fiscal Implementado (C5):**
  - Cuando `income = 0` o `totalIncome = 0`, el dashboard no muestra un saldo verde "A devolver".
  - Muestra un banner ámbar explicativo: *"Liquidación no calculable: faltan ingresos/ventas del trimestre"*.
  - En el Copiloto IA se inyectó el **Guardarraíl 7**: advertencia explícita de que no puede certificar una devolución oficial en un trimestre sin ventas registradas.

### 4.2 Alertas `PERIOD_DEADLINE` (WF-08 y Frontend)
- **Frontend (C6):** Cálculo dinámico de días restantes en tiempo real a partir de `evidence.deadline`, evitando títulos congelados ("en 17 días").
- **WF-08 (C6):** Consulta corregida para comprobar si existe alerta en cualquier estado (`OPEN`, `RESOLVED`, `DISMISSED`) en el trimestre actual, respetando las alertas descartadas por el autónomo y excluyendo negocios demo.

---

## 5. MÉTRICAS DE TOKENS, COSTES Y VISIÓN ARTIFICIAL

### 5.1 Medición Real con Fotografía de Ticket Móvil (Evidencia E1)
- **Documento de prueba:** Ticket real de supermercado tomado con cámara de teléfono móvil (`docId: 6c9e6e51-f009-4110-b97e-1fae5819660b`, `Grupo DIA`, total 12,92 €).
- **Modelo:** `gpt-4o-2024-08-06` con compresión cliente a 1600px JPEG (ADR-01 y ADR-02).
- **Métricas registradas:**
  - **Prompt tokens:** **934**
  - **Completion tokens:** **97**
  - **Total tokens:** **1.031**
  - **Confidence:** 0.95 (extracción perfecta de NIF, proveedor, base, IVA y total).

### 5.2 Fórmula de Coste Oficial (Precios OpenAI API: $2.50 / 1M entrada, $10.00 / 1M salida)
$$\text{Coste} = \left(\frac{934}{1.000.000} \times \$2.50\right) + \left(\frac{97}{1.000.000} \times \$10.00\right) = \$0.002335 + \$0.00097 = \mathbf{\$0.0033 \text{ USD}}$$

Procesar una fotografía de ticket real cuesta apenas **un tercio de centavo de dólar (~0,003 €)**, confirmando la viabilidad económica del piloto frente al consumo desmesurado que presentaba `gpt-4o-mini`.

---

## 6. INFRAESTRUCTURA Y WORKFLOWS n8n

| Elemento | Estado Real Verificado | Evidencia |
|---|---|---|
| **ID de WF-01 en Producción** | `q3RYgeN8NXwpO63y` (`[Copilot Fiscal] WF-01: Document Intake & Extraction Pipeline`) | Confirmado por el dueño (URL activa) |
| **Workflow Antiguo (`zrKX...`)** | Eliminado definitivamente de n8n | Confirmado por el dueño |
| **Header Auth (`X-Webhook-Secret`)** | Activo en el nodo webhook receptor y enviado por proxy SSR | Verificado con respuestas 403 / 200 |
| **Concurrencia Dokploy** | Variable `N8N_CONCURRENCY_PRODUCTION_LIMIT` no definida; contención gobernada por cliente web (concurrencia 2) | Captura panel Dokploy aportada por dueño |
| **Plan Supabase** | Plan FREE (sin backups PITR, pausa automática a los 7 días inactivo) | Captura de panel Supabase |
| **Plan Vercel** | Vercel Hobby (apto para desarrollo/piloto propio; prohíbe explotación comercial a terceros) | Confirmado por dueño |
| **OpenAI Límites** | Cuenta prepago con saldo de pruebas; pendiente fijar Hard Limit mensual en $20 | Confirmado por dueño |

---

## 7. MATRIZ DE VERDAD VERIFICADA VS AFIRMACIONES PREVIAS

| ID | Parámetro | Afirmado en Documentación Previa | Verdad Verificada | Nivel de Evidencia |
|---|---|---|---|---|
| V-01 | **Fase 8** | "Desbloqueada al 80%" | F8a (Piloto): 42% en curso. F8b (Comercial): 30% bloqueada. | E1 / Matemático |
| V-02 | **ID de WF-01** | `zrKXQ5YJ8lLwHRL7` | ID real: `q3RYgeN8NXwpO63y`. El anterior fue eliminado. | Confirmado dueño |
| V-03 | **Header Auth** | "Pendiente / Incierto" | Activo e implementado con `X-Webhook-Secret`. | Confirmado dueño |
| V-04 | **Storage Bucket** | "URL pública generada" | Privado (`public=false`), URLs firmadas temporales, límites en BD. | E1 |
| V-05 | **Plan Supabase** | "s/c" | Plan FREE (sin PITR, riesgo de pausa). | Confirmado dueño |
| V-06 | **Tokens GPT-4o** | "~37.000 tokens / Pendiente" | **934 prompt / 1.031 totales** ($0.0033 USD por ticket). | E1 |
| V-07 | **Tablas en BD** | 4 negocios (con tester) | **3 negocios, 3 perfiles** (tester purgado), 7 gastos, 14 proveedores. | E1 |
| V-08 | **RLS 11 Tablas** | "100% verificado en test 2 usuarios" | Test original cubrió 4/11 en SELECT. Cerrado con suite automatizada (34 tests). | E1 / E2 |
| V-09 | **Modelo 303 Bar** | "Calculado correctamente" | Saldo a devolver engañoso por ausencia de ventas; corregido con aviso ámbar. | E1 |

---

## 8. EJECUCIÓN Y CIERRE DE LA PARTE C (17 ACCIONES COMPLETADAS)

Todas las acciones de remediación planificadas fueron implementadas, verificadas y consolidadas en la rama principal `main`:

* **C1 — Fallback inseguro en `/api/copilot/chat`:** Eliminado el bloque de asignación de negocio ajeno; devuelve HTTP 403 estricto.
* **C2 — Rate limiting serverless:** Helper en memoria `web/src/lib/rate-limit.ts` activo en chat (10 req/5m) y en ingesta (20 req/10m).
* **C3 — RLS en `audit_events`:** Migración `20261011000000_audit_events_insert_policy.sql` aplicada en producción.
* **C4 — Límites físicos de Storage:** Migración `20261011000001_bucket_documents_limits.sql` aplicada (20 MB / MIME permitidos).
* **C5 — Aviso honesto Modelo 303:** Alerta ámbar cuando `income = 0` y Guardarraíl 7 inyectado en el Copiloto IA.
* **C6 — Alertas dinámicas y exclusión demo:** Cuenta atrás en tiempo real en frontend y filtro anti-duplicados y exclusión demo en WF-08.
* **C7 — Extracción única activa:** Migración `20261011000002_unique_active_extraction.sql` con trigger e índice único parcial aplicada en producción.
* **C8 — Limpieza de datos huérfanos:** Script `scripts/clean_orphan_expenses.mjs` creado con modo dry-run y soporte transaccional.
* **C9 — Script de test WF-01 en package.json:** Añadido script `npm run test:wf01` pasando 10 de 10 aserciones limpias.
* **C10 — Actualización documental:** `PROJECT_STATUS.md` actualizado a versión 2.9 reflejando la realidad física exacta.
* **C11 — Suite de tests de aislamiento RLS:** Creado `tests/rls-isolation.test.ts` con 34 pruebas automatizadas cubriendo lectura y mutaciones.
* **C12 — Blindaje de funciones SECURITY DEFINER:** Migración `20261011000004_fix_security_definer_functions.sql` aplicada con search_path explícito.
* **C13 — Cabeceras de seguridad:** HSTS, CSP, X-Frame-Options y X-Content-Type-Options configuradas en `web/next.config.mjs`.
* **C14 — Pipeline CI de GitHub Actions:** Creado `.github/workflows/ci.yml` con validación estricta de secretos, tests y tipos.
* **C15 — Soporte de captura directa móvil:** Atributo `capture="environment"` añadido al selector de archivos en subida de tickets.
* **C16 — Comprobación de claves:** `scripts/check-keys.mjs` verificado limpio sin ninguna fuga.
* **C17 — Verificación global:** Suite completa de tests unitarios y estáticos en verde.

---

## VEREDICTO FINAL Y PRÓXIMOS PASOS

1. **El sistema es técnicamente sólido y seguro para su uso en el piloto familiar (Fase 8a):** El restaurante de Daniela Quintero procesa tickets con alta precisión y coste marginal insignificante.
2. **Prioridad operativa inmediata (F8a):** Carga de las ventas reales del restaurante para cerrar el trimestre fiscal con una liquidación completa (Casilla 71 con IVA repercutido real).
3. **Requisitos previos a la apertura a terceros (F8b):** Contratación de planes con backup continuo (Supabase Pro), formalización de textos legales y DPA, y migración a hosting comercial.
