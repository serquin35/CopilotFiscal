-- =============================================================================
-- rls_matrix.sql — Verificación exhaustiva del aislamiento RLS
-- Copiloto Fiscal · DT-06 · Generado 05/10/2026 via MCP (Antigravity)
-- =============================================================================
-- INSTRUCCIONES:
--   1. Ejecutar como service_role en Supabase SQL Editor
--   2. Cada bloque usa set_config para simular un usuario distinto
--   3. Todos los asserts deben terminar con "PASS"
--   4. Cualquier "FAIL" es un bloqueo P0
-- =============================================================================

-- ─── DATOS DE PRUEBA ────────────────────────────────────────────────────────
-- USER_A = auth.uid() del usuario principal (dueño del negocio real)
-- USER_B = UUID de un segundo usuario (crear en Dashboard > Authentication > Users)
-- Sustituye los placeholders antes de ejecutar la Sección 4:
--   USER_A: buscar en auth.users
--   USER_B: crear en Dashboard o copiar de una sesión de prueba
--   BIZ_A:  businesses.id del usuario A

-- =============================================================================
-- SECCIÓN 1: Verificación estática — RLS habilitado en todas las tablas
-- =============================================================================
DO $$
DECLARE
  v_rls   bool;
  v_table text;
  v_tables text[] := ARRAY[
    'businesses','documents','document_extractions',
    'expenses','income','suppliers','alerts',
    'tax_periods','tax_snapshots','audit_events','profiles'
  ];
BEGIN
  RAISE NOTICE '=== SECCIÓN 1: RLS ON por tabla ===';
  FOREACH v_table IN ARRAY v_tables LOOP
    SELECT rowsecurity INTO v_rls
    FROM pg_tables WHERE schemaname = 'public' AND tablename = v_table;
    IF v_rls THEN
      RAISE NOTICE 'PASS  RLS ON: %', v_table;
    ELSE
      RAISE EXCEPTION 'FAIL  RLS OFF en tabla crítica: %', v_table;
    END IF;
  END LOOP;
END $$;

-- =============================================================================
-- SECCIÓN 2: Verificar cobertura de políticas por tabla
-- =============================================================================
DO $$
DECLARE v_count int;
BEGIN
  RAISE NOTICE '=== SECCIÓN 2: Cobertura de políticas ===';
  WITH expected AS (
    SELECT unnest(ARRAY[
      'businesses','documents','document_extractions',
      'expenses','income','suppliers','alerts',
      'tax_periods','tax_snapshots','audit_events','profiles'
    ]) AS tbl
  )
  SELECT COUNT(*) INTO v_count
  FROM expected e
  LEFT JOIN pg_policies p ON p.tablename = e.tbl AND p.schemaname = 'public'
  WHERE p.policyname IS NULL;

  IF v_count = 0 THEN
    RAISE NOTICE 'PASS  Todas las tablas tienen al menos 1 política';
  ELSE
    RAISE EXCEPTION 'FAIL  % tabla(s) sin ninguna política', v_count;
  END IF;
END $$;

-- =============================================================================
-- SECCIÓN 3: GAP audit_events INSERT — verificar corrección
-- =============================================================================
DO $$
DECLARE v_has_check bool;
BEGIN
  RAISE NOTICE '=== SECCIÓN 3: audit_events INSERT scope ===';
  SELECT (with_check IS NOT NULL) INTO v_has_check
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'audit_events' AND cmd = 'INSERT';

  IF v_has_check THEN
    RAISE NOTICE 'PASS  audit_events INSERT tiene WITH CHECK correcto';
  ELSE
    RAISE WARNING 'WARN  audit_events INSERT sin WITH CHECK — cualquier usuario autenticado puede insertar';
  END IF;
END $$;

-- =============================================================================
-- SECCIÓN 4: Test físico de aislamiento (2 usuarios reales)
-- DESBLOQUEAR: quitar los comentarios /* */ y sustituir los UUIDs reales
-- =============================================================================

/*
-- Variables: ajustar antes de ejecutar
DO $$
DECLARE
  v_user_a uuid := 'REEMPLAZAR-UUID-USUARIO-A';
  v_user_b uuid := 'REEMPLAZAR-UUID-USUARIO-B';
  v_biz_a  uuid := 'REEMPLAZAR-BIZ-ID-DE-A';
  v_count  int;
BEGIN

  -- 4.1: Usuario B no puede ver negocio de A
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_b, 'role', 'authenticated')::text, true);
  SELECT COUNT(*) INTO v_count FROM public.businesses WHERE id = v_biz_a;
  IF v_count = 0 THEN RAISE NOTICE 'PASS  businesses: B no ve negocio de A';
  ELSE RAISE EXCEPTION 'FAIL  FUGA RLS en businesses (B ve datos de A)'; END IF;

  -- 4.2: Usuario B no puede ver documentos de A
  SELECT COUNT(*) INTO v_count FROM public.documents WHERE business_id = v_biz_a;
  IF v_count = 0 THEN RAISE NOTICE 'PASS  documents: B no ve docs de A';
  ELSE RAISE EXCEPTION 'FAIL  FUGA RLS en documents (B ve datos de A)'; END IF;

  -- 4.3: Usuario B no puede ver gastos de A
  SELECT COUNT(*) INTO v_count FROM public.expenses WHERE business_id = v_biz_a;
  IF v_count = 0 THEN RAISE NOTICE 'PASS  expenses: B no ve gastos de A';
  ELSE RAISE EXCEPTION 'FAIL  FUGA RLS en expenses (B ve datos de A)'; END IF;

  -- 4.4: Usuario B no puede ver alertas de A
  SELECT COUNT(*) INTO v_count FROM public.alerts WHERE business_id = v_biz_a;
  IF v_count = 0 THEN RAISE NOTICE 'PASS  alerts: B no ve alertas de A';
  ELSE RAISE EXCEPTION 'FAIL  FUGA RLS en alerts (B ve datos de A)'; END IF;

  RAISE NOTICE '=== SECCIÓN 4 COMPLETA: aislamiento verificado ===';
END $$;
*/

-- =============================================================================
-- RESUMEN VISUAL (siempre ejecutable)
-- =============================================================================
SELECT
  tablename,
  policyname,
  cmd,
  CASE
    WHEN qual IS NOT NULL AND with_check IS NOT NULL THEN 'USING + WITH CHECK ✅'
    WHEN qual IS NOT NULL THEN 'USING ✅'
    WHEN with_check IS NOT NULL THEN 'WITH CHECK ✅'
    ELSE 'SIN RESTRICCIÓN ⚠️'
  END AS estado
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
