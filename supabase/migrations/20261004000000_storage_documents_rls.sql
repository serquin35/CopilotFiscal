-- =============================================================================
-- MIGRACIÓN (SIN APLICAR): bucket `documents` privado + RLS por negocio
-- Fichero: supabase/migrations/20261004000000_storage_documents_rls.sql
-- Estado: PREPARADA, NO aplicada. Requiere confirmación explícita (tarea A4).
-- Previo obligatorio: snapshot de policies (ver STORAGE_MIGRATION_PLAN.md).
-- =============================================================================

-- 0. Cierre del bucket (rollback: update ... set public = true)
UPDATE storage.buckets SET public = false WHERE id = 'documents';

-- 1. Eliminar SOLO las SELECT amplias sobre este bucket (se registran en NOTICE).
--    Rollback: ver sección ROLLBACK al final (las recrea de forma genérica).
DO $$
DECLARE
  r RECORD;
  n INT := 0;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND cmd = 'SELECT'
      AND (qual ILIKE '%documents%' OR with_check ILIKE '%documents%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
    RAISE NOTICE 'DROP policy amplia: %', r.policyname;
    n := n + 1;
  END LOOP;
  IF n = 0 THEN
    RAISE NOTICE 'No se encontraron SELECT amplias sobre documents.';
  END IF;
END $$;

-- 2. Policies por negocio (solo authenticated; WITH CHECK en escritura).
--    La carpeta es el business_id: {business_id}/{document_id}.{ext}
--    Los objetos antiguos en RAÍZ (sin "/") NO matchean: solo service_role
--    hasta migrarlos con el script (A4).

DROP POLICY IF EXISTS "documents owner read" ON storage.objects;
CREATE POLICY "documents owner read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id::text = split_part(name, '/', 1)
        AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "documents owner insert" ON storage.objects;
CREATE POLICY "documents owner insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id::text = split_part(name, '/', 1)
        AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "documents owner update" ON storage.objects;
CREATE POLICY "documents owner update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id::text = split_part(name, '/', 1)
        AND b.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id::text = split_part(name, '/', 1)
        AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "documents owner delete" ON storage.objects;
CREATE POLICY "documents owner delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id::text = split_part(name, '/', 1)
        AND b.owner_id = auth.uid()
    )
  );

-- =============================================================================
-- ROLLBACK (solo si A4 sale mal; asumir ventana de exposición y avisar)
-- =============================================================================
-- UPDATE storage.buckets SET public = true WHERE id = 'documents';
-- DROP POLICY IF EXISTS "documents owner read" ON storage.objects;
-- DROP POLICY IF EXISTS "documents owner insert" ON storage.objects;
-- DROP POLICY IF EXISTS "documents owner update" ON storage.objects;
-- DROP POLICY IF EXISTS "documents owner delete" ON storage.objects;
-- -- Re-creación genérica de las amplias (sustituir <nombres> por el snapshot):
-- CREATE POLICY "<nombre_original_1>" ON storage.objects FOR SELECT USING (bucket_id = 'documents');
-- CREATE POLICY "<nombre_original_2>" ON storage.objects FOR SELECT USING (bucket_id = 'documents');
