# N8N ARCHITECTURE — COPILOTO FISCAL

> **Versión:** 1.0  
> **Fecha:** 30 Septiembre 2026  
> **Estado:** FASE 0 — Arquitectura n8n  
> **Fuente de verdad:** COPILOTO_FISCAL_MASTER_PLAN.md §14  
> **Autor:** Antigravity (generado durante FASE 0)

---

## 1. Principios de Uso de n8n

| Principio | Descripción |
|---|---|
| **Orquestación, no dominio** | n8n coordina procesos; la lógica de negocio vive en el backend |
| **Un workflow = una responsabilidad** | Nunca un workflow gigante con múltiples propósitos |
| **Contratos claros** | Todo webhook tiene entrada y salida definidas con schema |
| **Sin secretos en workflows** | Credenciales solo en el gestor de credenciales de n8n |
| **Idempotencia** | Cada workflow puede ejecutarse múltiples veces sin efectos no deseados |
| **Logging obligatorio** | Todo proceso importante debe registrar un `audit_event` |
| **Manejo de errores explícito** | Nunca silenciar errores; siempre manejar y loggear |

> [!WARNING]
> n8n nunca debe tomar decisiones fiscales autónomas. Si un proceso requiere lógica de dominio, debe llamar al backend que implementa esa lógica, no implementarla en el workflow.

---

## 2. Catálogo de Workflows

### WF-01: `document-intake`
**Responsabilidad:** Recibir notificación de nuevo documento subido y registrarlo en la base de datos.

### WF-02: `document-extraction`
**Responsabilidad:** Ejecutar el proceso de OCR/extracción sobre un documento.

### WF-03: `document-validation`
**Responsabilidad:** Validación estructural de los datos extraídos (campos requeridos, formatos).

### WF-04: `document-classification`
**Responsabilidad:** Clasificación asistida por IA del tipo y categoría del documento/gasto.

### WF-05: `expense-processing`
**Responsabilidad:** Crear o actualizar el registro de gasto tras confirmación del usuario.

### WF-06: `tax-snapshot`
**Responsabilidad:** Solicitar al backend el recálculo del TaxSnapshot de un periodo.

### WF-07: `anomaly-detection`
**Responsabilidad:** Ejecutar las reglas de detección de anomalías sobre el estado actual.

### WF-08: `notifications`
**Responsabilidad:** Enviar notificaciones al usuario (email, push, in-app).

### WF-09: `demo-seed`
**Responsabilidad:** Generar el dataset ficticio completo para el entorno DEMO.

---

## 3. Contratos de Webhook — Detalle por Workflow

### WF-01: `document-intake-and-extraction` (Pipeline Unificado v2.1)

> **ID en producción:** `zrKXQ5YJ8lLwHRL7`  
> **Nombre:** `[Copilot Fiscal] WF-01: Document Intake & Extraction Pipeline`  
> **Topología:** 13 nodos con branching inteligente de binarios PDF vs imágenes  
> **Referencias de Arquitectura:** [ADR-01 (Tokens)](DECISIONS.md#adr-01-consumo-de-tokens-de-visión-en-extracción-de-facturas-wf-01), [ADR-02 (Storage 1600px)](DECISIONS.md#adr-02-almacenamiento-de-imágenes-originales-vs-comprimidas-23-trazabilidad), [ADR-03 (Batch Pool)](DECISIONS.md#adr-03-estrategia-de-subida-en-bloque-asíncrona-pool-de-concurrencia-vs-bloqueante)

**Trigger:** Webhook directo desde el cliente Next.js (`/documents`).

**Endpoint Webhook:** `POST /webhook/copilot-document-intake`

**Payload de entrada:**
```json
{
  "documentId": "uuid-v4",
  "businessId": "uuid-v4",
  "storagePath": "uuid-filename.jpg",
  "originalFilename": "ticket_gasolina.jpg",
  "fileSize": 245678,
  "mimeType": "image/jpeg",
  "fileUrl": "https://rqcpwxucgkcodccrykpv.supabase.co/storage/v1/object/public/documents/...",
  "model": "gpt-4o-mini",
  "detail": "high",
  "uploadedAt": "2026-10-02T10:00:00Z"
}
```

**Flujo de Nodos (13 Nodos):**
1. **Webhook: Document Intake**: Recibe el payload del documento.
2. **Validate & Normalize Input**: Valida UUID v4, campos obligatorios y detecta flag `isPdf`.
3. **Supabase: Set EXTRACTING**: Actualiza el estado a `EXTRACTING` en tabla `documents`.
4. **Is PDF? (If Node)**:
   - **Rama True (PDF)**: Nodo `Download PDF` descarga el binario directamente desde Supabase Storage; `Build OpenAI Request` lo empaqueta como `file` con `data:application/pdf;base64,...` (sin intermediarios Vercel).
   - **Rama False (Imagen)**: `Build OpenAI Request` construye el payload con `image_url` y `detail: 'high'` (optimizado previamente a máx 1600px en cliente).
5. **OpenAI: Extract Invoice Data**:
   - Conexión predefinida n8n: `CopilotoFiscal` (OpenAI API key segura).
   - **Resiliencia ante cuotas TPM (429)**: `retryOnFail: true`, `maxTries: 3`, `waitBetweenTries: 2000` con timeout de 120s.
6. **Process & Validate Output**:
   - Parseo JSON estricto con campos normalizados (`supplier_name`, `supplier_nif`, `invoice_number`, `date`, `base_amount`, `vat_rate`, `vat_amount`, `total_amount`, `category`, `description`).
   - Captura de métricas de tokens (`usage.prompt_tokens`, `usage.completion_tokens`, `usage.total_tokens`) y modelo utilizado.
   - Si faltan datos críticos o el parseo falla, asigna status `NEEDS_REVIEW`.
7. **Supabase: Save Extraction**: Guarda registro en `document_extractions` con `raw_payload`, `model` y desglose de importes.
8. **Supabase: Update Doc Status**: Actualiza estado final (`EXTRACTED` o `NEEDS_REVIEW`).
9. **Respond to Webhook**: Retorna JSON con `success: true`, campos extraídos y `usage`.
10. **Rama de Errores (Supabase: Mark Needs Review + Respond Error)**: Si la descarga de PDF o la llamada a OpenAI fallan tras todos los reintentos, marca el documento como `NEEDS_REVIEW` en DB y responde HTTP 500 para control del cliente.

---

### WF-02: `document-extraction`

**Trigger:** Llamada interna desde WF-01 o webhook directo.

**Endpoint:** `POST /webhook/document-extraction`

**Payload de entrada:**
```json
{
  "documentId": "uuid",
  "businessId": "uuid",
  "storagePath": "documents/business-uuid/filename.pdf",
  "mimeType": "application/pdf",
  "extractorProvider": "mock",
  "extractorVersion": "mock-v1"
}
```

**Acciones:**
1. Descargar documento desde Supabase Storage
2. Llamar al `DocumentExtractor` correspondiente (MockExtractor en DEMO)
3. Persistir resultado en `document_extractions`:
   - `provider`, `model`, `prompt_version`, `extraction_version`
   - `raw_payload` (respuesta cruda completa)
   - `confidence`
   - Campos extraídos individuales
4. Calcular `hash_sha256` del archivo (si no se hizo en WF-01)
5. Actualizar `documents.status` → `EXTRACTED`
6. Verificar si el hash ya existe en otros documentos (alerta DUPLICATE_DOCUMENT)
7. Disparar WF-03 (document-validation)

**Respuesta:**
```json
{
  "documentId": "uuid",
  "extractionId": "uuid",
  "status": "EXTRACTED",
  "confidence": 0.92,
  "warnings": [],
  "nextWorkflow": "document-validation"
}
```

**Manejo de errores:**
- Si extractor falla → `documents.status` → `ERROR`, registrar error, notificar usuario
- Si confianza < 0.5 → continuar pero marcar todos los campos con `low_confidence: true`

---

### WF-03: `document-validation`

**Trigger:** Llamada desde WF-02.

**Endpoint:** `POST /webhook/document-validation`

**Payload de entrada:**
```json
{
  "documentId": "uuid",
  "extractionId": "uuid",
  "businessId": "uuid"
}
```

**Acciones:**
1. Leer `document_extractions` para el `extractionId`
2. Ejecutar validaciones estructurales:
   - `extracted_date` → formato válido, no futura
   - `extracted_total_amount` → número positivo
   - `extracted_vat_amount` ≤ `extracted_total_amount`
   - `extracted_base_amount` + `extracted_vat_amount` ≈ `extracted_total_amount` (tolerancia ±0.02€)
3. Si pasa validación → disparar WF-04 (classification)
4. Si falla validación → `documents.status` → `NEEDS_REVIEW` con warnings específicos

**Respuesta:**
```json
{
  "documentId": "uuid",
  "validationPassed": true,
  "warnings": [],
  "nextWorkflow": "document-classification"
}
```

---

### WF-04: `document-classification`

**Trigger:** Llamada desde WF-03.

**Endpoint:** `POST /webhook/document-classification`

**Payload de entrada:**
```json
{
  "documentId": "uuid",
  "extractionId": "uuid",
  "businessId": "uuid"
}
```

**Acciones:**
1. Leer datos extraídos del documento
2. Llamar al `AiProvider` para clasificación (MockAiProvider en DEMO):
   - Tipo de gasto sugerido (categoría)
   - Proveedor normalizado (buscar match en `suppliers`)
   - Confianza de clasificación
3. Guardar propuesta de clasificación en `document_extractions.raw_payload` (extensión)
4. `documents.status` → `NEEDS_REVIEW`
5. Registrar `audit_event`: `REVIEW_REQUESTED`
6. Disparar WF-08 (notifications) → notificar al usuario

**Metadatos de IA guardados obligatoriamente:**
```json
{
  "ai_classification": {
    "provider": "mock",
    "model": "mock-classifier-v1",
    "promptVersion": "classify-expense-v1",
    "confidence": 0.87,
    "suggestedCategory": "alimentacion",
    "suggestedSupplierNormalized": "Distribuidora Demo SL",
    "rawOutput": { "...": "respuesta cruda completa" },
    "timestamp": "2026-09-30T10:01:00Z"
  }
}
```

---

### WF-05: `expense-processing`

**Trigger:** Webhook desde Next.js cuando el usuario confirma un documento en la UI.

**Endpoint:** `POST /webhook/expense-processing`

**Payload de entrada:**
```json
{
  "documentId": "uuid",
  "businessId": "uuid",
  "confirmedBy": "user-uuid",
  "confirmedData": {
    "date": "2026-09-15",
    "supplierName": "Distribuidora Demo SL",
    "supplierNif": "B****123X",
    "description": "Compra bebidas septiembre",
    "baseAmount": 450.00,
    "vatRate": 21,
    "vatAmount": 94.50,
    "totalAmount": 544.50,
    "category": "bebidas",
    "deductibilityStatus": "DEDUCTIBLE"
  }
}
```

**Acciones:**
1. Validar payload (schema Zod server-side en el backend antes de llamar a n8n)
2. `documents.status` → `CONFIRMED`
3. Buscar o crear `supplier` con `supplierName` normalizado
4. Crear registro en `expenses`
5. Determinar periodo fiscal (`fiscal_period_year`, `fiscal_period_quarter`)
6. Registrar `audit_event`: `DOCUMENT_CONFIRMED` + `EXPENSE_CREATED`
7. Disparar WF-07 (anomaly-detection) para el periodo afectado

**Respuesta:**
```json
{
  "documentId": "uuid",
  "expenseId": "uuid",
  "supplierId": "uuid",
  "confirmedAt": "2026-09-30T10:05:00Z"
}
```

---

### WF-06: `tax-snapshot`

**Trigger:** Manual (usuario solicita recálculo) o automático (al confirmar un gasto significativo).

**Endpoint:** `POST /webhook/tax-snapshot`

**Payload de entrada:**
```json
{
  "businessId": "uuid",
  "taxPeriodId": "uuid",
  "triggeredBy": "user",
  "triggeredByUserId": "user-uuid",
  "rulesVersion": "DEMO_v1"
}
```

**Acciones:**
1. Llamar al endpoint del backend: `POST /api/fiscal/calculate-snapshot`
2. El backend ejecuta el `SnapshotCalculator` (motor determinista)
3. n8n persiste el resultado en `tax_snapshots`
4. Registrar `audit_event`: `SNAPSHOT_CALCULATED`
5. Si hay warnings → disparar WF-07 (anomaly-detection)

> [!IMPORTANT]
> El cálculo real lo hace el backend (SnapshotCalculator). n8n solo orquesta la solicitud y persiste el resultado. Nunca calcular IVA dentro del workflow de n8n.

---

### WF-07: `anomaly-detection`

**Trigger:** Automático tras confirmar gasto, tras calcular snapshot, o programado.

**Endpoint:** `POST /webhook/anomaly-detection`

**Payload de entrada:**
```json
{
  "businessId": "uuid",
  "taxPeriodId": "uuid",
  "scope": "period",
  "triggeredBy": "system"
}
```

**Acciones:**
1. Llamar al backend: `POST /api/fiscal/detect-anomalies`
2. Backend ejecuta `AnomalyDetector` (motor determinista)
3. n8n recibe lista de `AnomalyFinding[]`
4. Para cada finding: crear registro en `alerts` (si no existe ya)
5. Para alertas de severidad `high` / `critical`: disparar WF-08 (notificación)

---

### WF-08: `notifications`

**Trigger:** Llamado por otros workflows cuando hay algo que notificar.

**Endpoint:** `POST /webhook/notifications`

**Payload de entrada:**
```json
{
  "businessId": "uuid",
  "userId": "user-uuid",
  "type": "DOCUMENT_NEEDS_REVIEW",
  "severity": "medium",
  "title": "Documento pendiente de revisión",
  "message": "Se ha procesado una factura que requiere tu confirmación.",
  "entityType": "document",
  "entityId": "uuid",
  "actionUrl": "/documents/uuid/review"
}
```

**Canales en DEMO:** Solo in-app (crear registro en tabla `notifications` o `alerts`)
**Canales en Producción:** Email + in-app (a definir en Fase 4+)

---

### WF-09: `demo-seed`

**Trigger:** Manual (solo en DEMO). Llamado una vez para inicializar los datos ficticios.

**Endpoint:** `POST /webhook/demo-seed`

**Payload de entrada:**
```json
{
  "businessId": "uuid",
  "scenarioName": "bar-restaurante-demo-2026",
  "force": false
}
```

**Acciones:**
1. Verificar que `businesses.is_demo = true` y `environment = 'DEMO'`
2. Si `force = false` y ya hay datos → abortar con 409 Conflict
3. Insertar proveedores ficticios (~15 registros)
4. Insertar ingresos ficticios (6 meses de datos, ~180 días)
5. Insertar gastos ficticios (~60 registros de distintas categorías)
6. Insertar documentos ficticios simulados (metadatos, no archivos reales)
7. Insertar casos problemáticos deliberados (ver MVP_SPEC.md)
8. Calcular periodos fiscales (2 trimestres)
9. Calcular snapshot inicial (DEMO_v1)
10. Generar alertas de ejemplo

---

## 4. Idempotencia

Todos los workflows que pueden ser disparados múltiples veces implementan idempotencia:

```
Tabla: n8n_idempotency_log (solo visible para n8n via service_role)
  - event_id    TEXT PRIMARY KEY
  - workflow    TEXT
  - processed_at TIMESTAMPTZ
  - result      JSONB
```

**Patrón:**
```
1. Al iniciar: verificar si event_id existe en n8n_idempotency_log
2. Si existe: responder con resultado anterior (no reprocesar)
3. Si no existe: procesar y guardar resultado en tabla
```

**`event_id` se construye como:** `{workflow}-{entityId}-{timestamp-truncated-to-minute}`

---

## 5. Manejo de Errores

```
Niveles de error:

1. ERROR_RETRYABLE   → Fallo transitorio (timeout, Supabase momentáneamente no disponible)
                       → n8n reintenta hasta 3 veces con backoff exponencial
                       → Si persiste: ERROR_PERMANENT

2. ERROR_PERMANENT   → Fallo estructural (documento corrupto, datos inválidos)
                       → documents.status = 'ERROR'
                       → audit_event: PROCESSING_FAILED con detalle
                       → Notificación al usuario

3. ERROR_BUSINESS    → Regla de negocio violada (documento duplicado, periodo cerrado)
                       → No es un error de sistema; es un estado válido
                       → Flujo alternativo (crear alerta, no reintentar)
```

---

## 6. Seguridad de Webhooks

```
Autenticación: Header de autorización en cada webhook
  X-Webhook-Secret: {token-secreto-almacenado-en-n8n-credentials}

El backend verifica este token en cada petición entrante de n8n.
El frontend NUNCA conoce ni usa este token.

En DEMO: token ficticio 'demo-secret-token-local'
En Producción: token generado aleatoriamente, rotado periódicamente
```

---

## 7. Diagrama de Flujo de Workflows

```
[Usuario sube documento]
        │
        ▼
   WF-01: intake ──────────────────────────────────────────────┐
        │                                                        │
        ▼                                                        │ Error
   WF-02: extraction                                            │
        │                                                        │
        ▼                                                   WF-08: notif
   WF-03: validation                                           (error)
        │
        ├── [Falla validación] ──→ NEEDS_REVIEW ──→ WF-08: notif (user)
        │
        ▼
   WF-04: classification ──→ NEEDS_REVIEW ──→ WF-08: notif (user)


[Usuario confirma documento en UI]
        │
        ▼
   WF-05: expense-processing
        │
        ├── Crea expense
        ├── WF-06: tax-snapshot (recalcular)
        └── WF-07: anomaly-detection
                    │
                    └── WF-08: notifications (si severity high/critical)
```

---

## 8. Exportación de Workflows

Los workflows de n8n se exportarán como JSON al repositorio:

```
n8n/
  workflows/
    WF-01_document-intake.json
    WF-02_document-extraction.json
    WF-03_document-validation.json
    WF-04_document-classification.json
    WF-05_expense-processing.json
    WF-06_tax-snapshot.json
    WF-07_anomaly-detection.json
    WF-08_notifications.json
    WF-09_demo-seed.json
  README.md    ← Instrucciones de importación y configuración de credenciales
```

> [!CAUTION]
> Los archivos JSON exportados de n8n NO deben contener valores de credenciales, URLs de producción ni tokens reales. Solo nombres de credenciales (ej: `"credentials": {"name": "supabase-service-role"}`).

---

*Documento generado durante FASE 0. Los workflows reales se implementan en Fase 4.*
