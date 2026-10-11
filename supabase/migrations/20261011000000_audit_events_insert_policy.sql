-- =============================================================================
-- Migración: 20261011000000_audit_events_insert_policy.sql
-- Propósito: Blindar la política de inserción en public.audit_events.
-- Sustituye WITH CHECK (true) por verificación estricta de propiedad de negocio.
-- =============================================================================

-- 1. Eliminar política permisiva anterior
DROP POLICY IF EXISTS "audit_events_insert_authorized" ON public.audit_events;

-- 2. Crear política estricta de inserción
-- Un usuario autenticado solo puede registrar eventos si:
--   a) business_id es NULL (eventos a nivel de usuario/sesión), O
--   b) El business_id pertenece a un negocio donde es el owner_id.
CREATE POLICY "audit_events_insert_authorized" ON public.audit_events
  FOR INSERT TO authenticated
  WITH CHECK (
    business_id IS NULL OR 
    EXISTS (
      SELECT 1 FROM public.businesses b 
      WHERE b.id = audit_events.business_id 
        AND b.owner_id = auth.uid()
    )
  );

-- =============================================================================
-- ROLLBACK (en caso de emergencia):
-- DROP POLICY IF EXISTS "audit_events_insert_authorized" ON public.audit_events;
-- CREATE POLICY "audit_events_insert_authorized" ON public.audit_events
--   FOR INSERT TO authenticated WITH CHECK (true);
-- =============================================================================
