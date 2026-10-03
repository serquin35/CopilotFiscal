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

### WF-08: `deadline-reminders` ACTIVO en n8n cloud (verificado 03/10/2026)

**Fichero:** `n8n/workflows/wf08_deadline_reminders.json` (5 nodos; credencial
n8n `Supabase Copilot`, sin claves en el JSON). Versión validada con
simulación de la lógica (0 duplicados / 3 inserciones 3T).

**Trigger:** `Schedule: Weekly Check` — semanal, lunes 08:00.

**Flujo:** lista negocios → lista alertas `PERIOD_DEADLINE` abiertas
(anti-duplicados) → `Build Deadline Alerts` calcula el próximo vencimiento
del 303 (incluye el 4T del año anterior, vence el 30 de enero; si faltan
30 días o menos emite, `high` si 7 o menos) → inserta en `alerts`
(`source: 'n8n'`, `status: 'OPEN'`).

**Importante:**
- WF-08 **solo inserta filas en `alerts`**: NO envía nada al usuario. La notificación real es WF-10 (pendiente).
- Las filas `PERIOD_DEADLINE` aún **no se muestran** en `/alerts`, widget ni badge (solo renderizan el motor del cliente). Ver DT-16.

### WF-10: `notifications` ⏳ PENDIENTE (antes WF-08; renombrado 03/10/2026, ver ADR-05)

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
        ▼                                                   WF-10: notif
   WF-03: validation                                           (error)
         │
         ├── [Falla validación] ──→ NEEDS_REVIEW ──→ WF-10: notif (user)
         │
         ▼
   WF-04: classification ──→ NEEDS_REVIEW ──→ WF-10: notif (user)


[Usuario confirma documento en UI]
         │
         ▼
   WF-05: expense-processing
         │
         ├── Crea expense
         ├── WF-06: tax-snapshot (recalcular)
         └── WF-07: anomaly-detection
                     │
                     └── WF-10: notifications (si severity high/critical)
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
    WF-08_deadline-reminders.json
    WF-10_notifications.json (pendiente)
    WF-09_demo-seed.json (sustituido por semilla SQL versionada)
  README.md    ← Instrucciones de importación y configuración de credenciales
```

> [!CAUTION]
> Los archivos JSON exportados de n8n NO deben contener valores de credenciales, URLs de producción ni tokens reales. Solo nombres de credenciales (ej: `"credentials": {"name": "supabase-service-role"}`).

---

*Documento generado durante FASE 0. Los workflows reales se implementan en Fase 4.*
