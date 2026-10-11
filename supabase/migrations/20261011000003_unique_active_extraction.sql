-- Migration: 20261011000003_unique_active_extraction.sql
-- Corrección C7: Restricción de una única extracción activa por documento

-- 1. Desactivar duplicados existentes conservando la extracción más reciente
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY document_id ORDER BY extracted_at DESC) as rn
  FROM public.document_extractions
  WHERE is_active = TRUE
)
UPDATE public.document_extractions
SET is_active = FALSE
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2. Trigger para desactivar automáticamente extracciones previas antes de insertar una nueva activa
CREATE OR REPLACE FUNCTION public.deactivate_previous_extractions()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = TRUE THEN
    UPDATE public.document_extractions
    SET is_active = FALSE
    WHERE document_id = NEW.document_id 
      AND is_active = TRUE 
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_deactivate_previous_extractions ON public.document_extractions;
CREATE TRIGGER trg_deactivate_previous_extractions
  BEFORE INSERT ON public.document_extractions
  FOR EACH ROW EXECUTE FUNCTION public.deactivate_previous_extractions();

-- 3. Crear índice único parcial para garantizar la restricción a nivel físico
CREATE UNIQUE INDEX IF NOT EXISTS uq_document_extractions_active
  ON public.document_extractions(document_id)
  WHERE is_active = TRUE;
