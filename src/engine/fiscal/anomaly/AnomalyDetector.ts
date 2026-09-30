// src/engine/fiscal/anomaly/AnomalyDetector.ts

import { FiscalRuleSet } from '../types/FiscalRuleSet.js';
import { DuplicateDocumentRule } from './rules/DuplicateDocumentRule.js';
import { MissingVatRule } from './rules/MissingVatRule.js';
import { UnusualVatRatioRule } from './rules/UnusualVatRatioRule.js';
import { InvalidDateRule } from './rules/InvalidDateRule.js';
import { PossibleDuplicateSupplierRule } from './rules/PossibleDuplicateSupplierRule.js';
import { UnreviewedExpenseRule } from './rules/UnreviewedExpenseRule.js';
import { UnusualExpenseRule } from './rules/UnusualExpenseRule.js';

export interface AnomalyAlertResult {
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  title: string;
  description: string;
  evidence: Record<string, unknown>;
  entityType?: 'document' | 'expense' | 'supplier' | 'period';
  entityId?: string;
  source: 'system' | 'n8n' | 'manual';
}

export interface AnomalyDetectionContext {
  ruleSet: FiscalRuleSet;
  periodYear: number;
  periodQuarter: number;
  documents?: Array<{
    id: string;
    hashSha256: string;
    filename: string;
    uploadedAt: string;
  }>;
  expenses?: Array<{
    id: string;
    date: string;
    description: string;
    category: string;
    baseAmount: number;
    vatRate?: number;
    vatAmount?: number;
    totalAmount: number;
    validationStatus?: string;
  }>;
  suppliers?: Array<{
    id: string;
    name: string;
  }>;
}

export class AnomalyDetector {
  private static readonly SEVERITY_WEIGHTS: Record<string, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
  };

  public static analyze(context: AnomalyDetectionContext): AnomalyAlertResult[] {
    const alerts: AnomalyAlertResult[] = [];
    const { ruleSet, periodYear, periodQuarter, documents = [], expenses = [], suppliers = [] } = context;

    // 1. Detección en Documentos
    const processedHashes: Array<{ documentId: string; hashSha256: string; filename: string }> = [];
    for (const doc of documents) {
      if (doc.hashSha256) {
        const dupAlert = DuplicateDocumentRule.check({
          documentId: doc.id,
          hashSha256: doc.hashSha256,
          existingHashes: processedHashes
        });
        if (dupAlert) alerts.push(dupAlert);

        processedHashes.push({
          documentId: doc.id,
          hashSha256: doc.hashSha256,
          filename: doc.filename
        });
      }
    }

    // 2. Detección en Gastos
    for (const exp of expenses) {
      // Falta de IVA
      const missingVat = MissingVatRule.check({
        expenseId: exp.id,
        category: exp.category,
        baseAmount: exp.baseAmount,
        vatRate: exp.vatRate,
        vatAmount: exp.vatAmount,
        totalAmount: exp.totalAmount
      });
      if (missingVat) alerts.push(missingVat);

      // Ratio anómalo de IVA
      if (exp.vatRate !== undefined && exp.vatAmount !== undefined) {
        const unusualVat = UnusualVatRatioRule.check({
          expenseId: exp.id,
          baseAmount: exp.baseAmount,
          vatRate: exp.vatRate,
          vatAmount: exp.vatAmount,
          ruleSet
        });
        if (unusualVat) alerts.push(unusualVat);
      }

      // Fecha anómala o desfasada
      const dateAlert = InvalidDateRule.check({
        entityId: exp.id,
        entityType: 'expense',
        dateStr: exp.date,
        periodYear,
        periodQuarter,
        ruleSet
      });
      if (dateAlert) alerts.push(dateAlert);

      // Gasto pendiente de revisión
      if (exp.validationStatus) {
        const unreviewed = UnreviewedExpenseRule.check({
          expenseId: exp.id,
          validationStatus: exp.validationStatus,
          totalAmount: exp.totalAmount,
          description: exp.description
        });
        if (unreviewed) alerts.push(unreviewed);
      }

      // Gasto inusualmente alto
      const unusualExp = UnusualExpenseRule.check({
        expenseId: exp.id,
        totalAmount: exp.totalAmount,
        description: exp.description,
        category: exp.category,
        ruleSet
      });
      if (unusualExp) alerts.push(unusualExp);
    }

    // 3. Detección de Proveedores duplicados
    for (let i = 0; i < suppliers.length; i++) {
      const sup = suppliers[i];
      const otherSuppliers = suppliers.slice(0, i);
      const dupSup = PossibleDuplicateSupplierRule.check({
        supplierId: sup.id,
        name: sup.name,
        existingSuppliers: otherSuppliers,
        threshold: ruleSet.anomaly.supplierNameSimilarityThreshold
      });
      if (dupSup) alerts.push(dupSup);
    }

    // Ordenar por severidad decreciente
    return alerts.sort((a, b) => this.SEVERITY_WEIGHTS[b.severity] - this.SEVERITY_WEIGHTS[a.severity]);
  }
}
