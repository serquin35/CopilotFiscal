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
  const text = await r.text();
  return text ? JSON.parse(text) : null;
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
  const folder = p.newPath.split("/").slice(0, -1).join("/");
  const base = p.newPath.split("/").pop();
  // Idempotente: si la copia ya existe (re-ejecución), se salta la copia
  const existing = await storage(`object/list/documents`, { prefix: `${folder}/`, limit: 100 });
  if (!existing.some((o) => o.name === base)) {
    await storage("object/copy", { bucketId: "documents", sourceKey: p.oldPath, destinationKey: p.newPath });
    const listed = await storage(`object/list/documents`, { prefix: `${folder}/`, limit: 100 });
    if (!listed.some((o) => o.name === base)) {
      throw new Error(`Verificación fallida para ${p.newPath}: ABORTO, originales intactos.`);
    }
  } else {
    console.log(`  ya existe, se salta copia ${p.newPath}`);
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
  // Borrado vía Storage API (el SQL directo está bloqueado por
  // storage.protect_delete). Solo tras A4 verificado, objeto a objeto.
  const confirmed = process.argv.includes("--confirm-delete");
  if (!confirmed) {
    console.log("Borrado de originales: añade --confirm-delete para ejecutarlo (tras verificar A4).");
    process.exit(0);
  }
  for (const p of plan) {
    const r = await fetch(`${URL}/storage/v1/object/documents`, {
      method: "DELETE",
      headers: { ...H, "User-Agent": "copiloto-fiscal-migrate/1.0" },
      body: JSON.stringify([p.oldPath]),
    });
    if (!r.ok) throw new Error(`Borrado fallido ${p.oldPath}: HTTP ${r.status}`);
    console.log(`  borrado original ${p.oldPath}`);
  }
}
