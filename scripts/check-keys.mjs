// scripts/check-secrets.mjs
// Falla si detecta secretos (JWT legacy, sk-*, sb_secret_) en el arbol (salvo .env* ignorados).
// Uso: node scripts/check-secrets.mjs [réf git]  — por defecto escanea el worktree.
// En pre-commit: git diff --cached --name-only | xargs node scripts/check-secrets.mjs --files
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const PATTERNS = [
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, // JWT legacy
  /sk-(proj|live|test)-[A-Za-z0-9_-]{10,}/, // OpenAI & cia
  /sb_secret_[A-Za-z0-9_-]{10,}/, // Supabase secret (nunca en repo)
];

function filesToScan() {
  const fromArgs = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  if (fromArgs.length > 0) return fromArgs;
  const out = execSync("git ls-files", { encoding: "utf8" });
  return out.split("\n").map((s) => s.trim()).filter(Boolean);
}

const skipRe = /(^|\/)(node_modules|dist|\.next|\.git)(\/|$)|\.env(\.|$)|client_secret|credentials/i;
let hits = 0;
for (const f of filesToScan()) {
  if (skipRe.test(f) || !existsSync(f)) continue;
  let text = "";
  try {
    text = readFileSync(f, "utf8");
  } catch {
    continue; // binario o ilegible
  }
  for (const re of PATTERNS) {
    if (re.test(text)) {
      console.error(`SECRETO POSIBLE en ${f} (patron ${re})`);
      hits++;
      break;
    }
  }
}
if (hits > 0) {
  console.error(`\ncheck-secrets: ${hits} fichero(s) sospechosos. Sanitiza antes de commitear.`);
  process.exit(1);
}
console.log("check-secrets: limpio.");
