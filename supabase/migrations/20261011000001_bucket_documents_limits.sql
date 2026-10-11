-- =============================================================================
-- Migración: 20261011000001_bucket_documents_limits.sql
-- Propósito: Configurar límites físicos de tamaño y tipos MIME en el bucket 'documents'
-- =============================================================================

UPDATE storage.buckets
SET 
  file_size_limit = 20971520, -- 20 MB (límite máximo permitido por documento)
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
WHERE id = 'documents';

-- =============================================================================
-- ROLLBACK (en caso de emergencia):
-- UPDATE storage.buckets
-- SET file_size_limit = NULL, allowed_mime_types = NULL
-- WHERE id = 'documents';
-- =============================================================================
