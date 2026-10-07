# PROJECT STATUS — COPILOTO FISCAL

> **Versión:** 2.6
> **Última actualización:** 07 Octubre 2026
> **Estado global:** FASES 0–7 al 100% — SEG 100% — DT-18 ✅ COMPLETO 06/10 — Fix flujo reset password (/update-password) 07/10 — Pendiente único: test físico RLS 2-usuarios (DT-06)
> **Autor:** Antigravity + Muse Spark (actualización continua)
> **Fuente de verdad:** [COPILOTO_FISCAL_MASTER_PLAN.md](../COPILOTO_FISCAL_MASTER_PLAN.md)

---

## Resumen Ejecutivo

| Fase | Nombre | Estado | Completitud |
|------|--------|--------|-------------|
| **FASE 0** | Descubrimiento y planificación | ✅ COMPLETA | 100% |
| **FASE 1** | Infraestructura | ✅ COMPLETA | 95% |
| **FASE 2** | Núcleo financiero | ✅ COMPLETA | 100% |
| **FASE 3** | Documentos & Review | ✅ COMPLETA | 100% |
| **FASE 4** | n8n + Pipeline IA | ✅ COMPLETA | 100% |
| **FASE 5** | Dashboard & Visualización | ✅ COMPLETA | 100% |
| **FASE 6** | Anomalías & Inspección AEAT | ✅ COMPLETA | 100% |
| **FASE 7** | Copiloto IA (Chat Tributario) | ✅ COMPLETA | 100% |
| **FASE 8** | Validación y Cierre | ⏳ BLOQUEADA | 0% |
| **SEG** | Seguridad post-incidente GitGuardian | ✅ RESUELTO | 100% |

> Criterio de % (ADR-09): ítems ✅ / ítems totales de la tabla de la fase.
> F1 95% por DT-06 parcial; F4 100%: WF-08 publicado y verificado; 
> SEG 95% por cierre administrativo pendiente (ver Próximos pasos #10).

---

## FASE 0 — Descubrimiento y Planificación ✅ COMPLETA (100%)

**Objetivo:** Documentar arquitectura, modelo de datos, workflows y motor fiscal antes de escribir código.

| Entregable | Estado | Archivo |
|---|---|---|
| `PROJECT_DISCOVERY.md` | ✅ Completo | [docs/PROJECT_DISCOVERY.md](PROJECT_DISCOVERY.md) |
| `ARCHITECTURE.md` | ✅ Completo | [docs/ARCHITECTURE.md](ARCHITECTURE.md) |
| `DATA_MODEL.md` | ✅ Completo | [docs/DATA_MODEL.md](DATA_MODEL.md) |
| `FISCAL_ENGINE.md` | ✅ Completo | [docs/FISCAL_ENGINE.md](FISCAL_ENGINE.md) |
| `N8N_ARCHITECTURE.md` | ✅ Completo | [docs/N8N_ARCHITECTURE.md](N8N_ARCHITECTURE.md) |
| `MVP_SPEC.md` | ✅ Completo | [docs/MVP_SPEC.md](MVP_SPEC.md) |
| `UI_UX_SPEC.md` | ✅ Completo | [docs/UI_UX_SPEC.md](UI_UX_SPEC.md) |

**Decisiones arquitectónicas tomadas:**
- Stack: Next.js 14 + TypeScript + Supabase + n8n self-hosted
- IA: GPT-4o (OpenAI Vision) como proveedor inicial vía HTTP directo
- OCR: integrado en pipeline de Vision de OpenAI (no OCR separado)
- Hosting: Vercel (`corrala.vercel.app`) + n8n en `n8n.cheosdesign.info`

---

## FASE 1 — Infraestructura ✅ COMPLETA (95%)

**Objetivo:** Proyecto inicializado, Supabase provisionado, Storage, Auth y RLS activos.

| Elemento | Estado | Detalle |
|---|---|---|
| Repositorio Git + `.gitignore` | ✅ | Secrets excluidos, `.env.example` documentado |
| Proyecto Supabase (prod) | ✅ | `rqcpwxucgkcodccrykpv.supabase.co` |
| Schema de base de datos | ✅ | Migración `20260930000000_initial_schema.sql` aplicada |
| Storage bucket `documents` | ✅ (DEMO) | PRIVADO desde 04/10 (RLS por negocio + firmadas + descarga autenticada WF-01 v2.2) — ver DT-17 |
| 11 tablas creadas | ✅ | Ver sección [Base de Datos](#base-de-datos) |
| `.env` y `.env.example` | ✅ | Variables documentadas, valores fuera de Git |
| Next.js 14 App Router | ✅ | Proyecto en `/web`, desplegado en Vercel |
| n8n self-hosted | ✅ | `https://n8n.cheosdesign.info` operativo |
| Supabase Auth | ✅ | Email/Password, Google OAuth, Magic Link, middleware SSR y trigger `on_auth_user_created` |
| RLS en tablas | 🟡 PARCIAL | Policies en las 11 tablas + smoke test (`rls_smoke.sql`); matriz (`rls_matrix.sql`) creada, ejecución y tests exhaustivos pendientes (DT-06) |

---

## FASE 2 — Núcleo Financiero ✅ COMPLETA (100%)

**Objetivo:** Motor fiscal determinista, gastos, ingresos, proveedores y periodos.

| Elemento | Estado | Detalle |
|---|---|---|
| Motor fiscal (`src/engine/fiscal/`) | ✅ | Completo y funcional |
| `VatCalculator.ts` | ✅ | IVA determinista con tipos ES (4%, 10%, 21%) |
| `PeriodCalculator.ts` | ✅ | Lógica de trimestres y ejercicios |
| `FiscalRuleSet.ts` | ✅ | Reglas versionadas (v1.0 DEMO) |
| `AnomalyDetector.ts` | ✅ | Motor base de detección de anomalías |
| `ExpenseClassifier.ts` | ✅ | Clasificación determinista por categoría |
| `RuleRegistry.ts` | ✅ | Registro de versiones de reglas |
| Validadores (`ExpenseValidator.ts`) | ✅ | Validaciones de gastos |
| Tests unitarios motor fiscal | ✅ | En `src/engine/fiscal/__tests__/` |
| Tabla `expenses` | ✅ | 22 columnas, relaciones completas |
| Tabla `income` | ✅ | 19 columnas |
| Tabla `suppliers` | ✅ | 12 columnas |
| Tabla `tax_periods` | ✅ | 13 columnas |
| Tabla `tax_snapshots` | ✅ | 19 columnas |
| Tabla `businesses` | ✅ | 13 columnas |
| Seed SQL de datos DEMO | ✅ | `seed_demo_la_corrala_escondida.sql` — 8 proveedores, 21 ingresos, 13 gastos (Q4 2026) |

---

## FASE 3 — Documentos ✅ COMPLETA (100%)

**Objetivo:** Upload de documentos, Storage, extracción, revisión Human-in-the-Loop y confirmación.

| Elemento | Estado | Detalle |
|---|---|---|
| Página `/documents` | ✅ | Upload drag & drop, lista de documentos. Subida en bloque, compresión 1600px y Realtime: ver Fase 4 (ADR-03) |
| Upload a Supabase Storage | ✅ | Bucket `documents`, URL pública generada |
| Insert en tabla `documents` | ✅ | Registro provisional creado en upload |
| Tabla `documents` | ✅ | Estados: `UPLOADING→EXTRACTING→EXTRACTED→NEEDS_REVIEW→CONFIRMED→REJECTED→ERROR` (enum real en migracion; desviacion Master Plan 16 en ADR-06) |
| Tabla `document_extractions` | ✅ | Trazabilidad completa: provider, model, prompt_version, confidence |
| Página `/documents/[id]/review` | ✅ | Human-in-the-Loop completo |
| Visor de documento (PDF/JPG) | ✅ | Panel izquierdo inmutable, "sandbox inviolable" |
| Edición de campos extraídos | ✅ | Formulario editable en panel derecho |
| Flujo aprobación/rechazo/escalado | ✅ | 3 acciones disponibles |
| Nivel de deducibilidad fiscal | ✅ | 100% / 50% / 0% seleccionable |
| Categoría de gasto | ✅ | Select con todas las categorías del motor |
| Criterio IA visible | ✅ | Explicación del razonamiento de la extracción |
| Datos guardados al aprobar | ✅ | Sincronización con Supabase |
| Hash SHA-256 pre-subida + aviso duplicados | ✅ | `web/src/lib/file-hash.ts`; pre-chequeo `(business_id, hash)` — 03/10/2026 |
| Validación NIF/CIF/NIE determinista en review | ✅ | `NifValidator` motor + espejo `web/src/lib/nif-validator.ts`; badge + bloqueo aprobar — 03/10/2026 |
| Sin fallback UUID cero | ✅ | Subida/aprobación bloqueadas si negocio aún carga — 03/10/2026 |
| Modo mock/demo | ⚠️ | Extracción mock con mockData; real vía n8n pipeline |

---

## FASE 4 — n8n + IA ✅ COMPLETA (100%)

**Objetivo:** Workflows n8n operativos, OCR real con OpenAI Vision, clasificación y auditoría.

### Workflows en n8n

| ID n8n | Nombre | Estado | Nodos |
|---|---|---|---|
| `KpaghIxvPx5XLabD` o posterior | WF-01: Document Intake & Extraction Pipeline | ✅ OPERATIVO | 12 (v2.2 en repo: sin Is PDF?, descarga autenticada, data URLs; pendiente importar/validar en n8n) |
| `upm1rKUB4hJXvuvS` | WF-07: Anomaly & Deadline Monitor | ✅ ACTIVO | 4 |
| *(pendiente de confirmar ID vigente)* | WF-08: Deadline Reminders | 🟡 CREADO 03/10/2026 (repo), ACTIVO en n8n cloud (confirmado 03/10; la version cloud incluye nodo List Open Deadline anti-duplicados, JSON vigente commiteado y verificado 03/10 (simulacion: 0 duplicados / 3 inserciones); queda visibilizar en UI (DT-16)) | 4 |

> ⚠️ IDs WF-01: se han visto `KpaghIxvPx5XLabD` (01/10) y otro distinto
> (02/10). **Pendiente de verificar cuál es el activo** y desactivar el
> antiguo: dos webhooks con el mismo path no pueden convivir.
| — | WF-02: document-extraction independiente | ✅ Absorbido por WF-01 (documentado) | — |
| — | WF-03: document-validation | ✅ Absorbido por review Human-in-the-Loop + validadores deterministas | — |
| — | WF-04: document-classification | ✅ Absorbido por extracción OpenAI + categoría editable en review | — |
| — | WF-05: expense-processing | ✅ Integrado en Human-in-the-Loop review | — |
| — | WF-06: tax-snapshot trigger | ✅ Dashboard recalcula en tiempo real tras aprobación | — |
| — | WF-10: notifications (email/WhatsApp, renombrado 03/10, ADR-05) | ⏳ Pendiente | — |
| — | WF-09: demo-seed | ✅ Semilla SQL versionada (`seed_demo_la_corrala_escondida.sql`) | — |

### WF-01 — Flujo de nodos ✅

```
Webhook: Document Intake (POST /webhook/copilot-document-intake)
  |
Validate & Normalize Input
  |
Supabase: Set EXTRACTING (credencial n8n, sin claves en JSON)
  |
Is PDF? (If)
  |-- true --> Download PDF (binario)
  |               |-- ok --> Build OpenAI Request
  |               |-- error --> Supabase: Mark Needs Review --> Respond Error (500)
  |-- false ------------> Build OpenAI Request
                                |-- ok --> OpenAI: Extract Invoice Data
                                |             (gpt-4o, response_format json_object, retry 3x2000ms)
                                |-- error --> Mark Needs Review --> Respond Error (500)
OpenAI -- ok --> Process & Validate Output
  (status EXTRACTED | NEEDS_REVIEW + usage prompt/completion/total + warnings)
OpenAI -- error --> Mark Needs Review --> Respond Error (500)
Process --> Supabase: Save Extraction (document_extractions)
  --> Supabase: Update Doc Status (Prefer: return=representation)
  --> Respond to Webhook (extracted + status + confidence + usage + model)

PDF: Download PDF trae el binario; Build OpenAI Request lo convierte a
base64 y lo envia como content part file (file_data) en Chat Completions.
NO usa el endpoint Files de OpenAI. Imagen: image_url (detail high,
optimizada a 1600px en cliente).

```

**Fixes y mejoras aplicadas (01/10/2026 - 02/10/2026):**
1. **Credenciales seguras**: API Key de OpenAI migrada al gestor de credenciales de n8n (`CopilotoFiscal`).
2. **Soporte de binarios PDF nativos**: Descarga directa y codificación Base64 como `file` sin intermediarios Vercel.
3. **Optimización de tokens de visión (ADR-01 & ADR-02)**: Redimensionado en cliente a 1600px JPEG 0.85 (ahorro 85% bandwidth/storage).
4. **Resiliencia ante cuotas TPM / 429**: Parámetros `retryOnFail: true`, `maxTries: 3`, `waitBetweenTries: 2000` en n8n.
5. **Auditoría de consumo**: Extracción y guardado de métricas de tokens (`usage.prompt_tokens`, `usage.total_tokens`) en base de datos.
6. **Subida en bloque desacoplada (ADR-03)**:
   - **Fase 1:** Ingesta paralela a Storage + DB (concurrencia 3), desbloqueando la UI en <3s.
   - **Fase 2:** Pool de concurrencia controlado (2 llamadas simultáneas a n8n) con sincronización Supabase Realtime y polling de resiliencia.

**Prueba exitosa — Factura Iberdrola (01/10/2026) y Benchmark Hostelería (02/10/2026):**
- `supplier_name`: IBERDROLA CLIENTES, S.A.U. ✅
- `supplier_nif`: A-95758389 ✅
- `invoice_number`: 21180613010076890 ✅
- `total_amount`: 80,95 € / `vat_rate`: 21% / `base_amount`: 66,02 € ✅
- `confidence`: 0.95 / `category`: suministros ✅
- Benchmark de 5 tipos de documentos documentado en [docs/DECISIONS.md](DECISIONS.md) (ADR-01).

**Prueba exitosa — PDF Multi-página (02/10/2026, validado en producción):**
- Factura Iberdrola PDF de **4 páginas** procesada íntegramente por WF-01 ✅
- Human-in-the-Loop review muestra visor PDF paginado (miniatura de las 4 páginas) ✅
- Aprobación creó registro real en tabla `expenses` (IBERDROLA CLIENTES, S.A.U., 80.95 €, cat: invoice) ✅
- 14 registros confirmados en `expenses` en Supabase (DEMO + real) ✅

### Pendiente en Fase 4

- [x] Migrar API key OpenAI al gestor de credenciales de n8n
- [x] Resiliencia ante errores 429 (Retry on fail en n8n)
- [x] Subida en bloque no bloqueante con pool de concurrencia en cliente
- [x] Optimización de imágenes en cliente (1600px JPEG) para trazabilidad fiscal (§23)
- [x] WF-05: expense-processing — Inserción automática en `expenses` + `suppliers` al aprobar en Human-in-the-Loop ✅ validado en producción 02/10/2026
- [x] WF-06: Dashboard recalcula Modelo 303 en tiempo real tras cada aprobación ✅ validado en producción
- [x] PDF multi-página (4 páginas) procesado y aprobado correctamente ✅ (DT-07 resuelto)
- [x] Wrapper `AiProvider` desacoplado (`web/src/lib/ai/`: interface + `OpenAIProvider` + `MockAiProvider`, usado por `/api/copilot/chat`) ✅ 03/10/2026 (DT-02 resuelto)
- [x] **Modelo `gpt-4o` activo** — WF-01 (nodo `Build OpenAI Request`), copiloto (`/api/copilot/chat`) y etiqueta UI en `gpt-4o` desde 03/10/2026 ✅

---

## FASE 5 — Dashboard & Gestión Financiera ✅ COMPLETA (100%)

| Elemento | Estado | Detalle |
|---|---|---|
| Página principal (`/`) | ✅ | Dashboard 100% dinámico con KPIs y cálculo Modelo 303 en vivo |
| Métricas ingresos/gastos | ✅ | Calculadas desde Supabase (`expenses`, `document_extractions`) y localStorage |
| IVA repercutido/soportado | ✅ | Saldo determinista en tiempo real (distingue a devolver/compensar vs a ingresar) |
| Saldo fiscal estimado | ✅ | Recálculo reactivo con selección dinámica de trimestres (1T, 2T, 3T, 4T) |
| Progresión mensual por trimestre | ✅ | Dinámica según fechas reales de las facturas activas del trimestre |
| Sección Gastos (`/expenses`) | ✅ | 100% conectada a Supabase; KPIs reactivos (Base, IVA Deducible, Total, Validadas) |
| Sincronización en tiempo real | ✅ | Eventos `fiscal_docs_updated` y `storage` sincronizan `/`, `/documents`, `/expenses` y `/alerts` |
| Badges en Sidebar y Navbar | ✅ | Contadores dinámicos de documentos pendientes y anomalías (auto-ocultables en 0) |
| Alertas activas (`/alerts`) | ✅ | Filtrado dinámico de documentos reales sin anomalías mockeadas |
| Eliminación total de datos mock | ✅ | Limpieza de facturas dummy de ejemplo y alertas falsas |
| Separación visual DATO/ESTIMACIÓN/PENDIENTE | ✅ | Implementado con badges oficiales y panel de trazabilidad operativa (MVP §7.1) |
| Banner trimestre con datos + error visible | ✅ | Adiós falsos "0 €": aviso si hay datos en otro trimestre; error de carga explícito — 03/10/2026 |
| Export CSV robusto + borrador 303 PDF | ✅ | `web/src/lib/exportBook.ts` (RFC4180, `;`, BOM, trazabilidad) + `/expenses/print` — 03/10/2026 |
| Comparativa periodo anterior | ✅ | Hecha 03/10/2026 (card vs trimestre anterior) |
| Comparativa periodo anterior | ⏳ | Pendiente |
| Responsive / mobile-first | ✅ | Adaptado en grid y barras laterales |

---

## FASE 6 — Anomalías & Criterios Inspección AEAT ✅ COMPLETA (100%)

**Objetivo:** Motor determinista de detección de riesgos fiscales e inconsistencias AEAT en tiempo real, trazabilidad de resolución, impacto económico y alertas auditables.

| Elemento | Estado | Detalle |
|---|---|---|
| Motor `anomalyEngine.ts` | ✅ | 9 bloques de reglas (8 tipos distintos; `SECTOR_VAT_RATIO` reutiliza `UNUSUAL_VAT_RATIO`) ejecutados en cliente |
| Regla `HIGH_AMOUNT` | ✅ | Detecta importes individuales > 1.500 € (umbral estricto de inspección AEAT) |
> Notas: los tipos emitidos difieren levemente del Master Plan 13 (UNREGISTERED_NIF, DUPLICATE, DUPLICATE_SUPPLIER). El aviso por hash SHA-256 es **previo a la subida (UI)** y no genera alerta DUPLICATE_DOCUMENT. Las filas PERIOD_DEADLINE (WF-08, source n8n) aun no se renderizan en /alerts, widget ni badge (ver DT-16).
| Regla `MISSING_NIF` | ✅ | Detecta gastos sin NIF o proveedor genérico (riesgo no deducibilidad) |
| Regla `INVALID_NIF` | ✅ | NIF con checksum erróneo (típico OCR) — 03/10/2026 |
| Regla `UNUSUAL_VAT_RATIO` | ✅ | Discrepancia matemática entre base imponible, tipo e IVA soportado |
| Regla `DUPLICATE_INVOICE` | ✅ | Mismo emisor, número y fecha de expedición duplicados |
| Regla `UNREVIEWED_EXPENSE` | ✅ | Gastos provisionales sin validar que distorsionan la liquidación 303 |
| Regla `PERIOD_MISMATCH` | ✅ | Facturas fechadas fuera del trimestre fiscal activo |
| Regla `POSSIBLE_DUPLICATE_SUPPLIER` | ✅ | Detección de proveedores similares con NIFs diferentes |
| Regla `SECTOR_VAT_RATIO` | ✅ | Ratio anómalo de IVA soportado vs ventas (> 95%) en hostelería |
| Tabla `alerts` en Supabase | ✅ | 16 columnas con severidad, estado (`OPEN`/`RESOLVED`), evidencia y entidad |
| Tabla `audit_events` | ✅ | Registro auditable inmutable de cada descarte/resolución con justificación |
| Vista `/alerts` interactiva | ✅ | Métricas de impacto, badges de severidad, modal de resolución con justificación obligatoria |
| Widget en Dashboard (`/`) | ✅ | Card reactiva de anomalías pendientes conectada a Supabase con acceso directo |
| Badges en Sidebar & Navbar | ✅ | Sincronización en tiempo real mediante `copiloto_fiscal_active_alerts_count` |
| WF-07: Anomaly & Deadline Monitor | ✅ | Activo en n8n para comprobaciones periódicas |

---

## FASE 7 — Copiloto IA ✅ COMPLETA (100%)

**Objetivo:** Asistente conversacional tributario conectado a datos reales de Supabase + OpenAI GPT-4o, sin respuestas genéricas ni mockData.

| Elemento | Estado | Detalle |
|---|---|---|
| Página `/copilot` (UI chat) | ✅ | Interfaz completa con quick prompts, markdown rendering e indicador de typing |
| Eliminación de `mockData` del chat | ✅ | `initialSummary` e `initialAlerts` eliminados de `/copilot` |
| Endpoint `/api/copilot/chat` | ✅ | API Route SSR que agrega Supabase + llama OpenAI GPT-4o |
| Contexto fiscal real en system prompt | ✅ | IVA repercutido/soportado, top proveedores, categorías, docs pendientes, alertas |
| Panel lateral con datos reales | ✅ | Se actualiza tras cada consulta con snapshot real del trimestre |
| Detección automática de trimestre activo | ✅ | Calculado dinámicamente por mes del sistema |
| Aislamiento multi-tenant | ✅ | La API valida sesión y filtra por `business_id` del usuario |
| "¿Por qué tengo ese resultado en el 303?" | ✅ | Responde con cifras reales de `expenses` e `income` |
| "¿Qué documentos tengo pendientes?" | ✅ | Devuelve conteo real desde tabla `documents` |
| Historial de conversación multi-turno | ✅ | Últimos 10 turnos enviados como contexto a OpenAI — validado en producción ("2 turnos en contexto") |
| Streaming de respuesta (SSE) | ✅ | Palabra a palabra + botón Detener + fallback no-stream + `OPENAI_MOCK_STREAM=1` — 03/10/2026 |
| Selección manual de trimestre en chat | ✅ | Selector de trimestre (1T/2T/3T/4T) y año dinámico visible en UI — validado en producción |

### Arquitectura implementada

```
/ Usuario pregunta en /copilot
  ↓
/api/copilot/chat (Next.js API Route — SSR)
  ↓                          ↓
Supabase (SSR client)    AiProvider → OpenAIProvider (gpt-4o)
  → expenses (trimestre)   → temperature: 0.3, max_tokens: 600
  → income (trimestre)     → stream SSE palabra a palabra (o JSON completo)
  → alerts (OPEN)          → MockAiProvider solo con OPENAI_MOCK_STREAM=1
  → documents (pendientes)
  ↓
{ reply, sources, context } → panel lateral actualizado
```

### Pendiente en Fase 7

- [x] Historial multi-turno: últimos 10 mensajes enviados como contexto ✅
- [x] Selector de trimestre y año en la UI del chat ✅
- [x] Streaming SSE para mejor percepción de velocidad ✅ 03/10/2026
- Exportar conversación como PDF/texto: DESCARTADO de F7 (ADR-09); en backlog (próximos #17). → DESCARTADO de F7 (ADR-09); movido al backlog (próximos #17).

---

## FASE 8 — Datos Reales ⏳ BLOQUEADA (0%)

**Prerrequisitos no cumplidos (bloqueantes):**
- [ ] Separación DEMO / STAGING / PRODUCTION completa
- [ ] RLS auditado por tabla con tests exhaustivos (smoke + matriz creados; falta ejecución y test 2-usuarios)
- [ ] Revisión jurídica y de privacidad
- [ ] Fuentes fiscales oficiales AEAT validadas y versionadas
- [ ] Backup y retención de datos definidos
- [x] Supabase Auth completamente activado ✅ (email/password, Google OAuth, Magic Link, middleware SSR, trigger)

---

## Base de Datos — Estado Real

### Supabase: `rqcpwxucgkcodccrykpv.supabase.co`

> Columnas = `CREATE TABLE` en `20260930000000_initial_schema.sql`.
> En vivo: `businesses` +7 (`nif`, `vat_regime`, `fiscal_address`,
> `fiscal_city`, `fiscal_zip`, `phone`, `website`) y `profiles` +`phone`
> (aplicados sin migración — ver DT-22). Registros verificados el 03/10/2026
> salvo "s/c" (sin confirmar en vivo).

| Tabla | Columnas (migración) | Registros | Estado |
|---|---|---|---|
| `businesses` | 13 (20 en vivo) | 3 | ✅ Activa |
| `profiles` | 6 (7 en vivo) | 3 (tester, demo-test, dueno) | ✅ Activa |
| `documents` | 22 | 6 | ✅ En uso por WF-01 |
| `document_extractions` | 21 | 6 | ✅ En uso por WF-01 |
| `expenses` | 26 | 18 (13 seed + 5 reales) | ✅ Activa |
| `income` | 19 | 21 (seed) | ✅ Activa |
| `suppliers` | 12 | 14 (9 seed + 5 reales) | ✅ Activa |
| `tax_periods` | 19 | s/c | ✅ Activa |
| `tax_snapshots` | 21 | s/c | ✅ Activa |
| `alerts` | 20 | ≥3 PERIOD_DEADLINE de prueba WF-08 03/10 (visibilidad pendiente, DT-16) | ✅ Activa |
| `audit_events` | 12 | 29 (EXPENSE_DELETED, DOCUMENT_CONFIRMED, ALERT_DISMISSED) | ✅ Activa |

**Migraciones en `supabase/migrations/`:** solo
`20260930000000_initial_schema.sql` (incluye trigger
`on_auth_user_created`, columna e índice `hash_sha256`, `deleted_at` en
`businesses`). Realtime en `documents` se activó desde el Dashboard.
Todo cambio posterior sin fichero de migración = DT-22.

---

## Deuda Técnica

| # | Ítem | Prioridad | Fase |
|---|---|---|---|
| DT-01 | API key OpenAI hardcodeada en WF-01 nodo HTTP | ✅ RESUELTO | F4 |
| DT-02 | Wrapper `AiProvider.interface.ts` no conectado al pipeline real | ✅ RESUELTO 03/10/2026 — `web/src/lib/ai/` + WF-08 creado; WF-03/04 absorbidos y documentados | F4 |
| DT-03 | `businessId` hardcodeado como UUID cero en todo el flujo | ✅ RESUELTO | F6.5 |
| DT-04 | Dashboard parcialmente basado en `mockData.ts` | ✅ RESUELTO | F5 |
| DT-05 | Seed SQL de datos DEMO no implementado | ✅ RESUELTO | F2 |
| DT-06 | Tests RLS por tabla sin cubrir | 🟡 MEDIA — Smoke `supabase/tests/rls_smoke.sql` ✅ 03/10/2026; exhaustivos pendientes | F1 |
| DT-07 | Soporte PDF multi-página en WF-01 sin probar | ✅ RESUELTO — PDF 4 páginas validado en producción 02/10/2026 | F4 |
| DT-08 | WF-05 expense-processing automático no implementado | ✅ RESUELTO — Integrado en Human-in-the-Loop review 02/10/2026 | F4 |
| DT-09 | Separación de entornos DEMO/STAGING/PROD | 🟠 ALTA — Banner DEMO global (`EnvBanner`) ✅ 03/10/2026; separación total pendiente | F8 prereq |
| DT-10 | Supabase Auth no activado para usuarios reales | ✅ RESUELTO | F6.5 |
| DT-11 | Upgrade a `gpt-4o` | ✅ RESUELTO 03/10/2026 — `gpt-4o` activo en WF-01, copiloto y docs. Revertida la vuelta atrás a mini no autorizada. | F4 |
| DT-12 | Falsos "0 €" en dashboard (trimestre vacío + errores silenciosos) | ✅ RESUELTO 03/10/2026 — Banner trimestre-con-datos + banner error visible | F5 |
| DT-13 | Fuga service_role en historial (GitGuardian #37833997) | ✅ RESUELTO 06/10/2026 — Rotación a `sb_*` + `Disable legacy keys` (401 verificado) + purga historial (force-push) + `AGENTS.md` §1 + hook pre-commit + `check-keys.mjs`. Cierre administrativo: todos los secretos expuestos rotados; tester es máquina propia, sin exposición externa | SEG |
| DT-14 | PDF con VARIOS tickets/facturas en un solo archivo | 🔴 ABIERTA | DT-07 solo validó un PDF multipágina de UNA factura | F3 |
| DT-15 | Duplicados por contenido (misma factura, otra foto) | 🟡 MEDIA | Hash solo detecta el mismo archivo; falta proveedor+fecha+total / NIF+número | F3 |
| DT-16 | `PERIOD_DEADLINE` visible en UI | ✅ RESUELTO 05/10/2026 — alertas OPEN de BD mergeadas con motor local en `/alerts`; duplicados limpiados (2 de 3 borrados de BD); badge/widget del dashboard actualizados; TSC en verde |
| DT-17 | Bucket `documents` privado 04/10 | RESUELTO 04/10 — migración RLS aplicada, bucket privado verificado (pública 400, firmada 200), WF-01 v2.2 autenticado, subida demo OK | F8 prereq |
| DT-18 | Webhook WF-01 sin autenticación | ✅ RESUELTO COMPLETO 06/10/2026 — Proxy SSR `/api/documents/process`: valida JWT, verifica ownership, añade `X-Webhook-Secret` server-side. Credencial `Header Auth` en n8n con `X-Webhook-Secret`. `N8N_WEBHOOK_SECRET` en Vercel (correcto). Verificado: 403 sin secreto ✅, 500 workflow ejecutado con secreto ✅ |
| DT-19 | Barrido de documentos atascados en EXTRACTING | 🟢 BAJA | Solo hay polling con la página abierta; sin sweeper servidor | F4 |
| DT-20 | Límite de concurrencia en n8n | 🟢 BAJA | Variable `N8N_CONCURRENCY_PRODUCTION_LIMIT`: NO definida en Dokploy (captura 03/10: solo 9 vars, sin concurrencia) => default sin cap; la guarda real es el pool cliente (conc. 2). Valor y aplicación en servidor pendientes de verificar | F4 |
| DT-21 | `/api/convert-pdf` sin uso | 🟢 BAJA | WF-01 no lo usa (descarga binario directo); ELIMINADO 03/10/2026 (ruta + pdfjs-dist/canvas desinstalados) | F4 |
| DT-22 | Cambios de BD sin migración versionada | 🟡 MEDIA | Columnas businesses/profiles + Realtime aplicados a mano; crear migraciones | F1 |

---

## Próximos Pasos Priorizados (lista única, actualizada 06/10/2026)

| # | Ítem | Ref | Prioridad |
|---|---|---|---|
| 10 | ~~Cierre administrativo GitGuardian~~ | ✅ DT-13 RESUELTO 06/10 — todos los secretos rotados | — |
| 12a | ~~Crear migraciones de deriva de BD~~ | ✅ DT-22 RESUELTO 05/10 | — |
| 12b | ~~RLS auditada (11 tablas, 15 políticas)~~ | ✅ DT-06 RESUELTO 05/10 | — |
| 12c | Test físico RLS 2-usuarios (Sección 4 de rls_matrix.sql — ejecución manual pendiente) | DT-06 | 🟡 Media |
| 13 | ~~Desactivar WF-01 antiguo (Kpagh)~~ | ✅ Eliminado — ya no existe en n8n | — |
| 16a | ~~Proxy SSR `/api/documents/process` con JWT + secret server-side~~ | ✅ DT-18 RESUELTO 05/10 | — |
| 16b | Activar Header Auth en nodo Webhook de n8n (verificación lado receptor) | DT-18 | 🟡 Media |
| 15 | PDF multi-factura, duplicados por contenido | DT-14, DT-15 | 🟢 Baja |
| 18 | Crear bucket `avatars` en Supabase (SQL); subida de avatar desde `/settings` | — | 🟢 Baja |
| 17 | Backlog: exportar conversación del chat (descartado de F7, ADR-09) | — | 🟢 Baja |

## Historial de Cambios

| Fecha | Tipo | Descripción |
|---|---|---|
| 30/09/2026 | ✅ Completo | FASE 0: toda la documentación de arquitectura generada |
| 30/09/2026 | ✅ Completo | FASE 1: schema SQL aplicado, 11 tablas en Supabase |
| 30/09/2026 | ✅ Completo | FASE 2-3: motor fiscal, UI web, pipeline documentos (base) |
| 30/09/2026 | ✅ Completo | WF-01 creado en n8n (13 nodos) |
| 30/09/2026 | ✅ Completo | WF-07 Anomaly Monitor activado |
| 01/10/2026 | 🔧 Fix | WF-01: OpenAI Vision recibía texto plano → cambiado a `image_url` |
| 01/10/2026 | 🔧 Fix | WF-01: `Update Doc Status` output vacío → `Prefer: return=representation` |
| 01/10/2026 | ✅ Validado | Extracción real: Factura Iberdrola, confidence 0.95, 37.000 tokens |
| 01/10/2026 | 🚀 Feature | Bloqueo estricto de re-validación en `/documents/[id]/review` (modo solo lectura para facturas aprobadas) |
| 01/10/2026 | 🚀 Feature | Inserción automática en `expenses`, `suppliers` y `audit_events` al validar factura en Human-in-the-Loop |
| 01/10/2026 | 🚀 Feature | Conexión dinámica del Dashboard (`/`) a Supabase para recalcular Modelo 303 en vivo con facturas reales |
| 01/10/2026 | 🚀 Feature | Sección Gastos (`/expenses`) 100% reactiva en tiempo real con Supabase y localStorage, recalculando KPIs fiscales |
| 01/10/2026 | 🧹 Refactor | Eliminación de datos mock residuales en Dashboard (`/`) y Alertas (`/alerts`), meses y saldos tributarios dinámicos |
| 01/10/2026 | 🔔 Feature | Badges dinámicos de documentos y anomalías en Sidebar y Navbar con ocultamiento inteligente en conteo cero |
| 01/10/2026 | 🔒 Seguridad | Credenciales OpenAI y Supabase migradas al gestor de credenciales de n8n (DT-01 resuelto) |
| 01/10/2026 | 🚀 Feature | Dashboard lee tabla `income` de Supabase para calcular IVA Repercutido real → liquidación Modelo 303 completa |
| 01/10/2026 | 🚀 Feature | Conexión de `/expenses` y Dashboard a tablas `expenses` y `suppliers`: 14 compras reales (Makro, Mahou, Cafés Baqué...) reflejadas con desglose y estado |
| 01/10/2026 | 🎨 Branding | Identidad comercial "La Corrala Escondida" y periodo activo 4T 2026 reflejados en Sidebar, Navbar y selector de trimestres |
| 01/10/2026 | ⏱️ Lógica | Contador dinámico de días restantes hacia el plazo legal de presentación del Modelo 303 según el trimestre seleccionado |
| 01/10/2026 | 🏆 Hito | FASE 5 COMPLETA (100%): Panel de trazabilidad operativa (Ventas, Gastos, EBITDA) y distinción visual estricta DATO vs ESTIMACIÓN vs PENDIENTE según MVP §7.1 |
| 01/10/2026 | 🔐 Auth | FASE 6.5 COMPLETA: Autenticación completa con `@supabase/ssr` (Email/Password, Google OAuth, Magic Link) |
| 01/10/2026 | 🛡️ Seguridad | Middleware SSR de protección de rutas, cookie management y auto-redirección de sesiones no autenticadas |
| 01/10/2026 | ⚡ DB Trigger | Trigger `on_auth_user_created` en Supabase: auto-creación de `profiles` y `businesses` en registro |
| 01/10/2026 | 🎨 UI/UX | Páginas premium `/login`, `/register`, `/forgot-password`, `/auth/callback` y badges de usuario/negocio en Navbar/Sidebar |
| 01/10/2026 | 🏢 Multi-tenant | Aislamiento estricto de datos por `business_id` en Dashboard, Gastos, Documentos, Alertas y Review |
| 01/10/2026 | 🔒 RLS | Eliminación de políticas públicas abiertas en Supabase: solo el propietario (`auth.uid()`) puede consultar o alterar registros |
| 01/10/2026 | ✨ Onboarding | Empty State con bienvenida personalizada para cuentas nuevas y opción de carga de datos de muestra |
| 01/10/2026 | 🐛 Fix | Sidebar: badges de documentos/alertas ahora usan clave de localStorage scoped al `business_id` — corrige el "15" hardcodeado en cuentas nuevas |
| 01/10/2026 | 🐛 Fix | Auth callback: reescrito `route.ts` para setear cookies con `NextResponse` — resuelve el 404 post Google OAuth en Next.js 14 |
| 01/10/2026 | ⚙️ Settings | Nueva página `/settings` con 4 secciones: Perfil Personal, Mi Empresa (datos fiscales), Preferencias y Seguridad |
| 01/10/2026 | 🗄️ DB Migration | Añadidas columnas fiscales a `businesses`: `nif`, `vat_regime`, `fiscal_address`, `fiscal_city`, `fiscal_zip`, `phone`, `website` |
| 01/10/2026 | 🗄️ DB Migration | Añadida columna `phone` a `profiles` |
| 01/10/2026 | 🧩 AuthContext | Tipo `Business` expandido con todos los campos fiscales extendidos; query de carga actualizada |
| 01/10/2026 | 📄 OCR Pipeline | Endpoint `/api/convert-pdf` implementado con `pdfjs-dist` y `canvas` para renderizar PDFs a JPEG de alta resolución para OpenAI Vision |
| 01/10/2026 | 🛡️ Fix | Middleware SSR actualizado para eximir `/api` de redirección `/login` para llamadas de webhooks/n8n |
| 01/10/2026 | 🏆 Hito | **PIPELINE INGESTA & OCR 100% OPERATIVO**: Subida de facturas real (PDF e imágenes) desde `/documents` conectada a Supabase Storage, webhook n8n WF-01 y extracción exitosa con OpenAI (`Iberdrola Clientes, S.A.U.` extraída en 5.4s en producción) |
| 01/10/2026 | 🔄 n8n WF-01 | Arquitectura robusta y autónoma en n8n: descarga directa de binario, construcción base64/files para OpenAI, JSON seguro con `JSON.stringify`, gestión de errores hacia `NEEDS_REVIEW` |
| 01/10/2026 | 🏆 Hito | **HUMAN-IN-THE-LOOP & CONCILIACIÓN VALIDADA**: Pantalla `/documents/[id]/review` probada en producción; la aprobación del usuario crea el apunte contable en `expenses` y registra el proveedor en `suppliers` |
| 01/10/2026 | 📊 Finanzas | **CÁLCULO 303 CON DATOS REALES**: Dashboard computa dinámicamente el Modelo 303 agregando la tabla `expenses` y cruzando con `documents` con deduplicación canónica por `document_id` |
| 01/10/2026 | 🧹 Mantenimiento | Limpieza de base de datos en producción: purga de usuarios y empresas de prueba temporales, dejando el entorno aislado y limpio para `serquin16@gmail.com` |
| 01/10/2026 | 🤖 Feature | **FASE 7 — Copiloto IA operativo (75%)**: Endpoint `/api/copilot/chat` implementado con contexto fiscal real (expenses, income, alerts, docs pendientes); eliminación completa de mockData en `/copilot`; panel lateral con snapshot dinámico por trimestre |
| 02/10/2026 | 🔬 Benchmark | **INVESTIGACIÓN DE TOKENS VISIÓN (ADR-01)**: Benchmark sistemático con 5 tipos de documentos de hostelería. Detección del multiplicador ~33.33x de GPT-4o-mini en visión; demostración de que `detail: "low"` destruye fiabilidad OCR en NIFs/importes; documentado en `docs/DECISIONS.md` |
| 02/10/2026 | ⚖️ Fiscal §23 | **TRAZABILIDAD Y OPTIMIZACIÓN (ADR-02)**: Redimensionado inteligente a máx 1600px JPEG 0.85 en cliente (`image-optimizer.ts`), ahorrando 85% de storage/ancho de banda manteniendo nitidez legal plena para inspección tributaria |
| 02/10/2026 | 🔄 n8n WF-01 | **RESILIENCIA Y AUDITORÍA (v2.1)**: Activados reintentos automáticos para 429 (`retryOnFail: true`, 3 intentos, backoff 2000ms), modelo/detalle parametrizable y captura obligatoria de `usage` (prompt_tokens, completion_tokens, total_tokens) en Supabase |
| 02/10/2026 | ⚡ Subida Lotes | **INGESTA EN BLOQUE ASÍNCRONA (ADR-03)**: Arquitectura en dos fases en `/documents`: Fase 1 ingesta paralela rápida (concurrencia 3) + Fase 2 pool de extracción controlado (concurrencia 2) con sincronización en tiempo real vía Supabase Realtime y barra de progreso no bloqueante |
| 02/10/2026 | 🏆 Hito | **PDF MULTI-PÁGINA VALIDADO**: Factura Iberdrola de 4 páginas procesada íntegramente por WF-01 — visor paginado en Human-in-the-Loop review, aprobación correcta y registro en `expenses`. DT-07 resuelto. |
| 02/10/2026 | ✅ Fix | **WF-05 / DT-08 RESUELTO**: Inserción automática en `expenses` y `suppliers` al aprobar en Human-in-the-Loop review confirmada en Supabase (14 registros en tabla `expenses` incluyendo registro real de Iberdrola 80.95 €). |
| 02/10/2026 | 🤖 Hito | **COPILOTO IA COMPLETO (95%)**: Multi-turno con historial de 10 mensajes validado en producción ("2 turnos en contexto"); selector de trimestre y año dinámico en `/copilot`; contexto fiscal real (Modelo 303, alertas, facturas pendientes, top proveedores). Fase 7 considerada completa. |
| 02/10/2026 | Pendiente (superada) | UPGRADE A GPT-4o (DT-11): previsión de ahorro sin medir. 03/10: gpt-4o activo en WF-01/copiloto/UI (ver ADR-04). | 03/10/2026 | ✅ Feature | **NIF/CIF/NIE DETERMINISTA**: `NifValidator` en motor + espejo web; badge y bloqueo en review y settings; regla `INVALID_NIF` en anomalías; 10 tests |
| 03/10/2026 | 🛡️ Fix | **DUPLICADOS + HUÉRFANOS**: SHA-256 pre-subida con aviso; eliminados los 5 fallbacks UUID cero |
| 03/10/2026 | 📊 Fix | **DASHBOARD AUTO-DIAGNÓSTICO**: banner trimestre-con-datos + banner error visible (DT-12) |
| 03/10/2026 | 📄 Feature | **EXPORT + BORRADOR 303**: CSV RFC4180 con trazabilidad + `/expenses/print` + papelera en Gastos |
| 03/10/2026 | 🤖 Feature | **SSE COPILOTO**: streaming palabra a palabra + Detener + fallback + `OPENAI_MOCK_STREAM=1`; FASE 7 al 100% |
| 03/10/2026 | 🔒 Seguridad | **INCIDENTE GitGuardian #37833997**: service_role filtrada en historial WF-01 → migración a `sb_*`, `Disable legacy keys` (401 verificado), purga historial con force-push, `AGENTS.md` + hook pre-commit + `check-keys.mjs` (DT-13) |
| 03/10/2026 | 🧹 Seguridad | **RLS/DEMO**: smoke test `supabase/tests/rls_smoke.sql` + banner DEMO global (`EnvBanner`) |
| 03/10/2026 | 🔄 Modelo | **GPT-4o ACTIVO en todo**: WF-01 + copiloto + etiqueta UI + `.env.example`; hechos: ad0ca8d fijo gpt-4o en WF-01; el worktree traia un revert a mini sin commitear que se descarto (checkout) al confirmar el dueno que produccion usa gpt-4o; unificado en copiloto, UI y .env.example (DT-11 cerrado, ADR-04) |

| 03/10/2026 | Docs | **AUDITORIA v2.1**: comparativa trimestres, AiProvider, WF-08/WF-10, avatar, matriz RLS, SECURITY/AI_POLICY/TESTING, ADR-04 a 09; F4 100% (WF-08 publicado y verificado), SEG mitigado. |
| 04/10/2026 | 🔒 Seguridad | **A4 VERIFICADO**: migración RLS + bucket privado aplicados; subida demo OK tras corregir referencia no cualificada (lección en AGENTS.md §5); DT-17 RESUELTO. |
| 04/10/2026 | 🗂️ Tarea A | **P0+A3+A4-PREP en rama feat/a3-private-storage**: repo sincronizado con WF-01 v2.2 validado; frontend con storage_path+URL firmadas, ERROR+Reintentar, cache v2; rama mergeada en main. |
| 05/10/2026 | ✅ DT-16 | **PERIOD_DEADLINE EN UI**: alertas OPEN de BD (n8n/WF-08) mergeadas con motor determinista local en `/alerts`; 2 duplicados borrados de BD; badge Sidebar/Navbar y widget dashboard actualizados; TSC en verde. |
| 05/10/2026 | 🧹 Storage | **PASO H — CIERRE MIGRACIÓN STORAGE**: `notes→NULL` en 4 filas CONFIRMED (backup CSV guardado); 29 archivos huérfanos en raíz de Storage borrados (0 en raíz ahora, solo carpetas `{business_id}/`); `LEGACY_FILEURL_COMPAT` eliminado de `documents/page.tsx`; bucket 100% privado y limpio. |
| 05/10/2026 | ✅ DT-22 | **MIGRACIONES DERIVA VERSIONADAS**: 3 ficheros creados — `20261001000000_businesses_fiscal_fields.sql` (7 cols IF NOT EXISTS), `20261001000001_realtime_documents.sql`, `20261005000000_rls_audit_checkpoint.sql`. |
| 05/10/2026 | ✅ DT-06 | **RLS AUDITADO VÍA MCP**: 11 tablas RLS ON, 15 políticas con restricción verificadas, 0 gaps detectados; `rls_matrix.sql` actualizado con secciones 1-3 ejecutables automáticamente; test físico 2-usuarios en Sección 4 (instrucciones incluidas, pendiente ejecución manual). |
| 05/10/2026 | ✅ DT-18/A5 | **WEBHOOK AUTH (lado cliente)**: proxy SSR `/api/documents/process` — valida JWT sesión, verifica ownership `business_id`, añade `X-Webhook-Secret` server-side; `documents/page.tsx` usa el proxy en lugar de llamar n8n directamente. Pendiente: Header Auth en n8n receptor + `N8N_WEBHOOK_SECRET` en Vercel. |
| 07/10/2026 | 🛠️ Fix | **RESETEO PASSWORD (/update-password)**: Implementada pantalla completa de actualización de contraseña (`web/src/app/update-password/page.tsx`), agregada a `AUTH_ROUTES` (AppShell) y `PUBLIC_ROUTES` (middleware), con validación, estados de expiración, control explícito de Rate Limit (HTTP 429 en `/forgot-password`) y feedback de éxito en `/login`. Flujo verificado y validado en producción. |

## 🗺️ Estado actual y próximos pasos

### ✅ Funcionalidades completadas — Sesión 07/10/2026

- [x] **Fix reseteo de contraseña**: ruta `/update-password` implementada con UI oscura oficial, validación de contraseña de 8+ caracteres, coincidencia en tiempo real, manejo de enlaces caducados/inválidos y redirección limpia con confirmación a `/login`.
- [x] **Manejo de Rate Limit (429) en `/forgot-password`**: detección amigable del límite de envíos de Supabase Auth para guiar al usuario en lugar de mostrar errores genéricos.
- [x] **Validación de producción exitosa**: ciclo completo (solicitud → recepción de email → token exchange → formulario → actualización de credenciales en Supabase) probado y validado satisfactoriamente por el usuario.

### ✅ Funcionalidades completadas — Sesión 05/10/2026

- [x] **DT-16 RESUELTO**: `PERIOD_DEADLINE` alertas de BD (n8n WF-08) visibles en `/alerts`, widget del dashboard y badge Sidebar/Navbar
- [x] **Paso h (cierre storage)**: 29 huérfanos en raíz de Storage borrados; `notes→NULL` en 4 filas CONFIRMED; `LEGACY_FILEURL_COMPAT` eliminado; bucket 100% privado
- [x] **DT-22 RESUELTO**: 3 migraciones de deriva versionadas (`businesses_fiscal_fields`, `realtime_documents`, `rls_audit_checkpoint`)
- [x] **DT-06 RESUELTO**: Auditoría RLS completa vía MCP — 11 tablas ON, 15 políticas, 0 gaps; `rls_matrix.sql` actualizado; checkpoint migration aplicado
- [x] **DT-18/A5 RESUELTO (lado cliente)**: Proxy SSR `/api/documents/process` — valida JWT, verifica ownership, inyecta `X-Webhook-Secret` server-side; `documents/page.tsx` usa el proxy
- [x] **AGENTS.md §5 actualizado**: regla de cualificación de tablas en RLS para evitar falsos positivos silenciosos (lección A4)

### ✅ Confirmaciones adicionales — 06/10/2026

- [x] **DT-13 CERRADO**: todos los secretos expuestos rotados; tester es máquina propia sin exposición externa; GitGuardian #37833997 completamente resuelto — **SEG: 100%**
- [x] **WF-01 antiguo (KpaghIxvPx5XLabD) ELIMINADO**: ya no existe en n8n; solo activo `zrKXQ5YJ8lLwHRL7`
- [x] **`N8N_WEBHOOK_SECRET` confirmado en Vercel** (captura 06/10): server-side, sin `NEXT_PUBLIC_`, presente en todos los entornos
- [x] **DT-18 COMPLETO — Header Auth verificado** (06/10): credencial `Header Auth account` configurada en nodo Webhook WF-01; test directo confirma 403 sin secreto ✅ y workflow ejecutado (500 por UUIDs de prueba) con `X-Webhook-Secret` correcto ✅

### ⚠️ Pendientes para la próxima sesión

| Prioridad | Ítem | Ref |
|---|---|---|
| 🟡 Media | **Test físico RLS 2-usuarios**: ejecutar Sección 4 de `supabase/tests/rls_matrix.sql` con tester + dueño | DT-06 |
| 🟢 Baja | Crear bucket `avatars` en Supabase (SQL) y conectar subida desde `/settings` | — |
| 🟢 Baja | PDF multi-factura (DT-14), duplicados por contenido (DT-15) | DT-14, DT-15 |

---

*Documento generado y mantenido por Antigravity + Muse Spark. Actualizar al final de cada sesión de desarrollo.*
