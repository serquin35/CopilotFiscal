// src/engine/fiscal/anomaly/rules/MissingVatRule.ts

export interface MissingVatCheckInput {
  expenseId: string;
  category: string;
  baseAmount: number;
  vatRate?: number;
  vatAmount?: number;
  totalAmount: number;
}

export class MissingVatRule {
  public static check(input: MissingVatCheckInput) {
    // Si el total es mayor a 0 y no tiene ni vatRate ni vatAmount (o vatRate es null/undefined)
    if (input.totalAmount > 0 && (input.vatRate === undefined || input.vatRate === null)) {
      return {
        severity: 'medium' as const,
        type: 'MISSING_VAT_DATA',
        title: 'Gasto sin datos de IVA desglosados',
        description: `El gasto de ${input.totalAmount}€ no especifica tipo ni importe de IVA.`,
        evidence: {
          expenseId: input.expenseId,
          totalAmount: input.totalAmount,
          category: input.category
        },
        entityType: 'expense' as const,
        entityId: input.expenseId,
        source: 'system' as const
      };
    }
    return null;
  }
}
