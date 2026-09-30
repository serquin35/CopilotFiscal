// src/engine/fiscal/anomaly/rules/InvalidDateRule.ts

import { FiscalRuleSet } from '../../types/FiscalRuleSet.js';

export interface InvalidDateInput {
  entityId: string;
  entityType: 'document' | 'expense';
  dateStr: string;
  periodYear: number;
  periodQuarter: number;
  ruleSet: FiscalRuleSet;
}

export class InvalidDateRule {
  public static check(input: InvalidDateInput) {
    const itemDate = new Date(input.dateStr);
    if (isNaN(itemDate.getTime())) {
      return {
        severity: 'high' as const,
        type: 'INVALID_DATE',
        title: 'Fecha de transacción inválida',
        description: `La fecha "${input.dateStr}" no tiene un formato válido.`,
        evidence: { dateStr: input.dateStr },
        entityType: input.entityType,
        entityId: input.entityId,
        source: 'system' as const
      };
    }

    const now = new Date();
    const diffDays = Math.round((now.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > input.ruleSet.anomaly.maxDateDifferencesDays) {
      return {
        severity: 'medium' as const,
        type: 'INVALID_DATE',
        title: 'Documento con fecha anterior al periodo de gestión',
        description: `El documento data de hace ${diffDays} días, superando el límite de ${input.ruleSet.anomaly.maxDateDifferencesDays} días para deducción habitual en el periodo.`,
        evidence: {
          dateStr: input.dateStr,
          daysOld: diffDays,
          maxAllowedDays: input.ruleSet.anomaly.maxDateDifferencesDays
        },
        entityType: input.entityType,
        entityId: input.entityId,
        source: 'system' as const
      };
    }

    return null;
  }
}
