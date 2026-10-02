-- ============================================================================
-- COPILOTO FISCAL - TEST DE HUMO RLS (DT-06)
-- Uso: pegar en Supabase SQL Editor y ejecutar (rol postgres).
-- Falla con RAISE EXCEPTION si alguna tabla de negocio queda sin RLS
-- o sin policies. No modifica datos.
-- ============================================================================

DO $$
DECLARE
  t TEXT;
  missing_rls TEXT[] := '{}';
  missing_policy TEXT[] := '{}';
  expected TEXT[] := ARRAY[
    'profiles', 'businesses', 'documents', 'document_extractions',
    'suppliers', 'expenses', 'income', 'tax_periods',
    'tax_snapshots', 'alerts', 'audit_events'
  ];
BEGIN
  FOREACH t IN ARRAY expected LOOP
    -- 1. Existe la tabla
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t
    ) THEN
      RAISE EXCEPTION 'RLS SMOKE FAIL: falta la tabla public.%', t;
    END IF;

    -- 2. RLS activado
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public' AND tablename = t AND rowsecurity = true
    ) THEN
      missing_rls := missing_rls || t;
    END IF;

    -- 3. Al menos una policy
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t
    ) THEN
      missing_policy := missing_policy || t;
    END IF;
  END LOOP;

  IF array_length(missing_rls, 1) > 0 THEN
    RAISE EXCEPTION 'RLS SMOKE FAIL: sin RLS en %', array_to_string(missing_rls, ', ');
  END IF;

  IF array_length(missing_policy, 1) > 0 THEN
    RAISE EXCEPTION 'RLS SMOKE FAIL: sin policies en %', array_to_string(missing_policy, ', ');
  END IF;

  RAISE NOTICE 'RLS SMOKE OK: 11 tablas con RLS + policies.';
END $$;

-- 4. Aislamiento por negocio: ningún gasto/apunte debe colgar del UUID cero
-- (las semillas demo históricas usan UUID cero; los inserts de app lo tienen
-- prohibido desde el fix de duplicados). Revisar, no falla.
SELECT business_id, count(*) AS n
FROM expenses
GROUP BY 1
ORDER BY 2 DESC;

-- 5. Bucket documents: debe ser privado o con URLs firmadas (aviso, no fallo).
SELECT name, public FROM storage.buckets WHERE name = 'documents';
