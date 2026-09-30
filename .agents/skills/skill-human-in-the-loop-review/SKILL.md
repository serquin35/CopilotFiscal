---
name: skill-human-in-the-loop-review
description: >
  Skill para implementar el módulo de revisión humana de documentos fiscales.
  Define el flujo de trabajo, los estados, las interacciones del usuario y
  los contratos de API para la pantalla /documents/[id]/review.
version: "1.0.0"
related_route: /documents/[id]/review
---

# Skill: Human-in-the-Loop Review

## 1. Propósito

Esta pantalla es el CENTRO DE VALIDACIÓN HUMANA del sistema.
El gestor revisa cada factura extraída por el pipeline de n8n/OpenAI
y decide si aprobar, rechazar o escalar la extracción.

La IA NO toma decisiones fiscales aquí — solo presenta sugerencias.
La decisión es SIEMPRE del humano.

---

## 2. Flujo de Estados del Documento

```
UPLOADED → EXTRACTING → EXTRACTED → PENDING_REVIEW → REVIEWED / REJECTED
```

En la pantalla de review el documento está en estado EXTRACTED o PENDING_REVIEW.

---

## 3. Layout de la Pantalla

### Panel Izquierdo (60%): Visor del Documento
- Embed del PDF/imagen original (iframe o <img>)
- Botones de zoom y navegación si es PDF multipágina
- Nombre de archivo y metadata (proveedor, fecha de subida)

### Panel Derecho (40%): Datos Extraídos + Acciones
#### Sección A: Datos Extraídos por IA
Mostrar como formulario de solo lectura con los campos:
- Número de factura
- Proveedor (nombre + NIF)
- Fecha de emisión
- Base imponible
- Tipo de IVA (%)
- Cuota de IVA
- Total factura
- Categoría de gasto
- Notas de la IA (texto libre del modelo)

#### Sección B: Anomalías Detectadas
Lista de alertas `AlertCard` con severidad (alta/media/baja).
Cada anomalía tiene botón "Descartar" con motivo.

#### Sección C: Acciones del Revisor
```
[✓ Aprobar extracción]  — POST /api/documents/[id]/approve
[✗ Rechazar]            — POST /api/documents/[id]/reject  
[⚠ Escalar a contable]  — POST /api/documents/[id]/escalate
```

---

## 4. Reglas de Implementación

1. El panel izquierdo muestra el documento ORIGINAL sin alteraciones.
2. Los campos extraídos son de solo lectura excepto los habilitados explícitamente.
3. Si hay anomalías de prioridad ALTA, el botón "Aprobar" está DESHABILITADO
   hasta que todas las anomalías altas estén descartadas o resueltas.
4. Cada acción del revisor genera un audit_event en Supabase con:
   - reviewer_id, action, timestamp, document_id, notes
5. NO se puede deshacer una aprobación desde la UI (requiere back-office).
6. Implementar optimistic UI con toast de confirmación.

---

## 5. Contratos de API (Server Actions / Route Handlers)

### GET /api/documents/[id]
Retorna: document + extracted_data + anomalies[]

### POST /api/documents/[id]/approve
Body: { reviewer_notes?: string }
Efecto: status → REVIEWED, crea audit_event

### POST /api/documents/[id]/reject  
Body: { reason: string }
Efecto: status → REJECTED, crea audit_event

### POST /api/documents/[id]/escalate
Body: { notes: string }
Efecto: status → ESCALATED, notifica via n8n webhook

---

## 6. Componentes Específicos de esta Ruta

- `DocumentViewer` — iframe/img con el PDF original
- `ExtractedDataPanel` — formulario read-only de campos extraídos
- `AnomalyList` — lista de AlertCards filtrable por severidad
- `ReviewActionBar` — barra inferior con los 3 botones de acción
- `ConfirmDialog` — modal de confirmación antes de aprobar/rechazar
