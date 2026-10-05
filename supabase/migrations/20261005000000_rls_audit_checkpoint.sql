-- Migration: 20261005000000_rls_audit_fix_and_matrix.sql
-- DT-06: Documenta el estado RLS verificado el 05/10/2026 via MCP (Antigravity)
-- Todas las políticas ya estaban aplicadas en BD.
-- Este fichero es la referencia auditada del estado RLS final del MVP.

-- RESULTADO DE LA AUDITORÍA (05/10/2026):
-- ✅ 11 tablas con RLS habilitado
-- ✅ 15 políticas — todas con USING y/o WITH CHECK
-- ✅ Patrón uniforme: EXISTS(SELECT 1 FROM businesses b WHERE b.owner_id = auth.uid())
-- ✅ audit_events INSERT ya tenía WITH CHECK (corregido antes de esta sesión)
-- ✅ profiles: SELECT y UPDATE propios; INSERT vía trigger auth (correcto)

-- GAPS PENDIENTES (no bloqueantes, para Sprint 2):
-- 1. Test físico con 2 usuarios reales (Sección 4 de rls_matrix.sql)
-- 2. businesses: no tiene política DELETE (soft-delete con deleted_at, es intencionado)
-- 3. profiles: no tiene política INSERT (se inserta vía trigger auth, correcto)

-- Este fichero sirve de checkpoint. Si en el futuro se añade una tabla
-- con datos de negocio, DEBE seguir el patrón:
--
--   CREATE POLICY "tabla_business_owner" ON public.nueva_tabla
--     USING (EXISTS (
--       SELECT 1 FROM businesses b
--       WHERE b.id = nueva_tabla.business_id
--         AND b.owner_id = auth.uid()
--     ));

-- Idempotente: no ejecuta cambios, solo verifica el estado esperado.
DO $$
DECLARE v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_tables
  WHERE schemaname = 'public' AND rowsecurity = true;

  IF v_count >= 11 THEN
    RAISE NOTICE 'RLS_AUDIT OK: % tablas con RLS habilitado', v_count;
  ELSE
    RAISE EXCEPTION 'RLS_AUDIT FAIL: solo % tablas con RLS (se esperan >= 11)', v_count;
  END IF;
END $$;
