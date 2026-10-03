# PROJECT STATUS — COPILOTO FISCAL

> **Versión:** 2.0
> **Última actualización:** 03 Octubre 2026
> **Estado global:** FASES 0 a 7 completadas (F7 al 100% con streaming) — FASE 4 (n8n + Pipeline IA) EN PROGRESO (85%) — Incidente de seguridad GitGuardian #37833997 RESUELTO
> **Autor:** Antigravity + Muse Spark (actualización continua)
> **Fuente de verdad:** [COPILOTO_FISCAL_MASTER_PLAN.md](../COPILOTO_FISCAL_MASTER_PLAN.md)

---

## Resumen Ejecutivo

| Fase | Nombre | Estado | Completitud |
|------|--------|--------|-------------|
| **FASE 0** | Descubrimiento y planificación | ✅ COMPLETA | 100% |
| **FASE 1** | Infraestructura | ✅ COMPLETA | 100% |
| **FASE 2** | Núcleo financiero | ✅ COMPLETA | 100% |
| **FASE 3** | Documentos & Review | ✅ COMPLETA | 100% |
| **FASE 4** | n8n + Pipeline IA | 🔄 EN PROGRESO | 85% |
| **FASE 5** | Dashboard & Visualización | ✅ COMPLETA | 100% |
| **FASE 6** | Anomalías & Inspección AEAT | ✅ COMPLETA | 100% |
| **FASE 7** | Copiloto IA (Chat Tributario) | ✅ COMPLETA | 100% |
| **FASE 8** | Validación y Cierre | ⏳ BLOQUEADA | 0% |
| **SEG** | Seguridad post-incidente GitGuardian | ✅ RESUELTA | 100% |

---

## FASE 0 — Descubrimiento y Planificación ✅ COMPLETA

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

## FASE 1 — Infraestructura ✅ COMPLETA

**Objetivo:** Proyecto inicializado, Supabase provisionado, Storage, Auth y RLS activos.

| Elemento | Estado | Detalle |
|---|---|---|
| Repositorio Git + `.gitignore` | ✅ | Secrets excluidos, `.env.example` documentado |
| Proyecto Supabase (prod) | ✅ | `rqcpwxucgkcodccrykpv.supabase.co` |
| Schema de base de datos | ✅ | Migración `20260930000000_initial_schema.sql` aplicada |
| Storage bucket `documents` | ✅ | Bucket público; URLs accesibles directamente por OpenAI Vision |
| 11 tablas creadas | ✅ | Ver sección [Base de Datos](#base-de-datos) |
| `.env` y `.env.example` | ✅ | Variables documentadas, valores fuera de Git |
| Next.js 14 App Router | ✅ | Proyecto en `/web`, desplegado en Vercel |
| n8n self-hosted | ✅ | `https://n8n.cheosdesign.info` operativo |
| Supabase Auth | ⚠️ | Configurado pero flujo de login real pendiente de activar |
| RLS en tablas | ⚠️ | Definido en migración; test exhaustivo pendiente |

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

## FASE 3 — Documentos ✅ COMPLETA (90%)

**Objetivo:** Upload de documentos, Storage, extracción, revisión Human-in-the-Loop y confirmación.

| Elemento | Estado | Detalle |
|---|---|---|
| Página `/documents` | ✅ | Upload drag & drop, lista de documentos |
| Upload a Supabase Storage | ✅ | Bucket `documents`, URL pública generada |
| Insert en tabla `documents` | ✅ | Registro provisional creado en upload |
| Tabla `documents` | ✅ | Estados: `UPLOADING→EXTRACTING→EXTRACTED→NEEDS_REVIEW→APPROVED` |
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

## FASE 4 — n8n + IA 🔄 EN PROGRESO (85%)

**Objetivo:** Workflows n8n operativos, OCR real con OpenAI Vision, clasificación y auditoría.

### Workflows en n8n

| ID n8n | Nombre | Estado | Nodos |
|---|---|---|---|
| `KpaghIxvPx5XLabD` | WF-01: Document Intake & Extraction Pipeline | ✅ OPERATIVO | 8 |
| `upm1rKUB4hJXvuvS` | WF-07: Anomaly & Deadline Monitor | ✅ ACTIVO | 4 |
| — | WF-02: document-extraction independiente | ⏳ Absorbido por WF-01 | — |
| — | WF-03: document-validation | ⏳ Pendiente | — |
| — | WF-04: document-classification | ⏳ Pendiente | — |
| — | WF-05: expense-processing | ✅ Integrado en Human-in-the-Loop review | — |
| — | WF-06: tax-snapshot trigger | ✅ Dashboard recalcula en tiempo real tras aprobación | — |
| — | WF-08: notifications | ⏳ Pendiente | — |
| — | WF-09: demo-seed | ⏳ Pendiente | — |

### WF-01 — Flujo de nodos ✅

```
Webhook: Document Intake (POST /webhook/copilot-document-intake)
  ↓
Validate & Normalize Input
  ↓
  ↓
Supabase: Set EXTRACTING
  ↓
Is PDF? (Switch de formato binario vs imagen)
  ├── [Sí]: Download PDF → Base64 File Payload (OpenAI files endpoint)
  └── [No]: Image URL Payload (Detail: 'high', optimizado a 1600px en cliente)
  ↓
Build OpenAI Request (Modelo y detalle configurables dinámicamente)
  ↓
OpenAI: Extract Invoice Data
  → GPT-4o Vision (activo en WF-01, copiloto y `.env.example` desde 03/10/2026)
  → Retry on fail: 3 intentos, backoff 2000ms (resiliencia ante 429)  [FIX 02/10/2026]
  → Credencial n8n: CopilotoFiscal (sin claves en raw)  [MIGRADO 01/10/2026]
  ↓
Process & Validate Output
  → Calcula status: EXTRACTED | NEEDS_REVIEW
  → Registra usage: prompt_tokens, completion_tokens, total_tokens  [NUEVO 02/10/2026]
  → Genera warnings si supplier o total faltan
  ↓
Supabase: Save Extraction (POST /document_extractions)
  → Guarda model, raw_payload con usage y campos fiscales estructurados
  ↓
Supabase: Update Doc Status (PATCH /documents?id=eq.{id})
  → Prefer: return=representation
  ↓
Respond to Webhook (JSON con extracted + status + confidence + usage + model)
  ↓ (Rama de error en descarga / extracción)
Supabase: Mark Needs Review → Respond Error (HTTP 500)
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
- [ ] Wrapper `AiProvider.interface.ts` conectado al pipeline n8n (DT-02 — baja prioridad)
- [x] **Modelo `gpt-4o` activo** — WF-01 (nodo `Build OpenAI Request`), copiloto (`/api/copilot/chat`) y etiqueta UI en `gpt-4o` desde 03/10/2026 ✅

---

## FASE 5 — Dashboard & Gestión Financiera 🔄 EN PROGRESO (90%)

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
| Papelera en Gastos | ✅ | Borrado con cascada + `audit_events EXPENSE_DELETED` — 03/10/2026 |
| Comparativa periodo anterior | ⏳ | Pendiente |
| Responsive / mobile-first | ✅ | Adaptado en grid y barras laterales |

---

## FASE 6 — Anomalías & Criterios Inspección AEAT ✅ COMPLETA (100%)

**Objetivo:** Motor determinista de detección de riesgos fiscales e inconsistencias AEAT en tiempo real, trazabilidad de resolución, impacto económico y alertas auditables.

| Elemento | Estado | Detalle |
|---|---|---|
| Motor `anomalyEngine.ts` | ✅ | 8 reglas deterministas ejecutadas en cliente y sincronizadas con BD |
| Regla `HIGH_AMOUNT` | ✅ | Detecta importes individuales > 1.500 € (umbral estricto de inspección AEAT) |
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

## FASE 7 — Copiloto IA ✅ COMPLETA (95%)

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
Usuario pregunta en /copilot
  ↓
/api/copilot/chat (Next.js API Route — SSR)
  ↓                          ↓
Supabase (SSR client)    OpenAI GPT-4o
  → expenses (trimestre)   → system prompt con
  → income (trimestre)       cifras reales
  → alerts (OPEN)          → temperature: 0.3
  → documents (pendientes) → max_tokens: 600
  ↓
{ reply, sources, context } → panel lateral actualizado
```

### Pendiente en Fase 7

- [x] Historial multi-turno: últimos 10 mensajes enviados como contexto ✅
- [x] Selector de trimestre y año en la UI del chat ✅
- [x] Streaming SSE para mejor percepción de velocidad ✅ 03/10/2026
- [ ] Exportar conversación como PDF/texto

---

## FASE 8 — Datos Reales ⏳ BLOQUEADA

**Prerrequisitos no cumplidos (bloqueantes):**
- [ ] Separación DEMO / STAGING / PRODUCTION completa
- [ ] RLS auditado por tabla con tests
- [ ] Revisión jurídica y de privacidad
- [ ] Fuentes fiscales oficiales AEAT validadas y versionadas
- [ ] Backup y retención de datos definidos
- [ ] Supabase Auth completamente activado

---

## Base de Datos — Estado Real

### Supabase: `rqcpwxucgkcodccrykpv.supabase.co`

| Tabla | Columnas | Registros | Estado |
|---|---|---|---|
| `businesses` | 13 | 3 (demo UUID cero + 2 reales) | ✅ Activa |
| `profiles` | 6 | — | ✅ Activa |
| `documents` | 16 | 6 | ✅ En uso por WF-01 |
| `document_extractions` | 21 | 6 | ✅ En uso por WF-01 |
| `expenses` | 22 | 18 (13 seed + 5 reales) | ✅ Activa |
| `income` | 19 | 21 (seed) | ✅ Activa |
| `suppliers` | 12 | 14 (9 seed + 5 reales) | ✅ Activa |
| `tax_periods` | 13 | — | ✅ Activa |
| `tax_snapshots` | 19 | — | ✅ Activa |
| `alerts` | 16 | — | ✅ Activa |
| `audit_events` | 12 | — | ✅ Activa |

**Migración aplicada:** `20260930000000_initial_schema.sql`

---

## Deuda Técnica

| # | Ítem | Prioridad | Fase |
|---|---|---|---|
| DT-01 | API key OpenAI hardcodeada en WF-01 nodo HTTP | ✅ RESUELTO | F4 |
| DT-02 | Wrapper `AiProvider.interface.ts` no conectado al pipeline real | 🟠 BAJA | F4 |
| DT-03 | `businessId` hardcodeado como UUID cero en todo el flujo | ✅ RESUELTO | F6.5 |
| DT-04 | Dashboard parcialmente basado en `mockData.ts` | ✅ RESUELTO | F5 |
| DT-05 | Seed SQL de datos DEMO no implementado | ✅ RESUELTO | F2 |
| DT-06 | Tests RLS por tabla sin cubrir | 🟡 MEDIA — Smoke `supabase/tests/rls_smoke.sql` ✅ 03/10/2026; exhaustivos pendientes | F1 |
| DT-07 | Soporte PDF multi-página en WF-01 sin probar | ✅ RESUELTO — PDF 4 páginas validado en producción 02/10/2026 | F4 |
| DT-08 | WF-05 expense-processing automático no implementado | ✅ RESUELTO — Integrado en Human-in-the-Loop review 02/10/2026 | F4 |
| DT-09 | Separación de entornos DEMO/STAGING/PROD | 🟠 BAJA — Banner DEMO global (`EnvBanner`) ✅ 03/10/2026; separación total pendiente | F8 prereq |
| DT-10 | Supabase Auth no activado para usuarios reales | ✅ RESUELTO | F6.5 |
| DT-11 | Upgrade a `gpt-4o` | ✅ RESUELTO 03/10/2026 — `gpt-4o` activo en WF-01, copiloto y docs. Revertida la vuelta atrás a mini no autorizada. | F4 |
| DT-12 | Falsos "0 €" en dashboard (trimestre vacío + errores silenciosos) | ✅ RESUELTO 03/10/2026 — Banner trimestre-con-datos + banner error visible | F5 |
| DT-13 | Fuga service_role en historial (GitGuardian #37833997) | ✅ RESUELTO 03/10/2026 — Rotación a `sb_*` + `Disable legacy keys` + purga historial (force-push) + `AGENTS.md` + hook pre-commit | SEG |

---

## Próximos Pasos Priorizados

### 🔴 Urgente
1. ~~Probar WF-01 con facturas en formato PDF~~ ✅ Resuelto
2. ~~Implementar WF-05~~ ✅ Resuelto
3. ~~Upgrade a `gpt-4o`~~ ✅ Resuelto 03/10/2026 — activo en WF-01, copiloto y UI

### 🟡 Esta semana
4. ~~Streaming SSE en Copiloto~~ ✅ Resuelto 03/10/2026
5. ~~Validación NIF/CIF/NIE~~ ✅ Resuelto 03/10/2026

### 🟠 Próximas 2 semanas
6. ~~Exportación CSV/PDF~~ ✅ Resuelto 03/10/2026
7. Tests RLS por tabla exhaustivos (DT-06, smoke ya existe)
8. Wrapper `AiProvider` para desacoplar de OpenAI (DT-02, baja prioridad)
9. Comparativa periodo anterior (último hueco MVP §7.1)
10. Cierre GitGuardian: marcar incidente como revocado + purga caché GitHub + re-clonado del tester

---

## Historial de Cambios

| Fecha | Tipo | Descripción |
|---|---|---|
| 30/09/2026 | ✅ Completo | FASE 0: toda la documentación de arquitectura generada |
| 30/09/2026 | ✅ Completo | FASE 1: schema SQL aplicado, 11 tablas en Supabase |
| 30/09/2026 | ✅ Completo | FASE 2-3: motor fiscal, UI web, pipeline documentos (base) |
| 30/09/2026 | ✅ Completo | WF-01 creado en n8n (8 nodos) |
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
| 02/10/2026 | 💡 Pendiente | **UPGRADE A GPT-4o (DT-11)**: Cuenta OpenAI con $3.85 de saldo (Pay As You Go). Requiere verificar tier 1 en `platform.openai.com` para acceder a `gpt-4o` — reduce tokens/imagen de 37.000 a ~1.000 (97% menos TPM). |
| 03/10/2026 | ✅ Feature | **NIF/CIF/NIE DETERMINISTA**: `NifValidator` en motor + espejo web; badge y bloqueo en review y settings; regla `INVALID_NIF` en anomalías; 10 tests |
| 03/10/2026 | 🛡️ Fix | **DUPLICADOS + HUÉRFANOS**: SHA-256 pre-subida con aviso; eliminados los 5 fallbacks UUID cero |
| 03/10/2026 | 📊 Fix | **DASHBOARD AUTO-DIAGNÓSTICO**: banner trimestre-con-datos + banner error visible (DT-12) |
| 03/10/2026 | 📄 Feature | **EXPORT + BORRADOR 303**: CSV RFC4180 con trazabilidad + `/expenses/print` + papelera en Gastos |
| 03/10/2026 | 🤖 Feature | **SSE COPILOTO**: streaming palabra a palabra + Detener + fallback + `OPENAI_MOCK_STREAM=1`; FASE 7 al 100% |
| 03/10/2026 | 🔒 Seguridad | **INCIDENTE GitGuardian #37833997**: service_role filtrada en historial WF-01 → migración a `sb_*`, `Disable legacy keys` (401 verificado), purga historial con force-push, `AGENTS.md` + hook pre-commit + `check-keys.mjs` (DT-13) |
| 03/10/2026 | 🧹 Seguridad | **RLS/DEMO**: smoke test `supabase/tests/rls_smoke.sql` + banner DEMO global (`EnvBanner`) |
| 03/10/2026 | 🔄 Modelo | **GPT-4o ACTIVO en todo**: WF-01 + copiloto + etiqueta UI + `.env.example`; revertida vuelta a mini no autorizada (DT-11 cerrado) |

---

## 🗺️ Estado actual y próximos pasos

### ✅ Funcionalidades completadas (sesión actual)
- [x] Google OAuth funcional en producción (`corrala.vercel.app`)
- [x] Aislamiento multi-tenant completo (datos por `business_id`)
- [x] Badges del sidebar scoped al negocio activo
- [x] Página `/settings` con perfil, empresa fiscal y seguridad
- [x] **Subida de facturas real y extracción OCR end-to-end** (Supabase Storage + n8n WF-01 + OpenAI)
- [x] Soporte nativo para PDFs e imágenes con fallback a `NEEDS_REVIEW` en fallos
- [x] **PDF multi-página** (4 páginas Iberdrola) procesado, revisado y aprobado correctamente en producción ✅
- [x] Persistencia y actualización en vivo en `/documents` con botón de revisión
- [x] **Human-in-the-Loop Review (`/documents/[id]/review`)**: Conciliación real con inserción en `expenses` y `suppliers` — validado con 14 registros en Supabase ✅
- [x] **Cálculo dinámico del Modelo 303**: Dashboard recalcula automáticamente tras cada aprobación de factura ✅
- [x] **Deduplicación canónica**: Eliminación de doble cómputo entre documentos locales e historial de gastos
- [x] **Copiloto Fiscal IA completo (Fase 7 — 95%)**:
  - Autenticación robusta serverless con JWT Bearer token validado contra Supabase Auth
  - Mapeo fiel al esquema de base de datos (`businesses.owner_id`, `expenses.date`, `validation_status`, `document_extractions.extracted_at`)
  - Historial multi-turno (últimos 10 mensajes) validado en producción — "2 turnos en contexto" ✅
  - Selector de trimestre y año dinámico en `/copilot` ✅
  - Inyección de contexto fiscal en tiempo real (Modelo 303, alertas, facturas recientes y top proveedores)
- [x] **Sesión 03/10/2026 (Muse Spark)**: NIF determinista + dedup SHA-256 + fin UUID cero + dashboard auto-diagnóstico + CSV/borrador 303 + papelera Gastos + SSE copiloto (F7→100%) + smoke RLS + banner DEMO + migración `sb_*` + purga GitGuardian (ver Historial) ✅

### 🚀 Próximos pasos sugeridos
| Prioridad | Feature | Descripción |
|-----------|---------|-------------|
| 🟡 Media | **Comparativa periodo anterior** | Último hueco de F5/MVP §7.1 |
| 🟡 Media | **Tests RLS exhaustivos** | Por tabla (el smoke ya existe) |
| 🟢 Baja | **Wrapper `AiProvider`** | Desacoplar de OpenAI (DT-02) |
| 🟢 Baja | **Avatar personalizable** | Subida de avatar a Storage desde `/settings` |

---

*Documento generado y mantenido por Antigravity + Muse Spark. Actualizar al final de cada sesión de desarrollo.*

