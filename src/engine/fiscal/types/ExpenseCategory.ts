// src/engine/fiscal/types/ExpenseCategory.ts

export type HospitalityExpenseCategory =
  | 'alimentacion'
  | 'bebidas'
  | 'limpieza'
  | 'suministros'
  | 'alquiler'
  | 'mantenimiento'
  | 'personal'
  | 'servicios_profesionales'
  | 'software'
  | 'material_oficina'
  | 'marketing'
  | 'transporte'
  | 'seguros'
  | 'otros';

export type DeductibilityStatus =
  | 'DEDUCTIBLE'
  | 'NON_DEDUCTIBLE'
  | 'PARTIAL'
  | 'PENDING';

export type ExpenseValidationStatus =
  | 'VALIDATED'
  | 'PENDING'
  | 'FLAGGED';
