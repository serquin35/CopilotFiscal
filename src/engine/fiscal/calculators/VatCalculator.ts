// src/engine/fiscal/calculators/VatCalculator.ts

import { FiscalRuleSet } from '../types/FiscalRuleSet.js';
import { VatBreakdownItem } from '../types/VatRate.js';

export interface IncomeInput {
  id: string;
  date: string;
  baseAmount: number;
  vatRate: number;
  vatAmount?: number;
  totalAmount: number;
}

export interface ExpenseInput {
  id: string;
  date: string;
  category: string;
  baseAmount: number;
  vatRate: number;
  vatAmount?: number;
  totalAmount: number;
  deductibilityStatus?: string;
  validationStatus?: string;
}

export interface VatCalculationResult {
  vatOutput: number;
  vatInput: number;
  estimatedVatBalance: number;
  vatOutputBreakdown: VatBreakdownItem[];
  vatInputBreakdown: VatBreakdownItem[];
  totalDeductibleBase: number;
  totalIncomeBase: number;
}

export class VatCalculator {
  public static round(val: number): number {
    return Math.round((val + Number.EPSILON) * 100) / 100;
  }

  public static getDeductiblePercentage(category: string, ruleSet: FiscalRuleSet): number {
    const normCategory = category.toLowerCase().trim();

    if (ruleSet.deductibility.nonDeductible.includes(normCategory)) {
      return 0;
    }

    const partial = ruleSet.deductibility.partiallyDeductible.find(
      (p) => p.category.toLowerCase().trim() === normCategory
    );
    if (partial) {
      return partial.percentage;
    }

    if (ruleSet.deductibility.fullyDeductible.includes(normCategory)) {
      return 100;
    }

    // Por defecto si requiere revisión o no está catalogado
    return 0;
  }

  public static calculate(
    incomes: IncomeInput[],
    expenses: ExpenseInput[],
    ruleSet: FiscalRuleSet
  ): VatCalculationResult {
    // 1. IVA Repercutido (Ventas / Ingresos)
    const outputMap = new Map<number, { base: number; vat: number }>();
    let totalIncomeBase = 0;
    let totalVatOutput = 0;

    for (const inc of incomes) {
      const rate = inc.vatRate ?? ruleSet.vat.hospitalityDefaultRate;
      const base = inc.baseAmount;
      const vat = inc.vatAmount !== undefined ? inc.vatAmount : this.round((base * rate) / 100);

      totalIncomeBase = this.round(totalIncomeBase + base);
      totalVatOutput = this.round(totalVatOutput + vat);

      const existing = outputMap.get(rate) || { base: 0, vat: 0 };
      outputMap.set(rate, {
        base: this.round(existing.base + base),
        vat: this.round(existing.vat + vat)
      });
    }

    const vatOutputBreakdown: VatBreakdownItem[] = Array.from(outputMap.entries())
      .map(([rate, data]) => ({
        rate,
        baseAmount: data.base,
        vatAmount: data.vat
      }))
      .sort((a, b) => b.rate - a.rate);

    // 2. IVA Soportado (Gastos Deducibles)
    const inputMap = new Map<number, { base: number; vat: number }>();
    let totalDeductibleBase = 0;
    let totalVatInput = 0;

    for (const exp of expenses) {
      // Solo computar si no está explícitamente marcado como NON_DEDUCTIBLE
      if (exp.deductibilityStatus === 'NON_DEDUCTIBLE') {
        continue;
      }

      const dedPct = this.getDeductiblePercentage(exp.category, ruleSet);
      if (dedPct === 0) {
        continue;
      }

      const rate = exp.vatRate ?? 0;
      const nominalBase = exp.baseAmount;
      const nominalVat = exp.vatAmount !== undefined ? exp.vatAmount : this.round((nominalBase * rate) / 100);

      // Aplicar porcentaje de deductibilidad
      const effectiveBase = this.round((nominalBase * dedPct) / 100);
      const effectiveVat = this.round((nominalVat * dedPct) / 100);

      totalDeductibleBase = this.round(totalDeductibleBase + effectiveBase);
      totalVatInput = this.round(totalVatInput + effectiveVat);

      const existing = inputMap.get(rate) || { base: 0, vat: 0 };
      inputMap.set(rate, {
        base: this.round(existing.base + effectiveBase),
        vat: this.round(existing.vat + effectiveVat)
      });
    }

    const vatInputBreakdown: VatBreakdownItem[] = Array.from(inputMap.entries())
      .map(([rate, data]) => ({
        rate,
        baseAmount: data.base,
        vatAmount: data.vat
      }))
      .sort((a, b) => b.rate - a.rate);

    const estimatedVatBalance = this.round(totalVatOutput - totalVatInput);

    return {
      vatOutput: totalVatOutput,
      vatInput: totalVatInput,
      estimatedVatBalance,
      vatOutputBreakdown,
      vatInputBreakdown,
      totalDeductibleBase,
      totalIncomeBase
    };
  }
}
