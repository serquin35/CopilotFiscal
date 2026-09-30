// src/engine/fiscal/calculators/PeriodCalculator.ts

import { FiscalRuleSet } from '../types/FiscalRuleSet.js';
import { QuarterNumber, TaxPeriodBounds } from '../types/TaxPeriodDefinition.js';

export class PeriodCalculator {
  public static getQuarterFromDate(dateStr: string): QuarterNumber {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date string: "${dateStr}"`);
    }
    const month = date.getUTCMonth() + 1; // 1-12
    if (month >= 1 && month <= 3) return 1;
    if (month >= 4 && month <= 6) return 2;
    if (month >= 7 && month <= 9) return 3;
    return 4;
  }

  public static getPeriodBounds(
    year: number,
    quarter: QuarterNumber,
    ruleSet: FiscalRuleSet
  ): TaxPeriodBounds {
    const qDef = ruleSet.periods.quarters.find((q) => q.quarter === quarter);
    if (!qDef) {
      throw new Error(`Quarter definition not found for Q${quarter} in ruleset ${ruleSet.version}`);
    }

    const startMonthStr = String(qDef.monthStart).padStart(2, '0');
    const endMonthStr = String(qDef.monthEnd).padStart(2, '0');

    // Último día del mes de fin
    const lastDay = new Date(Date.UTC(year, qDef.monthEnd, 0)).getUTCDate();
    const lastDayStr = String(lastDay).padStart(2, '0');

    const dateFrom = `${year}-${startMonthStr}-01`;
    const dateTo = `${year}-${endMonthStr}-${lastDayStr}`;

    // Plazo de declaración (para Q4 puede ser enero del año siguiente)
    const [deadMonth, deadDay] = qDef.declarationDeadline.split('-');
    const deadlineYear = quarter === 4 ? year + 1 : year;
    const deadlineDate = `${deadlineYear}-${deadMonth}-${deadDay}`;

    return {
      year,
      quarter,
      dateFrom,
      dateTo,
      deadlineDate
    };
  }

  public static isDateInPeriod(dateStr: string, bounds: TaxPeriodBounds): boolean {
    const d = new Date(dateStr).getTime();
    const from = new Date(bounds.dateFrom).getTime();
    const to = new Date(bounds.dateTo + 'T23:59:59.999Z').getTime();
    return d >= from && d <= to;
  }
}
