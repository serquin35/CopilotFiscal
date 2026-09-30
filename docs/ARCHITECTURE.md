# ARCHITECTURE — COPILOTO FISCAL

> **Versión:** 1.0  
> **Fecha:** 30 Septiembre 2026  
> **Estado:** FASE 0 — Arquitectura  
> **Fuente de verdad:** COPILOTO_FISCAL_MASTER_PLAN.md §5, §6  
> **Autor:** Antigravity (generado durante FASE 0)

---

## 1. Principios Arquitectónicos

1. **Clean Architecture** — Las capas internas no conocen las externas
2. **UI Tonta** — Zero lógica de negocio en componentes
3. **Motor Fiscal Determinista** — Nunca en prompts de IA
4. **Proveedores Intercambiables** — AI, OCR, Storage via wrappers
5. **Trazabilidad Total** — Toda cifra es rastreable hasta su origen
6. **Inmutabilidad por defecto** — Los registros confirmados no se eliminan, se anulan con trazabilidad
7. **Cambios Atómicos** — Un cambio = una responsabilidad = una prueba

---

## 2. Diagrama de Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                      │
│              Next.js 14 App Router  ·  PWA                  │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │Dashboard │ │Documents │ │ Expenses │ │   Copilot    │  │
│  │ Feature  │ │ Feature  │ │ Feature  │ │   (Chat IA)  │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘  │
└───────┼────────────┼────────────┼───────────────┼───────────┘
        │            │            │               │
        └────────────┴────────────┴───────────────┘
                              │
                    ┌─────────▼──────────┐
                    │    DOMAIN LAYER     │
                    │  Use Cases · Rules  │
                    │  Entities · Types   │
                    └─────────┬──────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
┌────────▼──────┐  ┌──────────▼──────┐  ┌─────────▼──────────┐
│  DATA LAYER   │  │  FISCAL ENGINE  │  │  AUTOMATION LAYER  │
│               │  │                 │  │                    │
│  Supabase DB  │  │  VatCalculator  │  │   n8n Workflows    │
│  PostgreSQL   │  │  PeriodCalc     │  │   OCR Wrapper      │
│  Auth         │  │  AnomalyDetect  │  │   AI Wrapper       │
│  Storage      │  │  FiscalRuleSet  │  │   Notifications    │
│  RLS          │  │  RuleRegistry   │  │                    │
└───────────────┘  └─────────────────┘  └────────────────────┘
```

---

## 3. Descripción de Capas

### 3.1 Presentation Layer (UI)

**Responsabilidades:**
- Renderizar estado
- Recoger interacción del usuario
- Gestionar estados visuales: Loading / Error / Empty / Success
- Navegar entre features

**Prohibiciones:**
- ❌ No contiene reglas fiscales
- ❌ No hace cálculos de IVA, periodos o retenciones
- ❌ No llama directamente a proveedores de IA/OCR
- ❌ No accede directamente a `supabase` con `service_role`

**Tecnología:** Next.js 14 App Router, TypeScript, CSS Modules

**Estructura de features:**

```
src/features/
  dashboard/
    components/
    hooks/
    page.tsx
  documents/
    components/
    hooks/
    page.tsx
    [id]/
      review/
        page.tsx       ← Revisión human-in-the-loop
  expenses/
    ...
  income/
    ...
  suppliers/
    ...
  tax-periods/
    ...
  alerts/
    ...
  copilot/             ← Chat con IA (solo consulta, no calcula)
    ...
```

### 3.2 Domain Layer

**Responsabilidades:**
- Definir entidades y tipos del dominio
- Implementar casos de uso (Application Services)
- Contener reglas de negocio **no-fiscales**
- Orquestar el acceso a datos y al motor fiscal

**Prohibiciones:**
- ❌ No importa dependencias de UI (React, Next.js)
- ❌ No implementa cálculos fiscales directamente (delega al Fiscal Engine)
- ❌ No llama directamente a Supabase o SDKs de terceros (usa repositorios)

**Estructura:**

```
src/domain/
  entities/
    Business.ts
    Document.ts
    DocumentExtraction.ts
    Expense.ts
    Income.ts
    Supplier.ts
    TaxPeriod.ts
    TaxSnapshot.ts
    Alert.ts
    AuditEvent.ts
  use-cases/
    documents/
      UploadDocument.ts
      ReviewExtraction.ts
      ConfirmDocument.ts
    expenses/
      RegisterExpense.ts
      ValidateExpense.ts
    tax/
      CalculateTaxSnapshot.ts
      GetPeriodSummary.ts
    alerts/
      DetectAnomalies.ts
  repositories/           ← Interfaces (no implementaciones)
    IDocumentRepository.ts
    IExpenseRepository.ts
    ITaxSnapshotRepository.ts
    ...
  types/
    DocumentStatus.ts     ← UPLOADED | EXTRACTING | EXTRACTED | NEEDS_REVIEW | CONFIRMED | REJECTED | ERROR
    AlertSeverity.ts
    VatRate.ts
    ...
```

### 3.3 Data Layer

**Responsabilidades:**
- Implementar repositorios (acceso a Supabase/PostgreSQL)
- Gestionar Storage (documentos)
- Aplicar RLS correctamente
- Proveer clientes de Supabase (anon vs service_role)

**Reglas de seguridad:**
- `supabase-anon-key` → frontend (cliente)
- `supabase-service-role-key` → NUNCA frontend; solo server-side, n8n y Edge Functions
- Toda tabla de negocio tiene RLS desde su creación

**Estructura:**

```
src/lib/
  supabase/
    client.ts            ← Client-side (anon key)
    server.ts            ← Server-side (service role, solo en server actions/API)
    middleware.ts        ← Auth middleware Next.js
  repositories/
    DocumentRepository.ts
    ExpenseRepository.ts
    IncomeRepository.ts
    SupplierRepository.ts
    TaxSnapshotRepository.ts
    AlertRepository.ts
    AuditRepository.ts
```

### 3.4 Fiscal Engine Layer

**Responsabilidades:**
- Calcular IVA soportado / repercutido
- Calcular balance fiscal estimativo
- Determinar periodo trimestral/anual
- Detectar anomalías mediante reglas deterministas
- Versionar y registrar reglas fiscales
- Clasificar gastos según categoría y deducibilidad

**Regla absoluta:** Nunca delegar cálculos numéricos a un LLM.

**Estructura:**

```
src/engine/
  fiscal/
    types/
      FiscalRuleSet.ts
      VatRate.ts
      TaxPeriod.ts
      FiscalResult.ts
    rules/
      demo/
        DEMO_v1.rules.ts         ← Reglas ficticias etiquetadas DEMO
      future/
        ES_RETA_2024.rules.ts    ← Placeholder (Fase 8, requiere validación)
    calculators/
      VatCalculator.ts
      PeriodCalculator.ts
      SnapshotCalculator.ts
    validators/
      ExpenseValidator.ts
      DocumentValidator.ts
    anomaly/
      AnomalyDetector.ts
      rules/
        DuplicateDocumentRule.ts
        MissingVatRule.ts
        UnusualVatRatioRule.ts
        ...
    registry/
      RuleRegistry.ts            ← Registro de versiones activas por jurisdicción
```

**Versioning de reglas:** Ver `FISCAL_ENGINE.md` para detalle completo.

### 3.5 Automation Layer (n8n)

**Responsabilidades:**
- Orquestar el pipeline asíncrono de documentos
- Disparar OCR/extracción
- Notificar al usuario
- Ejecutar tareas de fondo (detección de anomalías, snapshots)
- Gestionar el seed de datos demo

**Prohibiciones:**
- ❌ No contiene lógica de dominio fiscal
- ❌ No modifica registros directamente con service_role innecesariamente
- ❌ No toma decisiones autónomas sobre datos fiscales

**Comunicación:** n8n se comunica con la aplicación exclusivamente mediante **webhooks HTTP seguros**.

Ver `N8N_ARCHITECTURE.md` para detalle completo.

---

## 4. Wrappers de Proveedores

### 4.1 AI Provider Wrapper

```typescript
// src/lib/ai/AiProvider.interface.ts
interface AiProvider {
  extractFromDocument(input: DocumentExtractionInput): Promise<ExtractionResult>
  classifyExpense(input: ExpenseClassificationInput): Promise<ClassificationResult>
  generateExplanation(input: ExplanationInput): Promise<ExplanationResult>
  detectAnomalySignals(input: AnomalyInput): Promise<AnomalySignalResult>
}

// Metadatos obligatorios en toda respuesta de IA
interface AiResponseMetadata {
  provider: string        // 'gemini' | 'openai' | 'claude' | 'mock'
  model: string           // 'gemini-1.5-pro' | 'gpt-4o' | etc.
  promptVersion: string   // 'extract-invoice-v2'
  confidence: number      // 0.0 - 1.0
  rawOutput: unknown      // Respuesta cruda del proveedor
  timestamp: string       // ISO 8601
}
```

**Implementaciones:**

| Clase | Entorno |
|---|---|
| `MockAiProvider` | DEMO (Fase 1-4) |
| `GeminiProvider` | Producción (Fase 4+) |
| `OpenAIProvider` | Alternativa (Fase 4+) |
| `ClaudeProvider` | Alternativa (Fase 4+) |

### 4.2 Document Extractor Wrapper

```typescript
// src/lib/ocr/DocumentExtractor.interface.ts
interface DocumentExtractor {
  extract(input: DocumentInput): Promise<RawExtraction>
}

interface RawExtraction {
  provider: string
  extractionVersion: string
  rawPayload: unknown
  confidence: number
  extractedAt: string
}
```

**Implementaciones:**

| Clase | Entorno |
|---|---|
| `MockExtractor` | DEMO (Fase 1-3). Retorna datos ficticios predefinidos |
| `GoogleDocumentAiExtractor` | Producción (Fase 4+) |
| `AwsTextractExtractor` | Alternativa (Fase 4+) |

---

## 5. Política de Trazabilidad

### 5.1 Principio

> Toda cifra mostrada en el dashboard debe poder rastrearse hasta su origen.

```
Cifra en dashboard
  └── TaxSnapshot (id, rules_version, calculated_at)
        └── Expenses / Income utilizados
              └── Document confirmado (status: CONFIRMED)
                    └── DocumentExtraction (provider, model, confidence)
                          └── Documento original (storage_path, hash)
```

### 5.2 Audit Events

Toda acción relevante genera un `audit_event`:

| Evento | Actor | Descripción |
|---|---|---|
| `DOCUMENT_UPLOADED` | user | Documento subido |
| `EXTRACTION_STARTED` | system | n8n inicia OCR |
| `EXTRACTION_COMPLETED` | system | OCR completado |
| `REVIEW_REQUESTED` | system | Documento necesita revisión |
| `EXTRACTION_CORRECTED` | user | Usuario corrige campos |
| `DOCUMENT_CONFIRMED` | user | Usuario confirma extracción |
| `DOCUMENT_REJECTED` | user | Usuario rechaza documento |
| `EXPENSE_CREATED` | system | Gasto creado desde documento confirmado |
| `EXPENSE_MODIFIED` | user | Usuario modifica gasto |
| `SNAPSHOT_CALCULATED` | system | Motor fiscal genera snapshot |
| `ALERT_GENERATED` | system | Anomalía detectada |
| `ALERT_DISMISSED` | user | Usuario descarta alerta |

### 5.3 Regla de Inmutabilidad

- Los documentos confirmados **no se eliminan** (soft delete con estado `REJECTED`)
- Los snapshots fiscales son **inmutables** una vez calculados; para recalcular se crea uno nuevo
- Las correcciones del usuario se registran como nuevos `audit_events`, no como sobrescritura silenciosa
- Los `audit_events` nunca se borran

---

## 6. Flujo de Documento (End-to-End)

```
Usuario sube PDF/JPG/PNG
        │
        ▼
[UPLOADED] → Storage (Supabase Storage)
        │      ↓
        │  Webhook → n8n: document-intake
        │
        ▼
[EXTRACTING] → n8n: document-extraction
        │       └── OCR Wrapper (Mock en DEMO)
        │
        ▼
[EXTRACTED] → document_extractions guardado en DB
        │      └── AuditEvent: EXTRACTION_COMPLETED
        │
        ▼
[NEEDS_REVIEW] → Notificación al usuario
        │         └── UI: pantalla de revisión
        │
        ▼
Usuario revisa y corrige campos
        │
        ├── [REJECTED] → AuditEvent: DOCUMENT_REJECTED
        │                Fin del flujo
        │
        └── [CONFIRMED] → AuditEvent: DOCUMENT_CONFIRMED
                │
                ▼
        Motor determinista puede usar datos confirmados
                │
                ▼
        Gasto/Ingreso registrado en DB
                │
                ▼
        TaxSnapshot recalculado si aplica
                │
                ▼
        AnomalyDetector ejecuta reglas
                │
                ▼
        Alertas generadas si procede
                │
                ▼
        Dashboard actualizado
```

---

## 7. Separación de Entornos

```typescript
type Environment = 'DEMO' | 'STAGING' | 'PRODUCTION'

// En DEMO:
// - MockExtractor retorna datos ficticios
// - MockAiProvider retorna clasificaciones ficticias
// - Seed automático de datos del Bar Restaurante Demo
// - Banner visual permanente: "ENTORNO DE SIMULACIÓN"
// - Reglas fiscales: DEMO_v1 (ficticias, claramente etiquetadas)
```

**Banner obligatorio en DEMO:**
> ⚠️ ENTORNO DE SIMULACIÓN — Los datos y cálculos son ficticios y no constituyen asesoramiento fiscal.

---

## 8. Seguridad por Capas

| Capa | Control |
|---|---|
| Frontend | `anon key` de Supabase, RLS activo |
| Server (Next.js API Routes / Server Actions) | `service_role` vía variables de entorno server-only |
| n8n | Credenciales almacenadas en n8n (no en código), webhooks con token de verificación |
| Supabase | RLS en todas las tablas, policies por `business_id` y `owner_id` |
| Storage | Bucket privado, acceso via signed URLs, políticas de storage |
| Git | `.gitignore` para `.env*`, secret scanning activado |

---

## 9. Diseño Visual — Principios

El sistema de diseño debe transmitir:

- **Profesional** — No un juguete, una herramienta de trabajo
- **Claro** — El usuario entiende su negocio en <10 segundos
- **Tranquilo** — No genera ansiedad innecesaria
- **Financiero** — Paleta neutral, tipografía legible

**Design tokens base (a definir en Fase 1):**

```css
/* Colores semánticos — No usar hex directamente en componentes */
--color-success
--color-warning
--color-danger
--color-info
--color-neutral

/* Estados diferenciados visualmente */
--status-dato        /* Dato confirmado */
--status-estimacion  /* Estimación calculada */
--status-pendiente   /* Pendiente de revisión */
```

**Regla crítica de UI:** Nunca mezclar visualmente `DATO`, `ESTIMACIÓN` y `PENDIENTE DE REVISIÓN`.

---

*Documento generado durante FASE 0. No ejecutar código hasta validar este documento.*
