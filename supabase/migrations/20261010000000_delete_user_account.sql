-- Migration: 20261010000000_delete_user_account.sql
-- Función transaccional atómica para permitir a un usuario eliminar su cuenta y todos sus datos asociados

CREATE OR REPLACE FUNCTION public.delete_user_account(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_biz_id UUID;
BEGIN
  -- 1. Verificación de seguridad: solo el propio usuario autenticado o service_role pueden ejecutar esto
  IF auth.uid() IS DISTINCT FROM p_user_id AND auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'No autorizado para eliminar esta cuenta';
  END IF;

  -- 2. Proteger la cuenta institucional de demostración
  IF p_user_id = '00000000-0000-0000-0000-000000000001'::uuid THEN
    RAISE EXCEPTION 'La cuenta DEMO institucional no puede eliminarse';
  END IF;

  -- 3. Borrado en cascada ordenado por dependencias de clave foránea (FK)
  FOR v_biz_id IN (SELECT id FROM public.businesses WHERE owner_id = p_user_id) LOOP
    -- Extracciones de documentos vinculados a este negocio
    DELETE FROM public.document_extractions 
    WHERE document_id IN (SELECT id FROM public.documents WHERE business_id = v_biz_id);
    
    -- Gastos e ingresos
    DELETE FROM public.expenses WHERE business_id = v_biz_id;
    DELETE FROM public.income WHERE business_id = v_biz_id;
    
    -- Documentos en base de datos
    DELETE FROM public.documents WHERE business_id = v_biz_id;
    
    -- Proveedores
    DELETE FROM public.suppliers WHERE business_id = v_biz_id;
    
    -- Snapshots y periodos fiscales
    DELETE FROM public.tax_snapshots WHERE business_id = v_biz_id;
    DELETE FROM public.tax_periods WHERE business_id = v_biz_id;
    
    -- Alertas
    DELETE FROM public.alerts WHERE business_id = v_biz_id;
    
    -- Eventos de auditoría asociados al negocio
    DELETE FROM public.audit_events WHERE business_id = v_biz_id;
      
    -- Borrar el negocio
    DELETE FROM public.businesses WHERE id = v_biz_id;
  END LOOP;

  -- 4. Limpiar referencias residuales del usuario en auditorías o subidas
  UPDATE public.documents SET uploaded_by = NULL WHERE uploaded_by = p_user_id;
  UPDATE public.tax_snapshots SET calculated_by = NULL WHERE calculated_by = p_user_id;
  UPDATE public.alerts SET dismissed_by = NULL WHERE dismissed_by = p_user_id;
  DELETE FROM public.audit_events WHERE actor_id = p_user_id;

  -- 5. Borrar perfil de usuario
  DELETE FROM public.profiles WHERE id = p_user_id;

  -- 6. Borrar usuario en auth.users (cascada de sesiones e identidades de Supabase Auth)
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

-- Permisos estrictos: solo usuarios autenticados y backend service_role
REVOKE ALL ON FUNCTION public.delete_user_account(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_user_account(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_user_account(UUID) TO authenticated, service_role;
