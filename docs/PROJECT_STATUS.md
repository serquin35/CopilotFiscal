# PROJECT STATUS — COPILOTO FISCAL

> **Versión:** 1.2
> **Última actualización:** 01 Octubre 2026
> **Estado global:** FASE 4 — En progreso activo
> **Autor:** Antigravity (actualización continua)
> **Fuente de verdad:** [COPILOTO_FISCAL_MASTER_PLAN.md](../COPILOTO_FISCAL_MASTER_PLAN.md)

---

## Resumen Ejecutivo

| Fase | Nombre | Estado | Completitud |
|------|--------|--------|-------------|
| **FASE 0** | Descubrimiento y planificación | ✅ COMPLETA | 100% |
| **FASE 1** | Infraestructura | ✅ COMPLETA | 100% |
| **FASE 2** | Núcleo financiero | ✅ COMPLETA | 95% |
| **FASE 3** | Documentos | ✅ COMPLETA | 90% |
| **FASE 4** | n8n + IA | 🔄 EN PROGRESO | 60% |
| **FASE 5** | Dashboard | 🔄 EN PROGRESO | 70% |
| **FASE 6** | Anomalías | 🔄 EN PROGRESO | 50% |
| **FASE 7** | Copiloto IA | ⏳ PENDIENTE | 20% |
| **FASE 8** | Validación con datos reales | ⏳ PENDIENTE | 0% |

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
- IA: GPT-4o-mini (OpenAI Vision) como proveedor inicial vía HTTP directo
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

## FASE 2 — Núcleo Financiero ✅ COMPLETA (95%)

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
| Seed SQL de datos DEMO | ⏳ | Pendiente — actualmente `mockData.ts` en frontend |

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
| Modo mock/demo | ⚠️ | Extracción mock con mockData; real vía n8n pipeline |

---

## FASE 4 — n8n + IA 🔄 EN PROGRESO (60%)

**Objetivo:** Workflows n8n operativos, OCR real con OpenAI Vision, clasificación y auditoría.

### Workflows en n8n

| ID n8n | Nombre | Estado | Nodos |
|---|---|---|---|
| `KpaghIxvPx5XLabD` | WF-01: Document Intake & Extraction Pipeline | ✅ OPERATIVO | 8 |
| `upm1rKUB4hJXvuvS` | WF-07: Anomaly & Deadline Monitor | ✅ ACTIVO | 4 |
| — | WF-02: document-extraction independiente | ⏳ Absorbido por WF-01 | — |
| — | WF-03: document-validation | ⏳ Pendiente | — |
| — | WF-04: document-classification | ⏳ Pendiente | — |
| — | WF-05: expense-processing | ⏳ Pendiente | — |
| — | WF-06: tax-snapshot trigger | ⏳ Pendiente | — |
| — | WF-08: notifications | ⏳ Pendiente | — |
| — | WF-09: demo-seed | ⏳ Pendiente | — |

### WF-01 — Flujo de nodos ✅

```
Webhook: Document Intake (POST /webhook/copilot-document-intake)
  ↓
Validate & Normalize Input
  ↓
Supabase: Set EXTRACTING
  ↓
OpenAI: Extract Invoice Data
  → GPT-4o-mini Vision
  → Formato: image_url + detail:high  [FIX 01/10/2026]
  → ~37.000 prompt_tokens por factura imagen
  ↓
Process & Validate Output
  → Calcula status: EXTRACTED | NEEDS_REVIEW
  → Genera warnings si supplier o total faltan
  ↓
Supabase: Save Extraction (POST /document_extractions)
  → Prefer: return=representation
  ↓
Supabase: Update Doc Status (PATCH /documents?id=eq.{id})
  → Prefer: return=representation  [FIX 01/10/2026]
  ↓
Respond to Webhook (JSON con extracted + status + confidence)
```

**Fixes aplicados el 01/10/2026:**
1. **OpenAI Vision no veía la imagen**: `content` era texto plano → cambiado a array `[text, image_url]`
2. **Output vacío en `Update Doc Status`**: añadido `Prefer: return=representation`

**Prueba exitosa — Factura Iberdrola (01/10/2026):**
- `supplier_name`: IBERDROLA CLIENTES, S.A.U. ✅
- `supplier_nif`: A-95758389 ✅
- `invoice_number`: 21180613010076890 ✅
- `total_amount`: 80,95 € / `vat_rate`: 21% / `base_amount`: 66,02 € ✅
- `confidence`: 0.95 / `category`: suministros ✅

### Pendiente en Fase 4

- [ ] **[URGENTE]** Migrar API key OpenAI al gestor de credenciales de n8n
- [ ] WF-05: expense-processing automático tras aprobación human-in-the-loop
- [ ] WF-06: trigger de recálculo de tax-snapshot
- [ ] Soporte robusto para PDFs multi-página
- [ ] Wrapper `AiProvider.interface.ts` conectado al pipeline n8n

> [!WARNING]
> La API key de OpenAI está hardcodeada en el nodo HTTP de WF-01. Debe migrarse al gestor de credenciales de n8n antes de cualquier exposición pública del proyecto.

---

## FASE 5 — Dashboard 🔄 EN PROGRESO (70%)

| Elemento | Estado | Detalle |
|---|---|---|
| Página principal (`/`) | ✅ | Dashboard con KPIs principales |
| Métricas ingresos/gastos | ✅ | Calculadas (parcialmente mock) |
| IVA repercutido/soportado estimativo | ✅ | Visible con motor determinista |
| Saldo fiscal estimado | ✅ | Calculado |
| Documentos pendientes | ✅ | Contador en tiempo real |
| Alertas activas | ✅ | Listado con severidad |
| Sidebar de navegación | ✅ | Dashboard, Documentos, Gastos, Anomalías, Copiloto IA |
| Datos reales desde Supabase | ⚠️ | Parcialmente; dashboard aún depende de mockData |
| Comparativa periodo anterior | ⏳ | Pendiente |
| Separación visual DATO/ESTIMACIÓN/PENDIENTE | ⏳ | Definido en spec, pendiente implementar |
| Responsive / mobile-first | ⚠️ | Base presente, refinamiento pendiente |

---

## FASE 6 — Anomalías 🔄 EN PROGRESO (50%)

| Elemento | Estado | Detalle |
|---|---|---|
| Motor `AnomalyDetector.ts` | ✅ | Base implementada en `src/engine/fiscal/anomaly/` |
| Regla `DuplicateDocumentRule.ts` | ✅ | Detecta facturas duplicadas |
| Regla `UnreviewedExpenseRule.ts` | ✅ | Gastos pendientes de revisión |
| Tabla `alerts` | ✅ | 16 columnas con severidad, estado, entidad |
| Página `/alerts` | ✅ | Vista de alertas activas |
| WF-07: Anomaly & Deadline Monitor | ✅ | Activo en n8n |
| Regla `MISSING_VAT_DATA` | ⏳ | Pendiente |
| Regla `UNUSUAL_VAT_RATIO` | ⏳ | Pendiente |
| Regla `MISSING_SUPPLIER` | ⏳ | Pendiente |
| Regla `POSSIBLE_DUPLICATE_SUPPLIER` | ⏳ | Pendiente |
| Regla `PERIOD_MISMATCH` | ⏳ | Pendiente |
| Priorización por impacto económico | ⏳ | Pendiente |
| Tests de reglas | ⏳ | Pendiente |

---

## FASE 7 — Copiloto IA ⏳ INICIO (20%)

| Elemento | Estado | Detalle |
|---|---|---|
| Página `/copilot` (UI chat) | ✅ | Interfaz presente |
| Consultas con datos reales de Supabase | ⏳ | IA no consulta BD en tiempo real aún |
| "¿Por qué cambió mi IVA?" | ⏳ | Pendiente |
| "¿Qué documentos tengo pendientes?" | ⏳ | Pendiente |
| Motor responde → IA explica | ⏳ | Arquitectura definida, sin implementar |

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
| `businesses` | 13 | 1 | ✅ Activa |
| `profiles` | 6 | — | ✅ Activa |
| `documents` | 16 | 2 | ✅ En uso por WF-01 |
| `document_extractions` | 21 | 2 | ✅ En uso por WF-01 |
| `expenses` | 22 | — | ✅ Activa |
| `income` | 19 | — | ✅ Activa |
| `suppliers` | 12 | — | ✅ Activa |
| `tax_periods` | 13 | — | ✅ Activa |
| `tax_snapshots` | 19 | — | ✅ Activa |
| `alerts` | 16 | — | ✅ Activa |
| `audit_events` | 12 | — | ✅ Activa |

**Migración aplicada:** `20260930000000_initial_schema.sql`

---

## Deuda Técnica

| # | Ítem | Prioridad | Fase |
|---|---|---|---|
| DT-01 | API key OpenAI hardcodeada en WF-01 nodo HTTP | 🔴 ALTA | F4 |
| DT-02 | Wrapper `AiProvider.interface.ts` no conectado al pipeline real | 🔴 ALTA | F4 |
| DT-03 | `businessId` hardcodeado como UUID cero en todo el flujo | 🟡 MEDIA | F5 |
| DT-04 | Dashboard parcialmente basado en `mockData.ts` | 🟡 MEDIA | F5 |
| DT-05 | Seed SQL de datos DEMO no implementado | 🟡 MEDIA | F2 |
| DT-06 | Tests RLS por tabla sin cubrir | 🟡 MEDIA | F1 |
| DT-07 | Soporte PDF multi-página en WF-01 sin probar | 🟡 MEDIA | F4 |
| DT-08 | WF-05 expense-processing automático no implementado | 🟠 BAJA | F4 |
| DT-09 | Separación de entornos DEMO/STAGING/PROD | 🟠 BAJA | F8 prereq |
| DT-10 | Supabase Auth no activado para usuarios reales | 🟠 BAJA | F8 prereq |

---

## Próximos Pasos Priorizados

### 🔴 Urgente
1. Migrar API key OpenAI al gestor de credenciales de n8n (DT-01)
2. Probar WF-01 con facturas en formato PDF

### 🟡 Esta semana
3. Implementar WF-05: expense-processing tras aprobación human-in-the-loop
4. Reemplazar `mockData.ts` con queries reales a Supabase en dashboard (DT-04)
5. Conectar `businessId` real desde sesión de usuario (DT-03)

### 🟠 Próximas 2 semanas
6. Implementar reglas anomalías restantes (`MISSING_VAT_DATA`, `UNUSUAL_VAT_RATIO`)
7. Copiloto IA con contexto real de Supabase (Fase 7)
8. Wrapper `AiProvider` para desacoplar de OpenAI (DT-02)

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

---

*Documento generado y mantenido por Antigravity. Actualizar al final de cada sesión de desarrollo.*

