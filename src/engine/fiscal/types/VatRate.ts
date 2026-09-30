// src/engine/fiscal/types/VatRate.ts

export type VatRateStandard = 21;
export type VatRateReduced = 10;
export type VatRateSuperReduced = 4;
export type VatRateExempt = 0;

export type VatRateValue = VatRateStandard | VatRateReduced | VatRateSuperReduced | VatRateExempt;

export interface VatBreakdownItem {
  rate: number;
  baseAmount: number;
  vatAmount: number;
}
