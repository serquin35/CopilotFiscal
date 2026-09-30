// src/engine/fiscal/types/FiscalRuleSet.ts

import { QuarterDefinition } from './TaxPeriodDefinition.js';

export interface VatRates {
  standard: number;
  reduced: number;
  superReduced: number;
  exempt: number;
}

export interface VatRules {
  rates: VatRates;
  hospitalityDefaultRate: number;
  minimumVatAmountThreshold: number;
}

export interface PeriodRules {
  periodType: 'quarterly' | 'monthly';
  quarters: QuarterDefinition[];
}

export interface PartialDeductibilityRule {
  category: string;
  percentage: number;
}

export interface DeductibilityRules {
  fullyDeductible: string[];
  partiallyDeductible: PartialDeductibilityRule[];
  nonDeductible: string[];
  requiresReview: string[];
}

export interface AnomalyRules {
  unusualVatRatioThreshold: number;
  maxDateDifferencesDays: number;
  unusualExpenseAmountThreshold: number;
  supplierNameSimilarityThreshold: number;
}

export interface FiscalRuleSet {
  version: string;
  label: string;
  jurisdiction: string;
  isDemo: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  source: string;
  sourceConsultedAt: string | null;
  notes: string;
  vat: VatRules;
  periods: PeriodRules;
  deductibility: DeductibilityRules;
  anomaly: AnomalyRules;
}
