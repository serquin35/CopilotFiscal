// n8n/workflows/wf01.v2.2.test.mjs
// Tests de la v2.2 validada (tarea A, Parte 0). Sin dependencias.
// Uso: node n8n/workflows/wf01.v2.2.test.mjs
// Cubre: URL EXACTA de descarga (tramo `documents/`) y rechazos de Validate.
import { readFileSync } from "node:fs";

const wf = JSON.parse(
  readFileSync(new URL("./wf01_document_intake_pipeline.json", import.meta.url), "utf8")
);
const byName = Object.fromEntries(wf.nodes.map((n) => [n.name, n]));
let pass = 0;
const ok = (cond, label) => {
  if (!cond) {
    console.error("FALLO:", label);
    process.exitCode = 1;
  } else {
    pass++;
    console.log("ok:", label);
  }
};

// 1. URL exacta de descarga para un storagePath de ejemplo
const dlUrl = byName["Download from Storage"].parameters.url;
ok(typeof dlUrl === "string" && dlUrl.startsWith("={{") && dlUrl.endsWith("}}"), "download usa expresion n8n");
const exprBody = dlUrl.slice(3, -2).trim();
const storagePath = "63abb270-c1a7-461f-9c84-641d8efff333/11111111-1111-4111-8111-111111111111.pdf";
const stubValidate = (name) => {
  if (name !== "Validate & Normalize Input") throw new Error("nodo inesperado: " + name);
  return { item: { json: { storagePath } } };
};
const built = new Function("$", `return (${exprBody});`)(stubValidate);
ok(
  built ===
    "https://rqcpwxucgkcodccrykpv.supabase.co/storage/v1/object/authenticated/documents/" +
      storagePath,
  "URL exacta con tramo documents/"
);
ok(!built.includes("fileUrl"), "sin rama fileUrl en descarga");

// 2. Rechazos de Validate
const vcode = byName["Validate & Normalize Input"].parameters.jsCode;
const runV = (body) => new Function("$input", vcode)({ first: () => ({ json: { body } }) });
const BIZ = "63abb270-c1a7-461f-9c84-641d8efff333";
const UID = "11111111-1111-4111-8111-111111111111";
const good = runV({ documentId: UID, businessId: BIZ, storagePath: `${BIZ}/doc.pdf`, mimeType: "application/pdf" });
ok(good.json.storagePath === `${BIZ}/doc.pdf`, "ruta nueva aceptada");
for (const [label, body] of [
  ["negocio ajeno", { documentId: UID, businessId: BIZ, storagePath: "otro-negocio/doc.pdf" }],
  [".. traversal", { documentId: UID, businessId: BIZ, storagePath: `${BIZ}/../x.pdf` }],
  ["ruta absoluta", { documentId: UID, businessId: BIZ, storagePath: "/etc/passwd" }],
  ["host ajeno", { documentId: UID, businessId: BIZ, fileUrl: "https://evil.example/x.jpg", mimeType: "image/jpeg" }],
  ["http://", { documentId: UID, businessId: BIZ, fileUrl: "http://rqcpwxucgkcodccrykpv.supabase.co/storage/v1/object/public/documents/a.jpg", mimeType: "image/jpeg" }],
  ["userinfo@", { documentId: UID, businessId: BIZ, fileUrl: "https://user:pass@rqcpwxucgkcodccrykpv.supabase.co/storage/v1/object/public/documents/a.jpg", mimeType: "image/jpeg" }],
]) {
  try {
    runV(body);
    ok(false, `rechazo ${label}`);
  } catch (e) {
    ok(!String(e.message).includes("indebidamente"), `rechazo ${label}`);
  }
}
console.log(`\n${pass} aserciones en verde`);
