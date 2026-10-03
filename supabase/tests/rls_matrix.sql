-- ============================================================================
-- COPILOTO FISCAL - MATRIZ RLS EXHAUSTIVA POR TABLA (DT-06)
-- Uso: pegar en Supabase SQL Editor y ejecutar (rol postgres).
-- Parte A (estática): exige policy por tabla×comando con auth.uid().
-- Parte B (runtime): rol anon sin JWT debe ver 0 filas en negocio.
-- Parte C: instrucciones para el test de 2 usuarios con JWT (manual).
-- Cualquier fallo => RAISE EXCEPTION. No modifica datos.
-- ============================================================================

-- ── PARTE A: matriz tabla × comando ─────────────────────────────────────────
DO $$
DECLARE
  t TEXT;
  c TEXT;
  expected_tables TEXT[] := ARRAY[
    'profiles', 'businesses', 'documents', 'document_extractions',
    'suppliers', 'expenses', 'income', 'tax_periods',
    'tax_snapshots', 'alerts', 'audit_events'
  ];
  expected_cmds TEXT[] := ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE'];
  lacking TEXT[] := '{}';
BEGIN
  FOREACH t IN ARRAY expected_tables LOOP
    FOREACH c IN ARRAY expected_cmds LOOP
      -- audit_events: solo SELECT restringido + INSERT sistema (sin UPDATE/DELETE de app)
      IF t = 'audit_events' AND c IN ('UPDATE', 'DELETE') THEN
        CONTINUE;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = t
          AND (cmd = c OR cmd = 'ALL')
          AND (qual ILIKE '%auth.uid()%' OR with_check ILIKE '%auth.uid()%' OR roles::text ILIKE '%service_role%')
      ) THEN
        lacking := lacking || (t || '.' || c);
      END IF;
    END LOOP;
  END LOOP;

  IF array_length(lacking, 1) > 0 THEN
    RAISE EXCEPTION 'RLS MATRIX FAIL: sin policy con auth.uid() en %', array_to_string(lacking, ', ');
  END IF;
  RAISE NOTICE 'RLS MATRIX OK (parte A): cobertura tabla×comando con auth.uid().';
END $$;

-- ── PARTE B: sonda runtime como anon sin JWT ────────────────────────────────
-- RLS debe devolver 0 filas en todas las tablas de negocio.
DO $$
DECLARE
  t TEXT;
  n BIGINT;
  leaked TEXT[] := '{}';
  q TEXT;
BEGIN
  SET LOCAL role TO anon;
  FOREACH t IN ARRAY ARRAY[
    'businesses', 'documents', 'document_extractions', 'suppliers',
    'expenses', 'income', 'tax_periods', 'tax_snapshots', 'alerts'
  ] LOOP
    q := format('SELECT count(*) FROM public.%I', t);
    EXECUTE q INTO n;
    IF n > 0 THEN
      leaked := leaked || (t || '=' || n::text);
    END IF;
  END LOOP;
  RESET role;
  IF array_length(leaked, 1) > 0 THEN
    RAISE EXCEPTION 'RLS MATRIX FAIL (parte B): anon sin JWT ve filas en %', array_to_string(leaked, ', ');
  END IF;
  RAISE NOTICE 'RLS MATRIX OK (parte B): anon sin JWT ve 0 filas.';
END $$;

-- ── PARTE C: test de 2 usuarios con JWT (manual, 5 min) ─────────────────────
-- 1. Crea 2 usuarios de prueba (Auth > Users > Invite) y anota sus JWT
--    (login en la app con cada uno, copia access_token de la cookie/sesión).
-- 2. Con psql o un script, fija `SET request.jwt.claim.sub = '<userA>'` y
--    comprueba: SELECT en expenses/documents del negocio B devuelve 0 filas,
--    e INSERT con business_id de B falla por policy.
-- 3. Repite con userB. Si algo devuelve >0 filas, hay fuga multi-tenant.
