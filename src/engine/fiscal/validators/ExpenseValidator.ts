// src/engine/fiscal/validators/ExpenseValidator.ts

import { FiscalRuleSet } from '../types/FiscalRuleSet.js';
import { HospitalityExpenseCategory } from '../types/ExpenseCategory.js';

export interface ValidationIssue {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ExpenseValidationPayload {
  baseAmount: number;
  vatRate: number;
  vatAmount?: number;
  totalAmount: number;
  date: string;
  category: string;
}

export class ExpenseValidator {
  private static readonly VALID_CATEGORIES: HospitalityExpenseCategory[] = [
    'alimentacion',
    'bebidas',
    'limpieza',
    'suministros',
    'alquiler',
    'mantenimiento',
    'personal',
    'servicios_profesionales',
    'software',
    'material_oficina',
    'marketing',
    'transporte',
    'seguros',
    'otros'
  ];

  public static validate(payload: ExpenseValidationPayload, ruleSet: FiscalRuleSet): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // 1. Validar importes positivos
    if (payload.baseAmount < 0) {
      issues.push({
        field: 'baseAmount',
        code: 'NEGATIVE_BASE_AMOUNT',
        message: 'La base imponible no puede ser negativa.',
        severity: 'error'
      });
    }

    if (payload.totalAmount < 0) {
      issues.push({
        field: 'totalAmount',
        code: 'NEGATIVE_TOTAL_AMOUNT',
        message: 'El importe total no puede ser negativo.',
        severity: 'error'
      });
    }

    // 2. Coherencia matemática (Base + IVA = Total)
    const expectedVat = payload.vatAmount ?? Math.round((payload.baseAmount * payload.vatRate) / 100 * 100) / 100;
    const computedTotal = Math.round((payload.baseAmount + expectedVat) * 100) / 100;
    const diff = Math.abs(computedTotal - payload.totalAmount);

    if (diff > 0.05) {
      issues.push({
        field: 'totalAmount',
        code: 'AMOUNTS_MISMATCH',
        message: `El total (${payload.totalAmount}€) no coincide con base (${payload.baseAmount}€) + IVA (${expectedVat}€).`,
        severity: 'error'
      });
    }

    // 3. Validar tipo de IVA
    const allowedRates = Object.values(ruleSet.vat.rates);
    if (!allowedRates.includes(payload.vatRate)) {
      issues.push({
        field: 'vatRate',
        code: 'UNSUPPORTED_VAT_RATE',
        message: `Tipo de IVA no reconocido (${payload.vatRate}%). Tipos válidos: ${allowedRates.join(', ')}%.`,
        severity: 'warning'
      });
    }

    // 4. Validar categoría
    const normCategory = payload.category.toLowerCase().trim() as HospitalityExpenseCategory;
    if (!this.VALID_CATEGORIES.includes(normCategory)) {
      issues.push({
        field: 'category',
        code: 'UNKNOWN_CATEGORY',
        message: `Categoría de gasto "${payload.category}" no catalogada para hostelería.`,
        severity: 'warning'
      });
    }

    // 5. Validar fecha
    const parsedDate = new Date(payload.date);
    if (isNaN(parsedDate.getTime())) {
      issues.push({
        field: 'date',
        code: 'INVALID_DATE',
        message: `Fecha inválida: "${payload.date}".`,
        severity: 'error'
      });
    } else {
      const now = new Date();
      if (parsedDate.getTime() > now.getTime() + 86400000) {
        issues.push({
          field: 'date',
          code: 'FUTURE_DATE',
          message: 'La fecha del gasto no puede ser futura.',
          severity: 'error'
        });
      }
    }

    return issues;
  }
}
