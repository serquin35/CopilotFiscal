-- Migration: 20261001000001_realtime_documents.sql
-- Documenta la activación de Realtime en la tabla documents (DT-22)
-- Se activó desde el Dashboard de Supabase el 01/10/2026.
-- Supabase gestiona Realtime internamente; esta migración es solo documental.
-- Si se replica el entorno desde cero, activar Realtime manualmente en:
--   Dashboard > Database > Replication > Supabase Realtime > documents ✓

-- No hay SQL ejecutable para activar Realtime via migración en Supabase Cloud.
-- En self-hosted se haría: ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;
-- En Cloud, el Dashboard lo gestiona a través de la extensión pg_publication interna.

-- Verificar estado actual:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'documents';

DO $$
BEGIN
  RAISE NOTICE 'NOTA: Realtime en tabla documents activado via Dashboard 01/10/2026. Sin acción SQL necesaria en Supabase Cloud.';
END $$;
