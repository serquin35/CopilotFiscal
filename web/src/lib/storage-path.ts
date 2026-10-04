// web/src/lib/storage-path.ts
// Convención de rutas de Storage (ADR-11): {business_id}/{document_id}.{ext}
// ext sale del MIME validado, NUNCA del nombre del usuario.

const MIME_TO_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

export function extensionForMime(mime: string | null | undefined): string | null {
  if (!mime) return null;
  return MIME_TO_EXT[mime.toLowerCase().split(";")[0].trim()] ?? null;
}

export function buildStoragePath(
  businessId: string,
  documentId: string,
  mime: string
): string {
  if (!businessId || businessId.includes("/") || businessId.includes("..")) {
    throw new Error("businessId no válido para ruta de Storage.");
  }
  if (!documentId || documentId.includes("/") || documentId.includes("..")) {
    throw new Error("documentId no válido para ruta de Storage.");
  }
  const ext = extensionForMime(mime);
  if (!ext) {
    throw new Error(`MIME no admitido para Storage: "${mime}".`);
  }
  return `${businessId}/${documentId}.${ext}`;
}

/** Rutas antiguas (raíz del bucket, sin carpeta de negocio). Se sirven tal
 *  cual con URL firmada hasta la migración de archivos (A4). */
export function isLegacyRootPath(storagePath: string | null | undefined): boolean {
  if (!storagePath) return false;
  return !storagePath.includes("/");
}
