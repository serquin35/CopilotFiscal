# DATA MODEL — COPILOTO FISCAL

> **Versión:** 1.0  
> **Fecha:** 30 Septiembre 2026  
> **Estado:** FASE 0 — Modelo de Datos  
> **Fuente de verdad:** COPILOTO_FISCAL_MASTER_PLAN.md §7  
> **Autor:** Antigravity (generado durante FASE 0)

> [!IMPORTANT]
> Este documento es una especificación. Las migraciones SQL reales se generarán en Fase 1 y serán versionadas en `supabase/migrations/`. No ejecutar este SQL directamente.

---

## 1. Principios del Modelo

1. **Inmutabilidad** — Los registros confirmados no se borran; se anulan con trazabilidad
2. **Trazabilidad** — Todo resultado fiscal puede rastrearse hasta su documento origen
3. **RLS desde el inicio** — Toda tabla de negocio tiene Row Level Security
4. **`rules_version` obligatorio** — Todo cálculo fiscal registra la versión de reglas usada
5. **`audit_events` imborrables** — El log de auditoría nunca se trunca
6. **Soft delete** — Usar `deleted_at` / `status` en lugar de `DELETE` en registros de negocio

---

## 2. Diagrama de Relaciones

```
profiles (1) ──── (N) businesses
                        │
              ┌─────────┼──────────┬──────────┬────────────┐
              │         │          │          │            │
           documents  expenses  income    suppliers   tax_periods
              │         │                              │
    document_extractions│                         tax_snapshots
                        │
                   (supplier_id FK)

Tablas transversales (todas las entidades):
  alerts        → alertas por business_id
  audit_events  → log de auditoría por business_id + entity
```

---

## 3. Esquema SQL Detallado

### 3.1 `profiles`

Extiende `auth.users` de Supabase.

```sql
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT,
  email         TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_profiles_id ON profiles(id);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

---

### 3.2 `businesses`

El negocio es la entidad raíz. Todo dato de negocio está vinculado a `business_id`.

```sql
CREATE TABLE businesses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  name          TEXT NOT NULL,
  legal_form    TEXT NOT NULL,              -- 'autonomo' | 'sl' | 'sa'
  activity_type TEXT NOT NULL,             -- 'hosteleria' | 'comercio' | etc.
  cnae_code     TEXT,                      -- Código CNAE (ej: '5610' restaurantes)
  region        TEXT NOT NULL,             -- 'madrid' | 'cataluna' | etc.
  currency      CHAR(3) NOT NULL DEFAULT 'EUR',
  environment   TEXT NOT NULL DEFAULT 'DEMO',  -- 'DEMO' | 'STAGING' | 'PRODUCTION'
  is_demo       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,               -- Soft delete

  CONSTRAINT businesses_currency_check CHECK (currency = 'EUR'),
  CONSTRAINT businesses_environment_check CHECK (environment IN ('DEMO', 'STAGING', 'PRODUCTION'))
);

-- Índices
CREATE INDEX idx_businesses_owner_id ON businesses(owner_id);
CREATE INDEX idx_businesses_environment ON businesses(environment);

-- RLS
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "businesses_select_owner"
  ON businesses FOR SELECT
  USING (auth.uid() = owner_id AND deleted_at IS NULL);

CREATE POLICY "businesses_insert_owner"
  ON businesses FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "businesses_update_owner"
  ON businesses FOR UPDATE
  USING (auth.uid() = owner_id);
```

---

### 3.3 `documents`

Documento original subido por el usuario (factura, ticket, albarán).

```sql
CREATE TABLE documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  type              TEXT NOT NULL,          -- 'invoice' | 'ticket' | 'receipt' | 'credit_note' | 'other'
  direction         TEXT NOT NULL,          -- 'expense' (recibida) | 'income' (emitida)
  storage_path      TEXT NOT NULL,          -- Ruta en Supabase Storage
  original_filename TEXT NOT NULL,
  file_size_bytes   BIGINT,
  mime_type         TEXT,                   -- 'application/pdf' | 'image/jpeg' | 'image/png'
  hash_sha256       TEXT,                   -- Para detección de duplicados
  uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by       UUID REFERENCES auth.users(id),
  status            TEXT NOT NULL DEFAULT 'UPLOADED',
  status_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes             TEXT,                   -- Notas del usuario
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT documents_status_check CHECK (
    status IN ('UPLOADED', 'EXTRACTING', 'EXTRACTED', 'NEEDS_REVIEW', 'CONFIRMED', 'REJECTED', 'ERROR')
  ),
  CONSTRAINT documents_type_check CHECK (
    type IN ('invoice', 'ticket', 'receipt', 'credit_note', 'other')
  ),
  CONSTRAINT documents_direction_check CHECK (
    direction IN ('expense', 'income')
  )
);

-- Índices
CREATE INDEX idx_documents_business_id ON documents(business_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_hash_sha256 ON documents(hash_sha256);
CREATE INDEX idx_documents_uploaded_at ON documents(uploaded_at DESC);

-- RLS: acceso solo al propietario del negocio
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_business_owner"
  ON documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = documents.business_id
      AND b.owner_id = auth.uid()
    )
  );
```

---

### 3.4 `document_extractions`

Resultado del proceso OCR/IA. Inmutable — cada intento de extracción crea un nuevo registro.

```sql
CREATE TABLE document_extractions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id         UUID NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
  provider            TEXT NOT NULL,         -- 'mock' | 'google-document-ai' | 'aws-textract'
  model               TEXT,                  -- 'gemini-1.5-pro' | 'gpt-4o' | null si OCR puro
  prompt_version      TEXT,                  -- Versión del prompt usado
  extraction_version  TEXT NOT NULL,         -- Versión del extractor ('mock-v1', 'gdai-v2')
  raw_payload         JSONB NOT NULL,        -- Respuesta cruda del proveedor (COMPLETA)
  confidence          NUMERIC(4,3),          -- 0.000 - 1.000
  extracted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,  -- Solo una extracción activa por vez

  -- Campos extraídos (pueden estar NULL si no fueron detectados)
  extracted_date          DATE,
  extracted_supplier_name TEXT,
  extracted_supplier_nif  TEXT,
  extracted_invoice_number TEXT,
  extracted_base_amount   NUMERIC(12,2),
  extracted_vat_rate      NUMERIC(5,2),
  extracted_vat_amount    NUMERIC(12,2),
  extracted_total_amount  NUMERIC(12,2),
  extracted_currency      CHAR(3) DEFAULT 'EUR',
  extracted_description   TEXT,
  extraction_warnings     JSONB,             -- Campos con baja confianza, ambigüedades

  CONSTRAINT extractions_confidence_range CHECK (confidence BETWEEN 0 AND 1)
);

-- Índices
CREATE INDEX idx_doc_extractions_document_id ON document_extractions(document_id);
CREATE INDEX idx_doc_extractions_provider ON document_extractions(provider);
CREATE INDEX idx_doc_extractions_is_active ON document_extractions(is_active) WHERE is_active = TRUE;

-- RLS: heredado a través del documento
ALTER TABLE document_extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doc_extractions_business_owner"
  ON document_extractions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN businesses b ON b.id = d.business_id
      WHERE d.id = document_extractions.document_id
      AND b.owner_id = auth.uid()
    )
  );
```

---

### 3.5 `suppliers`

Proveedor de gastos. Normalizado para evitar duplicados.

```sql
CREATE TABLE suppliers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  name            TEXT NOT NULL,
  normalized_name TEXT NOT NULL,        -- Normalizado para búsqueda/dedup
  tax_id_masked   TEXT,                 -- NIF enmascarado (ej: 'B****678X')
  category        TEXT,                 -- 'alimentacion' | 'bebidas' | 'suministros' | etc.
  country         CHAR(2) DEFAULT 'ES',
  is_verified     BOOLEAN DEFAULT FALSE, -- Verificado manualmente por el usuario
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

-- Índices
CREATE INDEX idx_suppliers_business_id ON suppliers(business_id);
CREATE INDEX idx_suppliers_normalized_name ON suppliers(business_id, normalized_name);
CREATE UNIQUE INDEX idx_suppliers_tax_id_unique ON suppliers(business_id, tax_id_masked)
  WHERE tax_id_masked IS NOT NULL AND deleted_at IS NULL;

-- RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "suppliers_business_owner"
  ON suppliers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = suppliers.business_id
      AND b.owner_id = auth.uid()
    )
  );
```

---

### 3.6 `expenses`

Gasto estructurado y validado. Solo se crea cuando el documento está `CONFIRMED`.

```sql
CREATE TABLE expenses (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  document_id           UUID REFERENCES documents(id),          -- NULL si entrada manual
  supplier_id           UUID REFERENCES suppliers(id),
  date                  DATE NOT NULL,
  description           TEXT NOT NULL,
  base_amount           NUMERIC(12,2) NOT NULL,
  vat_rate              NUMERIC(5,2),                           -- 0, 4, 10, 21 (DEMO)
  vat_amount            NUMERIC(12,2),
  total_amount          NUMERIC(12,2) NOT NULL,
  currency              CHAR(3) NOT NULL DEFAULT 'EUR',
  category              TEXT NOT NULL,                          -- Ver categorías de hostelería
  subcategory           TEXT,
  deductibility_status  TEXT NOT NULL DEFAULT 'PENDING',       -- 'DEDUCTIBLE' | 'NON_DEDUCTIBLE' | 'PARTIAL' | 'PENDING'
  validation_status     TEXT NOT NULL DEFAULT 'PENDING',       -- 'VALIDATED' | 'PENDING' | 'FLAGGED'
  is_manually_entered   BOOLEAN NOT NULL DEFAULT FALSE,
  fiscal_period_year    INTEGER,                               -- Año fiscal (ej: 2026)
  fiscal_period_quarter INTEGER,                               -- Trimestre 1-4
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ,

  CONSTRAINT expenses_amounts_positive CHECK (base_amount >= 0 AND total_amount >= 0),
  CONSTRAINT expenses_vat_rate_valid CHECK (vat_rate IS NULL OR vat_rate >= 0),
  CONSTRAINT expenses_deductibility_check CHECK (
    deductibility_status IN ('DEDUCTIBLE', 'NON_DEDUCTIBLE', 'PARTIAL', 'PENDING')
  ),
  CONSTRAINT expenses_validation_check CHECK (
    validation_status IN ('VALIDATED', 'PENDING', 'FLAGGED')
  )
);

-- Índices
CREATE INDEX idx_expenses_business_id ON expenses(business_id);
CREATE INDEX idx_expenses_date ON expenses(date DESC);
CREATE INDEX idx_expenses_fiscal_period ON expenses(business_id, fiscal_period_year, fiscal_period_quarter);
CREATE INDEX idx_expenses_supplier_id ON expenses(supplier_id);
CREATE INDEX idx_expenses_document_id ON expenses(document_id);
CREATE INDEX idx_expenses_category ON expenses(business_id, category);

-- RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expenses_business_owner"
  ON expenses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = expenses.business_id
      AND b.owner_id = auth.uid()
    )
  );
```

**Categorías de gastos para hostelería:**

| Categoría | Descripción |
|---|---|
| `alimentacion` | Compras de comida y materia prima |
| `bebidas` | Bebidas y licores |
| `limpieza` | Productos de limpieza e higiene |
| `suministros` | Luz, agua, gas |
| `alquiler` | Alquiler del local |
| `mantenimiento` | Reparaciones y conservación |
| `personal` | Nóminas y Seguridad Social |
| `servicios_profesionales` | Gestoría, asesoría, abogado |
| `software` | Herramientas digitales |
| `material_oficina` | Papelería y consumibles |
| `marketing` | Publicidad y promoción |
| `transporte` | Combustible y transporte |
| `seguros` | Pólizas de seguro |
| `otros` | Gastos no clasificados |

---

### 3.7 `income`

Ingresos del negocio (ventas, servicios).

```sql
CREATE TABLE income (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  document_id           UUID REFERENCES documents(id),
  date                  DATE NOT NULL,
  description           TEXT NOT NULL,
  base_amount           NUMERIC(12,2) NOT NULL,
  vat_rate              NUMERIC(5,2),
  vat_amount            NUMERIC(12,2),
  total_amount          NUMERIC(12,2) NOT NULL,
  currency              CHAR(3) NOT NULL DEFAULT 'EUR',
  source                TEXT NOT NULL DEFAULT 'manual',   -- 'manual' | 'tpv' | 'online' | 'factura'
  category              TEXT,                             -- 'ventas_salon' | 'eventos' | 'delivery'
  fiscal_period_year    INTEGER,
  fiscal_period_quarter INTEGER,
  payment_method        TEXT,                             -- 'efectivo' | 'tarjeta' | 'transferencia'
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ,

  CONSTRAINT income_amounts_positive CHECK (base_amount >= 0 AND total_amount >= 0)
);

-- Índices
CREATE INDEX idx_income_business_id ON income(business_id);
CREATE INDEX idx_income_date ON income(date DESC);
CREATE INDEX idx_income_fiscal_period ON income(business_id, fiscal_period_year, fiscal_period_quarter);
CREATE INDEX idx_income_source ON income(business_id, source);

-- RLS
ALTER TABLE income ENABLE ROW LEVEL SECURITY;

CREATE POLICY "income_business_owner"
  ON income FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = income.business_id
      AND b.owner_id = auth.uid()
    )
  );
```

---

### 3.8 `tax_periods`

Periodo fiscal (trimestre o año) con su estado y versión de reglas.

```sql
CREATE TABLE tax_periods (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  year          INTEGER NOT NULL,
  period_type   TEXT NOT NULL DEFAULT 'quarterly',    -- 'quarterly' | 'annual'
  period_number INTEGER,                              -- 1-4 (trimestre) | NULL (anual)
  date_from     DATE NOT NULL,
  date_to       DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'OPEN',
  rules_version TEXT NOT NULL,                       -- Ej: 'DEMO_v1' | 'ES_RETA_2024_v1'
  closed_at     TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT tax_periods_status_check CHECK (
    status IN ('OPEN', 'CALCULATING', 'CALCULATED', 'SUBMITTED', 'CLOSED', 'AMENDED')
  ),
  CONSTRAINT tax_periods_type_check CHECK (
    period_type IN ('quarterly', 'annual')
  ),
  CONSTRAINT tax_periods_quarter_check CHECK (
    period_number IS NULL OR (period_number BETWEEN 1 AND 4)
  ),
  CONSTRAINT tax_periods_unique UNIQUE (business_id, year, period_type, period_number)
);

-- Índices
CREATE INDEX idx_tax_periods_business_id ON tax_periods(business_id);
CREATE INDEX idx_tax_periods_year ON tax_periods(business_id, year DESC);
CREATE INDEX idx_tax_periods_status ON tax_periods(status);

-- RLS
ALTER TABLE tax_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tax_periods_business_owner"
  ON tax_periods FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = tax_periods.business_id
      AND b.owner_id = auth.uid()
    )
  );
```

---

### 3.9 `tax_snapshots`

Resultado calculado del motor fiscal. **INMUTABLE** — nunca se modifica, se crea uno nuevo.

```sql
CREATE TABLE tax_snapshots (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  tax_period_id         UUID NOT NULL REFERENCES tax_periods(id) ON DELETE RESTRICT,
  calculated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  calculated_by         UUID REFERENCES auth.users(id),   -- NULL si fue automático
  trigger_source        TEXT NOT NULL,                     -- 'user' | 'system' | 'n8n'
  rules_version         TEXT NOT NULL,

  -- Resultados del cálculo
  vat_output            NUMERIC(12,2) NOT NULL,            -- IVA repercutido (ventas)
  vat_input             NUMERIC(12,2) NOT NULL,            -- IVA soportado (gastos deducibles)
  estimated_vat_balance NUMERIC(12,2) NOT NULL,            -- vat_output - vat_input

  -- Bases imponibles
  income_base           NUMERIC(12,2) NOT NULL,
  expenses_base         NUMERIC(12,2) NOT NULL,
  estimated_result      NUMERIC(12,2) NOT NULL,            -- income_base - expenses_base

  -- Completitud de datos
  data_completeness     NUMERIC(4,3) NOT NULL,             -- 0.000 - 1.000
  pending_documents     INTEGER NOT NULL DEFAULT 0,
  unreviewed_expenses   INTEGER NOT NULL DEFAULT 0,

  -- Metadatos de cálculo
  warnings              JSONB,                             -- Alertas del motor
  input_snapshot        JSONB NOT NULL,                    -- Snapshot de los datos usados
  is_latest             BOOLEAN NOT NULL DEFAULT TRUE,     -- Solo el más reciente es "latest"

  CONSTRAINT snapshots_completeness_range CHECK (data_completeness BETWEEN 0 AND 1),
  CONSTRAINT snapshots_vat_balance CHECK (
    estimated_vat_balance = vat_output - vat_input
  )
);

-- Índices
CREATE INDEX idx_tax_snapshots_business_id ON tax_snapshots(business_id);
CREATE INDEX idx_tax_snapshots_period_id ON tax_snapshots(tax_period_id);
CREATE INDEX idx_tax_snapshots_calculated_at ON tax_snapshots(calculated_at DESC);
CREATE INDEX idx_tax_snapshots_is_latest ON tax_snapshots(business_id, is_latest) WHERE is_latest = TRUE;

-- RLS
ALTER TABLE tax_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tax_snapshots_business_owner"
  ON tax_snapshots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = tax_snapshots.business_id
      AND b.owner_id = auth.uid()
    )
  );
```

---

### 3.10 `alerts`

Alertas generadas por el sistema de detección de anomalías.

```sql
CREATE TABLE alerts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  severity      TEXT NOT NULL,                  -- 'low' | 'medium' | 'high' | 'critical'
  type          TEXT NOT NULL,                  -- Ver tipos en §4
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  evidence      JSONB,                          -- Datos que evidencian la anomalía
  entity_type   TEXT,                           -- 'document' | 'expense' | 'supplier' | 'period'
  entity_id     UUID,                           -- ID de la entidad afectada
  source        TEXT NOT NULL,                  -- 'system' | 'n8n' | 'manual'
  status        TEXT NOT NULL DEFAULT 'OPEN',   -- 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED'
  dismissed_by  UUID REFERENCES auth.users(id),
  dismissed_at  TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT alerts_severity_check CHECK (
    severity IN ('low', 'medium', 'high', 'critical')
  ),
  CONSTRAINT alerts_status_check CHECK (
    status IN ('OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED')
  )
);

-- Índices
CREATE INDEX idx_alerts_business_id ON alerts(business_id);
CREATE INDEX idx_alerts_status ON alerts(business_id, status) WHERE status = 'OPEN';
CREATE INDEX idx_alerts_severity ON alerts(business_id, severity);
CREATE INDEX idx_alerts_entity ON alerts(entity_type, entity_id);
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);

-- RLS
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alerts_business_owner"
  ON alerts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = alerts.business_id
      AND b.owner_id = auth.uid()
    )
  );
```

**Tipos de alerta (`type`):**

| Tipo | Severidad por defecto | Descripción |
|---|---|---|
| `DUPLICATE_DOCUMENT` | high | Documento con hash duplicado |
| `MISSING_VAT_DATA` | medium | Factura sin datos de IVA |
| `UNUSUAL_VAT_RATIO` | medium | Ratio IVA inusual respecto a histórico |
| `MISSING_SUPPLIER` | low | Proveedor no identificado |
| `INVALID_DATE` | high | Fecha fuera del rango del periodo |
| `POSSIBLE_DUPLICATE_SUPPLIER` | low | Nombre de proveedor similar a existente |
| `MISSING_DOCUMENT` | medium | Gasto sin documento adjunto |
| `UNREVIEWED_EXPENSE` | low | Gasto sin confirmar en periodo próximo a cierre |
| `PERIOD_MISMATCH` | medium | Fecha del documento no coincide con periodo registrado |
| `UNUSUAL_EXPENSE` | medium | Gasto inusualmente alto respecto a histórico |

---

### 3.11 `audit_events`

Log de auditoría. **IMBORRABLES** — nunca se eliminan registros de auditoría.

```sql
CREATE TABLE audit_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id),          -- NULL para eventos de sistema global
  entity_type   TEXT NOT NULL,                           -- 'document' | 'expense' | 'tax_snapshot' | etc.
  entity_id     UUID,
  action        TEXT NOT NULL,                           -- Ver acciones en ARCHITECTURE.md §5.2
  actor_type    TEXT NOT NULL,                           -- 'user' | 'system' | 'n8n'
  actor_id      UUID REFERENCES auth.users(id),          -- NULL si es sistema
  metadata      JSONB,                                   -- Datos adicionales del evento
  previous_state JSONB,                                  -- Estado antes del cambio
  new_state     JSONB,                                   -- Estado después del cambio
  ip_address    INET,                                    -- Solo para acciones de usuario
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_audit_events_business_id ON audit_events(business_id);
CREATE INDEX idx_audit_events_entity ON audit_events(entity_type, entity_id);
CREATE INDEX idx_audit_events_actor ON audit_events(actor_id);
CREATE INDEX idx_audit_events_action ON audit_events(action);
CREATE INDEX idx_audit_events_created_at ON audit_events(created_at DESC);

-- RLS
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_events_select_owner"
  ON audit_events FOR SELECT
  USING (
    business_id IS NULL OR
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = audit_events.business_id
      AND b.owner_id = auth.uid()
    )
  );

-- Solo el sistema (service_role) puede insertar audit_events
CREATE POLICY "audit_events_insert_system"
  ON audit_events FOR INSERT
  WITH CHECK (TRUE);  -- La restricción real es a nivel de aplicación (solo service_role inserta)
```

---

## 4. Datos de DEMO — Constraints y Validaciones

Para el entorno DEMO, todas las tablas cuyos datos son ficticios deben satisfacer:

```sql
-- Función helper para verificar que un negocio es de DEMO
CREATE OR REPLACE FUNCTION is_demo_business(p_business_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM businesses
    WHERE id = p_business_id
    AND environment = 'DEMO'
    AND is_demo = TRUE
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

---

## 5. Resumen de Tablas y Relaciones

| Tabla | Clave Primaria | Relaciones clave | RLS |
|---|---|---|---|
| `profiles` | `id` → `auth.users.id` | — | ✅ por `auth.uid()` |
| `businesses` | `id` | `owner_id` → `auth.users.id` | ✅ por `owner_id` |
| `documents` | `id` | `business_id` | ✅ vía businesses |
| `document_extractions` | `id` | `document_id` | ✅ vía documents |
| `suppliers` | `id` | `business_id` | ✅ vía businesses |
| `expenses` | `id` | `business_id`, `document_id`, `supplier_id` | ✅ vía businesses |
| `income` | `id` | `business_id`, `document_id` | ✅ vía businesses |
| `tax_periods` | `id` | `business_id` | ✅ vía businesses |
| `tax_snapshots` | `id` | `business_id`, `tax_period_id` | ✅ vía businesses |
| `alerts` | `id` | `business_id` | ✅ vía businesses |
| `audit_events` | `id` | `business_id` | ✅ SELECT; INSERT solo service_role |

---

## 6. Consideraciones para Migración (Fase 1)

1. Cada migración tiene nombre con timestamp: `20261001_001_create_profiles.sql`
2. Las migraciones son **irreversibles** salvo rollback explícito planificado
3. Nunca hacer DROP COLUMN en producción sin verificar dependencias
4. Los índices de campos JSONB se añadirán en Fase 2 según los patrones de consulta reales
5. Se evitan triggers complejos; la lógica de negocio está en la aplicación
6. Se usarán funciones SQL mínimas y documentadas (tipo `is_demo_business`)

---

*Documento generado durante FASE 0. Las migraciones reales se crearán en Fase 1.*
