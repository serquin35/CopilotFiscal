// src/engine/fiscal/anomaly/rules/PossibleDuplicateSupplierRule.ts

export interface SupplierSimilarityInput {
  supplierId: string;
  name: string;
  existingSuppliers: Array<{ id: string; name: string }>;
  threshold?: number;
}

export class PossibleDuplicateSupplierRule {
  private static calculateSimilarity(s1: string, s2: string): number {
    const a = s1.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const b = s2.toLowerCase().trim().replace(/[^a-z0-9]/g, '');

    if (a === b) return 1.0;
    if (a.length === 0 || b.length === 0) return 0.0;

    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    const distance = matrix[b.length][a.length];
    const maxLen = Math.max(a.length, b.length);
    return (maxLen - distance) / maxLen;
  }

  public static check(input: SupplierSimilarityInput) {
    const threshold = input.threshold ?? 0.85;

    for (const sup of input.existingSuppliers) {
      if (sup.id === input.supplierId) continue;

      const similarity = this.calculateSimilarity(input.name, sup.name);
      if (similarity >= threshold) {
        return {
          severity: 'low' as const,
          type: 'POSSIBLE_DUPLICATE_SUPPLIER',
          title: 'Posible proveedor duplicado',
          description: `El proveedor "${input.name}" es muy similar al proveedor existente "${sup.name}".`,
          evidence: {
            newSupplierId: input.supplierId,
            newSupplierName: input.name,
            matchedSupplierId: sup.id,
            matchedSupplierName: sup.name,
            similarityScore: Math.round(similarity * 100)
          },
          entityType: 'supplier' as const,
          entityId: input.supplierId,
          source: 'system' as const
        };
      }
    }

    return null;
  }
}
