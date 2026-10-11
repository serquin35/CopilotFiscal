-- Migration: 20261011000002_security_definer_functions.sql
-- Corrección C12: Asegurar funciones SECURITY DEFINER fijando search_path
-- Evita vulnerabilidades de secuestro de ruta de búsqueda (Search Path Hijacking)

-- 1. handle_new_user
ALTER FUNCTION public.handle_new_user() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon;

-- 2. is_demo_business
ALTER FUNCTION public.is_demo_business(uuid) SET search_path = public;

-- 3. update_updated_at_column
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
