-- ==============================================================================
-- COPILOTO FISCAL - MIGRACIÓN INICIAL COMPLETA (FASE 1)
-- ==============================================================================
-- Fecha: 30 de Septiembre de 2026
-- Descripción:
--   1. Extensiones necesarias
--   2. Funciones de utilidad (updated_at, is_demo_business)
--   3. Tablas maestras y de negocio (profiles, businesses, documents,
--      document_extractions, suppliers, expenses, income, tax_periods,
--      tax_snapshots, alerts, audit_events)
--   4. Índices para rendimiento en búsquedas y reporting
--   5. Políticas de Row Level Security (RLS) estrictas
--   6. Triggers automáticos y configuración de Supabase Storage
-- ==============================================================================

-- 1. Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Función helper para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. TABLAS
-- ==============================================================================

-- 3.1 PROFILES (Extensión de auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT,
  email         TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sincronización automática de nuevo usuario registrado en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 3.2 BUSINESSES (Entidad raíz multi-tenant)
CREATE TABLE IF NOT EXISTS public.businesses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  name          TEXT NOT NULL,
  legal_form    TEXT NOT NULL,              -- 'autonomo' | 'sl' | 'sa'
  activity_type TEXT NOT NULL,             -- 'hosteleria' | 'comercio' | etc.
  cnae_code     TEXT,                      -- Código CNAE (ej: '5610')
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

CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON public.businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_environment ON public.businesses(environment);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "businesses_select_owner" ON public.businesses;
CREATE POLICY "businesses_select_owner"
  ON public.businesses FOR SELECT
  USING (auth.uid() = owner_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "businesses_insert_owner" ON public.businesses;
CREATE POLICY "businesses_insert_owner"
  ON public.businesses FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "businesses_update_owner" ON public.businesses;
CREATE POLICY "businesses_update_owner"
  ON public.businesses FOR UPDATE
  USING (auth.uid() = owner_id);

DROP TRIGGER IF EXISTS trg_businesses_updated_at ON public.businesses;
CREATE TRIGGER trg_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- 3.3 DOCUMENTS (Documento original subido: factura, ticket)
CREATE TABLE IF NOT EXISTS public.documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
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
  notes             TEXT,
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

CREATE INDEX IF NOT EXISTS idx_documents_business_id ON public.documents(business_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_hash_sha256 ON public.documents(hash_sha256);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON public.documents(uploaded_at DESC);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_business_owner" ON public.documents;
CREATE POLICY "documents_business_owner"
  ON public.documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = documents.business_id
      AND b.owner_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS trg_documents_updated_at ON public.documents;
CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- 3.4 DOCUMENT_EXTRACTIONS (Inmutable - cada intento de extracción OCR/IA)
CREATE TABLE IF NOT EXISTS public.document_extractions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id         UUID NOT NULL REFERENCES public.documents(id) ON DELETE RESTRICT,
  provider            TEXT NOT NULL,         -- 'mock' | 'openai-vision' | 'pdf-parse' | 'tesseract'
  model               TEXT,                  -- 'gpt-4o' | 'gpt-4o-mini' | null
  prompt_version      TEXT,                  -- Versión del prompt usado
  extraction_version  TEXT NOT NULL,         -- Versión del extractor ('v1', 'v2')
  raw_payload         JSONB NOT NULL,        -- Respuesta cruda del proveedor
  confidence          NUMERIC(4,3),          -- 0.000 - 1.000
  extracted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,

  -- Campos extraídos estructurados
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
  extraction_warnings     JSONB,

  CONSTRAINT extractions_confidence_range CHECK (confidence IS NULL OR (confidence BETWEEN 0 AND 1))
);

CREATE INDEX IF NOT EXISTS idx_doc_extractions_document_id ON public.document_extractions(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_extractions_provider ON public.document_extractions(provider);
CREATE INDEX IF NOT EXISTS idx_doc_extractions_is_active ON public.document_extractions(is_active) WHERE is_active = TRUE;

ALTER TABLE public.document_extractions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doc_extractions_business_owner" ON public.document_extractions;
CREATE POLICY "doc_extractions_business_owner"
  ON public.document_extractions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.businesses b ON b.id = d.business_id
      WHERE d.id = document_extractions.document_id
      AND b.owner_id = auth.uid()
    )
  );


-- 3.5 SUPPLIERS (Proveedores normalizados)
CREATE TABLE IF NOT EXISTS public.suppliers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  name            TEXT NOT NULL,
  normalized_name TEXT NOT NULL,        -- Normalizado para búsqueda/dedup
  tax_id_masked   TEXT,                 -- NIF enmascarado (ej: 'B****678X')
  category        TEXT,                 -- 'alimentacion' | 'bebidas' | 'suministros' | etc.
  country         CHAR(2) DEFAULT 'ES',
  is_verified     BOOLEAN DEFAULT FALSE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_suppliers_business_id ON public.suppliers(business_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_normalized_name ON public.suppliers(business_id, normalized_name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_tax_id_unique ON public.suppliers(business_id, tax_id_masked)
  WHERE tax_id_masked IS NOT NULL AND deleted_at IS NULL;

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "suppliers_business_owner" ON public.suppliers;
CREATE POLICY "suppliers_business_owner"
  ON public.suppliers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = suppliers.business_id
      AND b.owner_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS trg_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER trg_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- 3.6 EXPENSES (Gastos estructurados y clasificados)
CREATE TABLE IF NOT EXISTS public.expenses (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  document_id           UUID REFERENCES public.documents(id),
  supplier_id           UUID REFERENCES public.suppliers(id),
  date                  DATE NOT NULL,
  description           TEXT NOT NULL,
  base_amount           NUMERIC(12,2) NOT NULL,
  vat_rate              NUMERIC(5,2),
  vat_amount            NUMERIC(12,2),
  total_amount          NUMERIC(12,2) NOT NULL,
  currency              CHAR(3) NOT NULL DEFAULT 'EUR',
  category              TEXT NOT NULL,
  subcategory           TEXT,
  deductibility_status  TEXT NOT NULL DEFAULT 'PENDING',       -- 'DEDUCTIBLE' | 'NON_DEDUCTIBLE' | 'PARTIAL' | 'PENDING'
  validation_status     TEXT NOT NULL DEFAULT 'PENDING',       -- 'VALIDATED' | 'PENDING' | 'FLAGGED'
  is_manually_entered   BOOLEAN NOT NULL DEFAULT FALSE,
  fiscal_period_year    INTEGER,
  fiscal_period_quarter INTEGER,
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

CREATE INDEX IF NOT EXISTS idx_expenses_business_id ON public.expenses(business_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_fiscal_period ON public.expenses(business_id, fiscal_period_year, fiscal_period_quarter);
CREATE INDEX IF NOT EXISTS idx_expenses_supplier_id ON public.expenses(supplier_id);
CREATE INDEX IF NOT EXISTS idx_expenses_document_id ON public.expenses(document_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(business_id, category);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expenses_business_owner" ON public.expenses;
CREATE POLICY "expenses_business_owner"
  ON public.expenses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = expenses.business_id
      AND b.owner_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS trg_expenses_updated_at ON public.expenses;
CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- 3.7 INCOME (Ingresos)
CREATE TABLE IF NOT EXISTS public.income (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  document_id           UUID REFERENCES public.documents(id),
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

CREATE INDEX IF NOT EXISTS idx_income_business_id ON public.income(business_id);
CREATE INDEX IF NOT EXISTS idx_income_date ON public.income(date DESC);
CREATE INDEX IF NOT EXISTS idx_income_fiscal_period ON public.income(business_id, fiscal_period_year, fiscal_period_quarter);
CREATE INDEX IF NOT EXISTS idx_income_source ON public.income(business_id, source);

ALTER TABLE public.income ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "income_business_owner" ON public.income;
CREATE POLICY "income_business_owner"
  ON public.income FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = income.business_id
      AND b.owner_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS trg_income_updated_at ON public.income;
CREATE TRIGGER trg_income_updated_at
  BEFORE UPDATE ON public.income
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- 3.8 TAX_PERIODS (Trimestres y Años fiscales)
CREATE TABLE IF NOT EXISTS public.tax_periods (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
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

CREATE INDEX IF NOT EXISTS idx_tax_periods_business_id ON public.tax_periods(business_id);
CREATE INDEX IF NOT EXISTS idx_tax_periods_year ON public.tax_periods(business_id, year DESC);
CREATE INDEX IF NOT EXISTS idx_tax_periods_status ON public.tax_periods(status);

ALTER TABLE public.tax_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tax_periods_business_owner" ON public.tax_periods;
CREATE POLICY "tax_periods_business_owner"
  ON public.tax_periods FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = tax_periods.business_id
      AND b.owner_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS trg_tax_periods_updated_at ON public.tax_periods;
CREATE TRIGGER trg_tax_periods_updated_at
  BEFORE UPDATE ON public.tax_periods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- 3.9 TAX_SNAPSHOTS (Inmutables - Resultados calculados de impuestos)
CREATE TABLE IF NOT EXISTS public.tax_snapshots (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  tax_period_id         UUID NOT NULL REFERENCES public.tax_periods(id) ON DELETE RESTRICT,
  calculated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  calculated_by         UUID REFERENCES auth.users(id),
  trigger_source        TEXT NOT NULL,                     -- 'user' | 'system' | 'n8n'
  rules_version         TEXT NOT NULL,

  -- Resultados de cálculo
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

  -- Metadatos y explicabilidad
  warnings              JSONB,
  input_snapshot        JSONB NOT NULL,
  is_latest             BOOLEAN NOT NULL DEFAULT TRUE,

  CONSTRAINT snapshots_completeness_range CHECK (data_completeness BETWEEN 0 AND 1),
  CONSTRAINT snapshots_vat_balance CHECK (
    estimated_vat_balance = vat_output - vat_input
  )
);

CREATE INDEX IF NOT EXISTS idx_tax_snapshots_business_id ON public.tax_snapshots(business_id);
CREATE INDEX IF NOT EXISTS idx_tax_snapshots_period_id ON public.tax_snapshots(tax_period_id);
CREATE INDEX IF NOT EXISTS idx_tax_snapshots_calculated_at ON public.tax_snapshots(calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tax_snapshots_is_latest ON public.tax_snapshots(business_id, is_latest) WHERE is_latest = TRUE;

ALTER TABLE public.tax_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tax_snapshots_business_owner" ON public.tax_snapshots;
CREATE POLICY "tax_snapshots_business_owner"
  ON public.tax_snapshots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = tax_snapshots.business_id
      AND b.owner_id = auth.uid()
    )
  );


-- 3.10 ALERTS (Alertas de anomalías y fiscalidad)
CREATE TABLE IF NOT EXISTS public.alerts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  severity      TEXT NOT NULL,                  -- 'low' | 'medium' | 'high' | 'critical'
  type          TEXT NOT NULL,                  -- 'DUPLICATE_DOCUMENT', 'MISSING_VAT_DATA', etc.
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  evidence      JSONB,
  entity_type   TEXT,                           -- 'document' | 'expense' | 'supplier' | 'period'
  entity_id     UUID,
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

CREATE INDEX IF NOT EXISTS idx_alerts_business_id ON public.alerts(business_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts(business_id, status) WHERE status = 'OPEN';
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON public.alerts(business_id, severity);
CREATE INDEX IF NOT EXISTS idx_alerts_entity ON public.alerts(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts(created_at DESC);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alerts_business_owner" ON public.alerts;
CREATE POLICY "alerts_business_owner"
  ON public.alerts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = alerts.business_id
      AND b.owner_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS trg_alerts_updated_at ON public.alerts;
CREATE TRIGGER trg_alerts_updated_at
  BEFORE UPDATE ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- 3.11 AUDIT_EVENTS (Log de auditoría inmutable e imborrable)
CREATE TABLE IF NOT EXISTS public.audit_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    UUID REFERENCES public.businesses(id),
  entity_type    TEXT NOT NULL,
  entity_id      UUID,
  action         TEXT NOT NULL,
  actor_type     TEXT NOT NULL,                  -- 'user' | 'system' | 'n8n'
  actor_id       UUID REFERENCES auth.users(id),
  metadata       JSONB,
  previous_state JSONB,
  new_state      JSONB,
  ip_address     INET,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_business_id ON public.audit_events(business_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON public.audit_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON public.audit_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_action ON public.audit_events(action);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON public.audit_events(created_at DESC);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_events_select_owner" ON public.audit_events;
CREATE POLICY "audit_events_select_owner"
  ON public.audit_events FOR SELECT
  USING (
    business_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = audit_events.business_id
      AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "audit_events_insert_authorized" ON public.audit_events;
CREATE POLICY "audit_events_insert_authorized"
  ON public.audit_events FOR INSERT
  WITH CHECK (TRUE);


-- ==============================================================================
-- 4. HELPER FUNCTIONS
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.is_demo_business(p_business_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id = p_business_id
    AND environment = 'DEMO'
    AND is_demo = TRUE
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;


-- ==============================================================================
-- 5. STORAGE BUCKET (Facturas y justificantes)
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS en Storage
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "Authenticated users can view own documents" ON storage.objects;
CREATE POLICY "Authenticated users can view own documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'documents');
