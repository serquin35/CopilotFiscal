// src/engine/fiscal/validators/NifValidator.ts
// Validador determinista de NIF / CIF / NIE español.
// La IA propone, este módulo decide. Sin llamadas a IA ni a APIs externas.

import { ValidationIssue } from './ExpenseValidator.js';

export type NifType = 'DNI' | 'NIE' | 'CIF' | 'UNKNOWN';

export interface NifValidationOptions {
  allowDemo?: boolean;
}

export interface NifValidationResult {
  normalized: string;
  type: NifType;
  valid: boolean;
  isDemo: boolean;
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'ok';
}

const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';
const CIF_CONTROL_LETTERS = 'JABCDEFGHI';
const CIF_DIGIT_ONLY = new Set(['A', 'B', 'E', 'H', 'J']);
const CIF_LETTER_ONLY = new Set(['P', 'Q', 'S', 'N', 'W']);

export function normalizeNif(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .toUpperCase()
    .replace(/[\s.\-_/]+/g, '')
    .trim();
}

export function isDemoNif(normalized: string): boolean {
  if (!normalized) return false;
  if (/0{5,}/.test(normalized)) return true;
  if (normalized === '00000001X') return true;
  return false;
}

export function getNifType(normalized: string): NifType {
  if (/^[0-9]{8}[A-Z]$/.test(normalized)) return 'DNI';
  if (/^[XYZ][0-9]{7}[A-Z]$/.test(normalized)) return 'NIE';
  if (/^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-Z]$/.test(normalized)) return 'CIF';
  return 'UNKNOWN';
}

function isValidDni(normalized: string): boolean {
  const num = Number(normalized.slice(0, 8));
  if (!Number.isInteger(num)) return false;
  return DNI_LETTERS[num % 23] === normalized[8];
}

function isValidNie(normalized: string): boolean {
  const prefix = { X: '0', Y: '1', Z: '2' }[normalized[0]];
  if (prefix === undefined) return false;
  const num = Number(prefix + normalized.slice(1, 8));
  if (!Number.isInteger(num)) return false;
  return DNI_LETTERS[num % 23] === normalized[8];
}

function isValidCif(normalized: string): boolean {
  const letter = normalized[0];
  const digits = normalized.slice(1, 8);
  const control = normalized[8];
  if (!/^[0-9]{7}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    const d = Number(digits[i]);
    if (i % 2 === 0) {
      const doubled = d * 2;
      sum += Math.floor(doubled / 10) + (doubled % 10);
    } else {
      sum += d;
    }
  }
  const controlDigit = (10 - (sum % 10)) % 10;
  const controlLetter = CIF_CONTROL_LETTERS[controlDigit];

  if (CIF_DIGIT_ONLY.has(letter)) return control === String(controlDigit);
  if (CIF_LETTER_ONLY.has(letter)) return control === controlLetter;
  return control === String(controlDigit) || control === controlLetter;
}

export function maskNif(raw: string | null | undefined): string {
  const n = normalizeNif(raw);
  if (n.length <= 4) return n ? '****' : '-';
  return `${n[0]}****${n.slice(-4)}`;
}

export function validateNif(raw: string | null | undefined, opts: NifValidationOptions = {}): NifValidationResult {
  const normalized = normalizeNif(raw);
  const allowDemo = opts.allowDemo ?? false;

  if (!normalized || normalized === '-') {
    return {
      normalized,
      type: 'UNKNOWN',
      valid: false,
      isDemo: false,
      code: 'MISSING_NIF',
      message: 'Falta el NIF del emisor. Sin NIF no es deducible.',
      severity: 'error'
    };
  }

  const demo = isDemoNif(normalized);
  if (demo) {
    if (allowDemo) {
      return {
        normalized,
        type: getNifType(normalized),
        valid: true,
        isDemo: true,
        code: 'DEMO_NIF_ALLOWED',
        message: 'NIF ficticio de entorno DEMO. Válido solo para simulación.',
        severity: 'ok'
      };
    }
    return {
      normalized,
      type: getNifType(normalized),
      valid: false,
      isDemo: true,
      code: 'DEMO_NIF_IN_PROD',
      message: 'NIF ficticio no válido fuera del entorno DEMO.',
      severity: 'error'
    };
  }

  const type = getNifType(normalized);
  if (type === 'UNKNOWN') {
    return {
      normalized,
      type,
      valid: false,
      isDemo: false,
      code: 'INVALID_NIF_FORMAT',
      message: `Formato de NIF no reconocido: "${raw}". Debe ser DNI (8 dígitos + letra), NIE (X/Y/Z + 7 dígitos + letra) o CIF válido.`,
      severity: 'error'
    };
  }

  const ok = type === 'DNI' ? isValidDni(normalized) : type === 'NIE' ? isValidNie(normalized) : isValidCif(normalized);
  if (!ok) {
    return {
      normalized,
      type,
      valid: false,
      isDemo: false,
      code: 'INVALID_NIF_CHECKSUM',
      message: `El dígito de control no cuadra para ${type} "${normalized}". Revisa OCR: es el error más frecuente.`,
      severity: 'error'
    };
  }

  return {
    normalized,
    type,
    valid: true,
    isDemo: false,
    code: 'VALID_NIF',
    message: `${type} válido.`,
    severity: 'ok'
  };
}

export function toValidationIssue(raw: string | null | undefined, opts: NifValidationOptions = {}): ValidationIssue | null {
  const r = validateNif(raw, opts);
  if (r.severity === 'ok') return null;
  return {
    field: 'nif',
    code: r.code,
    message: r.message,
    severity: r.severity === 'warning' ? 'warning' : 'error'
  };
}
