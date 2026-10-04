-- =============================================================================
-- MIGRACIÓN (SIN APLICAR): bucket `documents` privado + RLS por negocio
-- Fichero: supabase/migrations/20261004000000_storage_documents_rls.sql
-- Estado: PREPARADA, NO aplicada. Requiere confirmación explícita (tarea A4).
-- Previo obligatorio: snapshot de policies (ver STORAGE_MIGRATION_PLAN.md).
-- Corrección 04/10/2026: referencia cualificada storage.objects.name
-- (sin cualificar, Postgres la enlazaba a businesses.name y denegaba todo).
-- =============================================================================

-- 0. Cierre del bucket (rollback: update ... set public = true)
UPDATE storage.buckets SET public = false WHERE id = 'documents';

-- 1. Eliminar las policies amplias sobre este bucket (snapshot 04/10/2026).
--    Nombres exactos verificados en pg_policies (NO tocar las de `avatars`).
DROP POLICY IF EXISTS "Public Access to Documents Bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view own documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;

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
      WHERE b.id::text = split_part(storage.objects.name, '/', 1)
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
      WHERE b.id::text = split_part(storage.objects.name, '/', 1)
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
      WHERE b.id::text = split_part(storage.objects.name, '/', 1)
        AND b.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id::text = split_part(storage.objects.name, '/', 1)
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
      WHERE b.id::text = split_part(storage.objects.name, '/', 1)
        AND b.owner_id = auth.uid()
    )
  );

-- =============================================================================
-- ROLLBACK (solo si A4 sale mal; asumir ventana de exposición y avisar)
-- Recrea las policies originales EXACTAS del snapshot 04/10/2026.
-- =============================================================================
-- UPDATE storage.buckets SET public = true WHERE id = 'documents';
-- DROP POLICY IF EXISTS "documents owner read" ON storage.objects;
-- DROP POLICY IF EXISTS "documents owner insert" ON storage.objects;
-- DROP POLICY IF EXISTS "documents owner update" ON storage.objects;
-- DROP POLICY IF EXISTS "documents owner delete" ON storage.objects;
-- CREATE POLICY "Public Access to Documents Bucket" ON storage.objects
--   FOR ALL USING (bucket_id = 'documents') WITH CHECK (bucket_id = 'documents');
-- CREATE POLICY "Authenticated users can view own documents" ON storage.objects
--   FOR SELECT USING (bucket_id = 'documents');
-- CREATE POLICY "Authenticated users can upload documents" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'documents');
