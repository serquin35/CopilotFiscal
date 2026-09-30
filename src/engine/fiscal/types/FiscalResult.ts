// src/engine/fiscal/types/FiscalResult.ts

import { VatBreakdownItem } from './VatRate.js';

export interface TaxSnapshotInputData {
  incomesCount: number;
  expensesCount: number;
  unreviewedExpensesCount: number;
  pendingDocumentsCount: number;
  incomes: Array<{
    id: string;
    date: string;
    baseAmount: number;
    vatRate: number;
    vatAmount: number;
    totalAmount: number;
  }>;
  expenses: Array<{
    id: string;
    date: string;
    category: string;
    baseAmount: number;
    vatRate: number;
    vatAmount: number;
    totalAmount: number;
    deductibilityStatus: string;
    deductiblePercentage: number;
  }>;
}

export interface TaxCalculationResult {
  rulesVersion: string;
  calculatedAt: string;
  
  // IVA
  vatOutput: number;
  vatInput: number;
  estimatedVatBalance: number;
  vatOutputBreakdown: VatBreakdownItem[];
  vatInputBreakdown: VatBreakdownItem[];

  // Bases
  incomeBase: number;
  expensesBase: number;
  estimatedResult: number;

  // Calidad y estado
  dataCompleteness: number; // 0.000 to 1.000
  pendingDocuments: number;
  unreviewedExpenses: number;

  // Metadatos
  warnings: string[];
  inputSnapshot: TaxSnapshotInputData;
}
