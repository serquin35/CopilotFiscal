// src/engine/fiscal/anomaly/rules/UnusualVatRatioRule.ts

import { FiscalRuleSet } from '../../types/FiscalRuleSet.js';

export interface UnusualVatRatioInput {
  expenseId: string;
  baseAmount: number;
  vatRate: number;
  vatAmount: number;
  ruleSet: FiscalRuleSet;
}

export class UnusualVatRatioRule {
  public static check(input: UnusualVatRatioInput) {
    if (input.baseAmount <= 0) return null;

    const theoreticalVat = (input.baseAmount * input.vatRate) / 100;
    if (theoreticalVat <= 0) return null;

    const deviation = Math.abs(input.vatAmount - theoreticalVat) / theoreticalVat;
    const threshold = input.ruleSet.anomaly.unusualVatRatioThreshold;

    if (deviation > threshold && Math.abs(input.vatAmount - theoreticalVat) >= input.ruleSet.vat.minimumVatAmountThreshold) {
      return {
        severity: 'medium' as const,
        type: 'UNUSUAL_VAT_RATIO',
        title: 'Ratio de IVA anómalo',
        description: `El IVA informado (${input.vatAmount}€) difiere significativamente del cálculo teórico esperado (${Math.round(theoreticalVat * 100) / 100}€ al ${input.vatRate}%).`,
        evidence: {
          expenseId: input.expenseId,
          baseAmount: input.baseAmount,
          statedVat: input.vatAmount,
          theoreticalVat: Math.round(theoreticalVat * 100) / 100,
          deviationPercentage: Math.round(deviation * 100)
        },
        entityType: 'expense' as const,
        entityId: input.expenseId,
        source: 'system' as const
      };
    }

    return null;
  }
}
