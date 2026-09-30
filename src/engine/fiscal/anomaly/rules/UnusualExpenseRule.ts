// src/engine/fiscal/anomaly/rules/UnusualExpenseRule.ts

import { FiscalRuleSet } from '../../types/FiscalRuleSet.js';

export interface UnusualExpenseInput {
  expenseId: string;
  totalAmount: number;
  description: string;
  category: string;
  ruleSet: FiscalRuleSet;
}

export class UnusualExpenseRule {
  public static check(input: UnusualExpenseInput) {
    const threshold = input.ruleSet.anomaly.unusualExpenseAmountThreshold;

    if (input.totalAmount >= threshold) {
      return {
        severity: 'medium' as const,
        type: 'UNUSUAL_EXPENSE',
        title: 'Importe de gasto inusualmente alto',
        description: `El gasto por importe de ${input.totalAmount}€ supera el umbral de alerta (${threshold}€) y debe ser verificado con justificante completo.`,
        evidence: {
          expenseId: input.expenseId,
          totalAmount: input.totalAmount,
          threshold,
          category: input.category,
          description: input.description
        },
        entityType: 'expense' as const,
        entityId: input.expenseId,
        source: 'system' as const
      };
    }

    return null;
  }
}
