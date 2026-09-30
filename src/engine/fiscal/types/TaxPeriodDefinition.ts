// src/engine/fiscal/types/TaxPeriodDefinition.ts

export type QuarterNumber = 1 | 2 | 3 | 4;

export interface QuarterDefinition {
  quarter: QuarterNumber;
  monthStart: number; // 1-12
  monthEnd: number;   // 1-12
  declarationDeadline: string; // 'MM-DD'
}

export interface TaxPeriodBounds {
  year: number;
  quarter: QuarterNumber;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string;   // YYYY-MM-DD
  deadlineDate: string; // YYYY-MM-DD
}
