// web/src/lib/nif-validator.ts
// Espejo cliente del validador determinista del motor fiscal.
// Mantener sincronizado con src/engine/fiscal/validators/NifValidator.ts

export type NifType = "DNI" | "NIE" | "CIF" | "UNKNOWN";

export interface NifCheck {
  normalized: string;
  type: NifType;
  valid: boolean;
  isDemo: boolean;
  code: string;
  message: string;
}

const DNI_LETTERS = "TRWAGMYFPDXBNJZSQVHLCKE";
const CIF_CONTROL_LETTERS = "JABCDEFGHI";
const CIF_DIGIT_ONLY = new Set(["A", "B", "E", "H", "J"]);
const CIF_LETTER_ONLY = new Set(["P", "Q", "S", "N", "W"]);

export function normalizeNif(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.toUpperCase().replace(/[\s.\-_/]+/g, "").trim();
}

function isDemoNif(normalized: string): boolean {
  if (!normalized) return false;
  return /0{5,}/.test(normalized) || normalized === "00000001X";
}

function getType(normalized: string): NifType {
  if (/^[0-9]{8}[A-Z]$/.test(normalized)) return "DNI";
  if (/^[XYZ][0-9]{7}[A-Z]$/.test(normalized)) return "NIE";
  if (/^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-Z]$/.test(normalized)) return "CIF";
  return "UNKNOWN";
}

function validDni(n: string): boolean {
  const num = Number(n.slice(0, 8));
  return Number.isInteger(num) && DNI_LETTERS[num % 23] === n[8];
}

function validNie(n: string): boolean {
  const prefix = { X: "0", Y: "1", Z: "2" }[n[0]];
  if (prefix === undefined) return false;
  const num = Number(prefix + n.slice(1, 8));
  return Number.isInteger(num) && DNI_LETTERS[num % 23] === n[8];
}

function validCif(n: string): boolean {
  const letter = n[0];
  const digits = n.slice(1, 8);
  const control = n[8];
  if (!/^[0-9]{7}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    const d = Number(digits[i]);
    if (i % 2 === 0) {
      const dd = d * 2;
      sum += Math.floor(dd / 10) + (dd % 10);
    } else {
      sum += d;
    }
  }
  const cd = (10 - (sum % 10)) % 10;
  const cl = CIF_CONTROL_LETTERS[cd];
  if (CIF_DIGIT_ONLY.has(letter)) return control === String(cd);
  if (CIF_LETTER_ONLY.has(letter)) return control === cl;
  return control === String(cd) || control === cl;
}

export function maskNif(raw: string | null | undefined): string {
  const n = normalizeNif(raw);
  if (!n || n === "-") return "-";
  if (n.length <= 4) return "****";
  return `${n[0]}****${n.slice(-4)}`;
}

export function validateNif(
  raw: string | null | undefined,
  opts: { allowDemo?: boolean } = {}
): NifCheck {
  const normalized = normalizeNif(raw);
  const allowDemo = opts.allowDemo ?? false;

  if (!normalized || normalized === "-") {
    return { normalized, type: "UNKNOWN", valid: false, isDemo: false, code: "MISSING_NIF", message: "Falta el NIF del emisor. Sin NIF no es deducible." };
  }
  if (isDemoNif(normalized)) {
    if (allowDemo) {
      return { normalized, type: getType(normalized), valid: true, isDemo: true, code: "DEMO_NIF_ALLOWED", message: "NIF ficticio DEMO. Válido solo para simulación." };
    }
    return { normalized, type: getType(normalized), valid: false, isDemo: true, code: "DEMO_NIF_IN_PROD", message: "NIF ficticio no válido fuera de DEMO." };
  }
  const type = getType(normalized);
  if (type === "UNKNOWN") {
    return { normalized, type, valid: false, isDemo: false, code: "INVALID_NIF_FORMAT", message: "Formato no reconocido. Debe ser DNI, NIE o CIF." };
  }
  const ok = type === "DNI" ? validDni(normalized) : type === "NIE" ? validNie(normalized) : validCif(normalized);
  if (!ok) {
    return { normalized, type, valid: false, isDemo: false, code: "INVALID_NIF_CHECKSUM", message: `Dígito de control no cuadra (${type} ${normalized}). Error típico de OCR.` };
  }
  return { normalized, type, valid: true, isDemo: false, code: "VALID_NIF", message: `${type} válido.` };
}
