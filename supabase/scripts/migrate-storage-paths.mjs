// supabase/scripts/migrate-storage-paths.mjs
// Migra objetos antiguos (raíz del bucket) a {business_id}/{document_id}.{ext}.
// SOLO lectura por defecto (dry-run). Copia, NUNCA mueve; el borrado de
// originales es un paso SEPARADO (--delete-originals) tras verificar A4.
// Uso:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node migrate-storage-paths.mjs [--apply] [--delete-originals]
// Sin --apply: lista lo que haría. Sin --delete-originals: no borra nada.
// Requiere confirmación explícita del dueño antes de --apply en producción.

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APPLY = process.argv.includes("--apply");
const DELETE_ORIGINALS = process.argv.includes("--delete-originals");

if (!URL || !KEY) {
  console.error("Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en entorno. Nada que hacer.");
  process.exit(2);
}
if (DELETE_ORIGINALS && !APPLY) {
  console.error("--delete-originals exige --apply. Nada que hacer.");
  process.exit(2);
}

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const MIME_EXT = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

async function rest(path, opts = {}) {
  const r = await fetch(`${URL}/rest/v1/${path}`, { headers: H, ...opts });
  if (!r.ok) throw new Error(`REST ${path}: HTTP ${r.status}`);
  return r.json();
}
async function storage(path, body, method = "POST") {
  const r = await fetch(`${URL}/storage/v1/${path}`, {
    method,
    headers: H,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Storage ${path}: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

const docs = await rest("documents?select=id,business_id,storage_path,mime_type,original_filename");
const cands = docs.filter((d) => d.storage_path && !String(d.storage_path).includes("/"));
console.log(`Documentos totales: ${docs.length}. Con ruta antigua (raíz): ${cands.length}.`);

const plan = [];
for (const d of cands) {
  const ext = MIME_EXT[String(d.mime_type || "").toLowerCase()] || "pdf";
  plan.push({
    id: d.id,
    business_id: d.business_id,
    oldPath: d.storage_path,
    newPath: `${d.business_id}/${d.id}.${ext}`,
  });
}
for (const p of plan) console.log(`  ${p.oldPath}  ->  ${p.newPath}`);

const backupName = `storage-migration-backup-${new Date().toISOString().slice(0, 10)}.csv`;
if (!APPLY) {
  console.log(`\nDRY-RUN: no se ha modificado nada. Con --apply se copiaría y actualizaría storage_path (backup: ${backupName}).`);
  process.exit(0);
}

// --apply: copiar + verificar + actualizar BD + CSV de copia
const { writeFileSync } = await import("node:fs");
const csv = ["id,ruta_antigua,ruta_nueva"];
for (const p of plan) {
  await storage("object/copy", { bucket_id: "documents", source_key: p.oldPath, destination_key: p.newPath });
  const listed = await storage(`object/list/documents`, { prefix: p.newPath, limit: 1 });
  if (!listed || !listed.some((o) => o.name === p.newPath.split("/").pop())) {
    throw new Error(`Verificación fallida para ${p.newPath}: ABORTO, originales intactos.`);
  }
  await rest(`documents?id=eq.${p.id}`, {
    method: "PATCH",
    headers: { ...H, Prefer: "return=minimal" },
    body: JSON.stringify({ storage_path: p.newPath }),
  });
  csv.push(`${p.id},${p.oldPath},${p.newPath}`);
  console.log(`  migrado ${p.id}`);
}
writeFileSync(backupName, csv.join("\n"));
console.log(`\nBackup escrito en ${backupName} (NO commitear: contiene rutas; guárdalo fuera del repo).`);

if (DELETE_ORIGINALS) {
  console.log("Borrado de originales: SOLO tras verificar A4. Re-ejecuta revisando cada fila del CSV.");
  // Intencionadamente sin borrado automático: el borrado se hace objeto a
  // objeto contra el CSV tras A4 verificado (paso h del plan).
}
