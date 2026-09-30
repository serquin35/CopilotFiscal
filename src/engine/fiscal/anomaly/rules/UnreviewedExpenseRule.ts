// src/engine/fiscal/anomaly/rules/UnreviewedExpenseRule.ts

export interface UnreviewedExpenseInput {
  expenseId: string;
  validationStatus: string;
  totalAmount: number;
  description: string;
}

export class UnreviewedExpenseRule {
  public static check(input: UnreviewedExpenseInput) {
    if (input.validationStatus === 'PENDING') {
      return {
        severity: 'low' as const,
        type: 'UNREVIEWED_EXPENSE',
        title: 'Gasto pendiente de validación',
        description: `El gasto de ${input.totalAmount}€ ("${input.description}") no ha sido revisado aún.`,
        evidence: {
          expenseId: input.expenseId,
          totalAmount: input.totalAmount,
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
