// web/src/lib/file-hash.ts
// Hash SHA-256 cliente para deteccion de duplicados pre-subida.
// El hash se calcula sobre el fichero optimizado (el mismo que va a Storage),
// asi coincide con lo almacenado y con futuras subidas del mismo original.

export async function sha256Hex(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
