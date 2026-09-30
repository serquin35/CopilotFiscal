// src/engine/fiscal/calculators/SnapshotCalculator.ts

import { FiscalRuleSet } from '../types/FiscalRuleSet.js';
import { TaxCalculationResult, TaxSnapshotInputData } from '../types/FiscalResult.js';
import { VatCalculator, IncomeInput, ExpenseInput } from './VatCalculator.js';
import { PeriodCalculator } from './PeriodCalculator.js';
import { QuarterNumber } from '../types/TaxPeriodDefinition.js';

export interface SnapshotCalculationOptions {
  year: number;
  quarter: QuarterNumber;
  incomes: IncomeInput[];
  expenses: ExpenseInput[];
  pendingDocumentsCount?: number;
  ruleSet: FiscalRuleSet;
}

export class SnapshotCalculator {
  public static calculate(options: SnapshotCalculationOptions): TaxCalculationResult {
    const { year, quarter, incomes, expenses, pendingDocumentsCount = 0, ruleSet } = options;
    const periodBounds = PeriodCalculator.getPeriodBounds(year, quarter, ruleSet);

    // Filtrar transacciones correspondientes al periodo
    const periodIncomes = incomes.filter((inc) => PeriodCalculator.isDateInPeriod(inc.date, periodBounds));
    const periodExpenses = expenses.filter((exp) => PeriodCalculator.isDateInPeriod(exp.date, periodBounds));

    // Cálculos de IVA y bases imponibles
    const vatCalc = VatCalculator.calculate(periodIncomes, periodExpenses, ruleSet);

    const incomeBase = vatCalc.totalIncomeBase;
    const expensesBase = vatCalc.totalDeductibleBase;
    const estimatedResult = VatCalculator.round(incomeBase - expensesBase);

    // Conteo de calidad y completitud
    const unreviewedExpenses = periodExpenses.filter(
      (e) => !e.validationStatus || e.validationStatus === 'PENDING'
    ).length;

    const totalItems = periodIncomes.length + periodExpenses.length + pendingDocumentsCount;
    let dataCompleteness = 1.0;
    if (totalItems > 0) {
      const penalizedItems = pendingDocumentsCount * 1.5 + unreviewedExpenses;
      const validRatio = Math.max(0, 1 - penalizedItems / (totalItems + 1));
      dataCompleteness = VatCalculator.round(Math.min(1, Math.max(0, validRatio)));
    }

    // Warnings de calidad
    const warnings: string[] = [];
    if (pendingDocumentsCount > 0) {
      warnings.push(`Existen ${pendingDocumentsCount} documento(s) pendiente(s) de extracción o confirmación.`);
    }
    if (unreviewedExpenses > 0) {
      warnings.push(`Hay ${unreviewedExpenses} gasto(s) sin validar que podrían afectar el cálculo final.`);
    }
    if (periodIncomes.length === 0) {
      warnings.push('No se han registrado ingresos en este trimestre.');
    }

    // Snapshot inmutable de los datos de entrada
    const inputSnapshot: TaxSnapshotInputData = {
      incomesCount: periodIncomes.length,
      expensesCount: periodExpenses.length,
      unreviewedExpensesCount: unreviewedExpenses,
      pendingDocumentsCount,
      incomes: periodIncomes.map((i) => ({
        id: i.id,
        date: i.date,
        baseAmount: i.baseAmount,
        vatRate: i.vatRate,
        vatAmount: i.vatAmount ?? VatCalculator.round((i.baseAmount * i.vatRate) / 100),
        totalAmount: i.totalAmount
      })),
      expenses: periodExpenses.map((e) => {
        const dedPct = VatCalculator.getDeductiblePercentage(e.category, ruleSet);
        return {
          id: e.id,
          date: e.date,
          category: e.category,
          baseAmount: e.baseAmount,
          vatRate: e.vatRate,
          vatAmount: e.vatAmount ?? VatCalculator.round((e.baseAmount * e.vatRate) / 100),
          totalAmount: e.totalAmount,
          deductibilityStatus: e.deductibilityStatus ?? (dedPct > 0 ? 'DEDUCTIBLE' : 'NON_DEDUCTIBLE'),
          deductiblePercentage: dedPct
        };
      })
    };

    return {
      rulesVersion: ruleSet.version,
      calculatedAt: new Date().toISOString(),
      vatOutput: vatCalc.vatOutput,
      vatInput: vatCalc.vatInput,
      estimatedVatBalance: vatCalc.estimatedVatBalance,
      vatOutputBreakdown: vatCalc.vatOutputBreakdown,
      vatInputBreakdown: vatCalc.vatInputBreakdown,
      incomeBase,
      expensesBase,
      estimatedResult,
      dataCompleteness,
      pendingDocuments: pendingDocumentsCount,
      unreviewedExpenses,
      warnings,
      inputSnapshot
    };
  }
}
