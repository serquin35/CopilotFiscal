-- Migration: 20261001000000_businesses_fiscal_fields.sql
-- Documenta las columnas añadidas a mano el 01/10/2026 (DT-22)
-- Aplicadas directamente en Supabase Dashboard sin migración versionada.
-- Este fichero reproduce el estado real; usa IF NOT EXISTS para ser idempotente.

-- businesses: 7 columnas fiscales añadidas (verificado via MCP 05/10/2026)
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS nif             text,
  ADD COLUMN IF NOT EXISTS vat_regime      text DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS fiscal_address  text,
  ADD COLUMN IF NOT EXISTS fiscal_city     text,
  ADD COLUMN IF NOT EXISTS fiscal_zip      text,
  ADD COLUMN IF NOT EXISTS phone           text,
  ADD COLUMN IF NOT EXISTS website         text;

-- profiles: 1 columna añadida (verificado via MCP 05/10/2026)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text;

-- Comentario de auditoría
COMMENT ON COLUMN public.businesses.nif            IS 'NIF/CIF del negocio. Validado con NifValidator.';
COMMENT ON COLUMN public.businesses.vat_regime     IS 'Régimen IVA: general | simplificado | recargo_equivalencia';
COMMENT ON COLUMN public.businesses.fiscal_address IS 'Domicilio fiscal (calle y número)';
COMMENT ON COLUMN public.businesses.fiscal_city    IS 'Ciudad del domicilio fiscal';
COMMENT ON COLUMN public.businesses.fiscal_zip     IS 'Código postal del domicilio fiscal';
COMMENT ON COLUMN public.businesses.phone          IS 'Teléfono de contacto del negocio';
COMMENT ON COLUMN public.businesses.website        IS 'Sitio web del negocio';
COMMENT ON COLUMN public.profiles.phone            IS 'Teléfono personal del usuario';
