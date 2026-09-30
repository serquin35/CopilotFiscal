import { describe, it, expect } from 'vitest';
import {
  RuleRegistry,
  DEMO_v1,
  VatCalculator,
  PeriodCalculator,
  SnapshotCalculator,
  ExpenseValidator,
  DocumentValidator,
  AnomalyDetector
} from '../index.js';

describe('Fiscal Engine - Core Deterministic Tests', () => {
  const registry = RuleRegistry.getInstance();
  const rules = registry.get('DEMO_v1');

  describe('RuleRegistry', () => {
    it('debe contener DEMO_v1 por defecto', () => {
      expect(rules).toBeDefined();
      expect(rules.version).toBe('DEMO_v1');
      expect(rules.isDemo).toBe(true);
    });

    it('no debe permitir registrar dos veces la misma versión', () => {
      expect(() => registry.register(DEMO_v1)).toThrow();
    });
  });

  describe('PeriodCalculator', () => {
    it('debe calcular correctamente el trimestre según la fecha', () => {
      expect(PeriodCalculator.getQuarterFromDate('2026-01-15')).toBe(1);
      expect(PeriodCalculator.getQuarterFromDate('2026-05-20')).toBe(2);
      expect(PeriodCalculator.getQuarterFromDate('2026-08-01')).toBe(3);
      expect(PeriodCalculator.getQuarterFromDate('2026-11-30')).toBe(4);
    });

    it('debe determinar los límites exactos del periodo y la fecha límite de presentación', () => {
      const q1 = PeriodCalculator.getPeriodBounds(2026, 1, rules);
      expect(q1.dateFrom).toBe('2026-01-01');
      expect(q1.dateTo).toBe('2026-03-31');
      expect(q1.deadlineDate).toBe('2026-04-20');

      const q4 = PeriodCalculator.getPeriodBounds(2026, 4, rules);
      expect(q4.dateFrom).toBe('2026-10-01');
      expect(q4.dateTo).toBe('2026-12-31');
      expect(q4.deadlineDate).toBe('2027-01-30'); // Enero del año siguiente
    });

    it('debe verificar si una fecha cae dentro del periodo', () => {
      const q2 = PeriodCalculator.getPeriodBounds(2026, 2, rules);
      expect(PeriodCalculator.isDateInPeriod('2026-05-10', q2)).toBe(true);
      expect(PeriodCalculator.isDateInPeriod('2026-02-10', q2)).toBe(false);
    });
  });

  describe('VatCalculator', () => {
    it('debe calcular el IVA repercutido y soportado con redondeo exacto a 2 decimales', () => {
      const incomes = [
        { id: 'inc-1', date: '2026-02-01', baseAmount: 1000, vatRate: 10, totalAmount: 1100 },
        { id: 'inc-2', date: '2026-02-15', baseAmount: 500, vatRate: 21, totalAmount: 605 }
      ];

      const expenses = [
        // Totalmente deducible (alimentación)
        { id: 'exp-1', date: '2026-02-02', category: 'alimentacion', baseAmount: 400, vatRate: 10, totalAmount: 440 },
        // Parcialmente deducible 50% (transporte)
        { id: 'exp-2', date: '2026-02-05', category: 'transporte', baseAmount: 100, vatRate: 21, totalAmount: 121 },
        // No deducible (multas)
        { id: 'exp-3', date: '2026-02-10', category: 'multas', baseAmount: 200, vatRate: 0, totalAmount: 200 }
      ];

      const result = VatCalculator.calculate(incomes, expenses, rules);

      // Ingresos: 1000 * 0.10 = 100€; 500 * 0.21 = 105€ => Total IVA repercutido = 205€
      expect(result.vatOutput).toBe(205);
      expect(result.totalIncomeBase).toBe(1500);

      // Gastos deducibles:
      // exp-1 (100%): base 400€, vat 40€
      // exp-2 (50%): base 50€, vat 10.50€
      // exp-3 (0%): base 0€, vat 0€
      // Total IVA soportado deducible = 40 + 10.50 = 50.50€
      expect(result.vatInput).toBe(50.50);
      expect(result.totalDeductibleBase).toBe(450);

      // Balance IVA = 205 - 50.50 = 154.50€ a pagar
      expect(result.estimatedVatBalance).toBe(154.50);
    });

    it('debe respetar la exclusión explícita si deductibilityStatus es NON_DEDUCTIBLE', () => {
      const expenses = [
        {
          id: 'exp-1',
          date: '2026-02-02',
          category: 'alimentacion',
          baseAmount: 100,
          vatRate: 10,
          totalAmount: 110,
          deductibilityStatus: 'NON_DEDUCTIBLE'
        }
      ];

      const result = VatCalculator.calculate([], expenses, rules);
      expect(result.vatInput).toBe(0);
      expect(result.totalDeductibleBase).toBe(0);
    });
  });

  describe('SnapshotCalculator', () => {
    it('debe generar un snapshot fiscal inmutable con trazabilidad e inputSnapshot', () => {
      const incomes = [
        { id: 'inc-1', date: '2026-01-15', baseAmount: 2000, vatRate: 10, totalAmount: 2200 }
      ];
      const expenses = [
        {
          id: 'exp-1',
          date: '2026-01-20',
          category: 'suministros',
          baseAmount: 300,
          vatRate: 21,
          totalAmount: 363,
          validationStatus: 'VALIDATED'
        }
      ];

      const snapshot = SnapshotCalculator.calculate({
        year: 2026,
        quarter: 1,
        incomes,
        expenses,
        pendingDocumentsCount: 0,
        ruleSet: rules
      });

      expect(snapshot.rulesVersion).toBe('DEMO_v1');
      expect(snapshot.vatOutput).toBe(200); // 2000 * 0.10
      expect(snapshot.vatInput).toBe(63);   // 300 * 0.21
      expect(snapshot.estimatedVatBalance).toBe(137);
      expect(snapshot.estimatedResult).toBe(1700); // 2000 - 300
      expect(snapshot.dataCompleteness).toBe(1);
      expect(snapshot.inputSnapshot.incomesCount).toBe(1);
      expect(snapshot.inputSnapshot.expensesCount).toBe(1);
    });

    it('debe penalizar la completitud de datos si hay documentos pendientes o gastos no validados', () => {
      const snapshot = SnapshotCalculator.calculate({
        year: 2026,
        quarter: 1,
        incomes: [{ id: 'inc-1', date: '2026-01-15', baseAmount: 1000, vatRate: 10, totalAmount: 1100 }],
        expenses: [{ id: 'exp-1', date: '2026-01-20', category: 'alimentacion', baseAmount: 100, vatRate: 10, totalAmount: 110, validationStatus: 'PENDING' }],
        pendingDocumentsCount: 3,
        ruleSet: rules
      });

      expect(snapshot.dataCompleteness).toBeLessThan(1);
      expect(snapshot.warnings.length).toBeGreaterThan(0);
      expect(snapshot.pendingDocuments).toBe(3);
      expect(snapshot.unreviewedExpenses).toBe(1);
    });
  });

  describe('ExpenseValidator & DocumentValidator', () => {
    it('debe detectar descuadre aritmético entre base, IVA y total', () => {
      const issues = ExpenseValidator.validate({
        baseAmount: 100,
        vatRate: 21,
        vatAmount: 21,
        totalAmount: 150, // Erróneo, debería ser 121
        date: '2026-01-10',
        category: 'alimentacion'
      }, rules);

      expect(issues.some((i) => i.code === 'AMOUNTS_MISMATCH')).toBe(true);
    });

    it('debe validar tipos MIME permitidos y tamaño de documento', () => {
      const invalidDoc = DocumentValidator.validate({
        type: 'invoice',
        direction: 'expense',
        originalFilename: 'test.exe',
        fileSizeBytes: 1024,
        mimeType: 'application/x-msdownload'
      });

      expect(invalidDoc.some((i) => i.code === 'UNSUPPORTED_MIME_TYPE')).toBe(true);
    });
  });

  describe('AnomalyDetector', () => {
    it('debe detectar duplicados por hash SHA-256', () => {
      const alerts = AnomalyDetector.analyze({
        ruleSet: rules,
        periodYear: 2026,
        periodQuarter: 1,
        documents: [
          { id: 'doc-1', hashSha256: 'hash-abc-123', filename: 'factura1.pdf', uploadedAt: '2026-01-01' },
          { id: 'doc-2', hashSha256: 'hash-abc-123', filename: 'factura_copia.pdf', uploadedAt: '2026-01-02' }
        ]
      });

      const dupAlert = alerts.find((a) => a.type === 'DUPLICATE_DOCUMENT');
      expect(dupAlert).toBeDefined();
      expect(dupAlert?.severity).toBe('high');
    });

    it('debe detectar gastos inusualmente altos y similitud en proveedores', () => {
      const alerts = AnomalyDetector.analyze({
        ruleSet: rules,
        periodYear: 2026,
        periodQuarter: 1,
        expenses: [
          {
            id: 'exp-big',
            date: '2026-01-10',
            description: 'Horno industrial',
            category: 'mantenimiento',
            baseAmount: 6000,
            vatRate: 21,
            vatAmount: 1260,
            totalAmount: 7260 // > 5000€
          }
        ],
        suppliers: [
          { id: 'sup-1', name: 'Distribuciones Hosteleras SL' },
          { id: 'sup-2', name: 'Distribuciones Hosteleras S.L.' }
        ]
      });

      expect(alerts.some((a) => a.type === 'UNUSUAL_EXPENSE')).toBe(true);
      expect(alerts.some((a) => a.type === 'POSSIBLE_DUPLICATE_SUPPLIER')).toBe(true);
    });
  });
});
