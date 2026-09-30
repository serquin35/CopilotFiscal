// src/engine/fiscal/rules/demo/DEMO_v1.rules.ts
// ⚠️ REGLAS FICTICIAS — ENTORNO DEMO — NO USAR EN PRODUCCIÓN

import { FiscalRuleSet } from '../../types/FiscalRuleSet.js';

export const DEMO_v1: FiscalRuleSet = {
  version: 'DEMO_v1',
  label: 'Reglas de Simulación DEMO v1',
  jurisdiction: 'DEMO',
  isDemo: true,
  effectiveFrom: '2026-01-01',
  effectiveTo: null,
  source: 'INTERNO — REGLAS FICTICIAS PARA DESARROLLO',
  sourceConsultedAt: null,
  notes: 'ATENCIÓN: Estas reglas son ficticias y no representan la legislación fiscal española vigente. Solo para uso en entorno DEMO.',

  vat: {
    rates: {
      standard: 21,         // Ficticio (similar al general)
      reduced: 10,          // Ficticio (similar al reducido)
      superReduced: 4,      // Ficticio (superreducido)
      exempt: 0
    },
    hospitalityDefaultRate: 10,   // Hostelería: IVA reducido por defecto
    minimumVatAmountThreshold: 1  // Ignorar variaciones de IVA < 1€
  },

  periods: {
    periodType: 'quarterly',
    quarters: [
      { quarter: 1, monthStart: 1, monthEnd: 3, declarationDeadline: '04-20' },
      { quarter: 2, monthStart: 4, monthEnd: 6, declarationDeadline: '07-20' },
      { quarter: 3, monthStart: 7, monthEnd: 9, declarationDeadline: '10-20' },
      { quarter: 4, monthStart: 10, monthEnd: 12, declarationDeadline: '01-30' }
    ]
  },

  deductibility: {
    fullyDeductible: [
      'alimentacion',       // Materias primas
      'bebidas',
      'limpieza',
      'suministros',
      'alquiler',
      'servicios_profesionales',
      'software',
      'material_oficina',
      'seguros',
      'marketing'
    ],
    partiallyDeductible: [
      { category: 'transporte', percentage: 50 },
      { category: 'telefono', percentage: 50 }
    ],
    nonDeductible: [
      'multas',
      'donativos'
    ],
    requiresReview: [
      'otros',
      'personal',           // Requiere validación de contratos/nóminas
      'mantenimiento'       // Puede tener parte no deducible
    ]
  },

  anomaly: {
    unusualVatRatioThreshold: 0.30,        // Alerta si IVA varía >30% vs histórico
    maxDateDifferencesDays: 90,            // Alerta si documento tiene >90 días de antigüedad
    unusualExpenseAmountThreshold: 5000,   // Alerta si gasto supera 5.000€
    supplierNameSimilarityThreshold: 0.85  // Alerta si similitud de nombre >85%
  }
};
