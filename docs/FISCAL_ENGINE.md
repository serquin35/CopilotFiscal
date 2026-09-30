# FISCAL ENGINE — COPILOTO FISCAL

> **Versión:** 1.0  
> **Fecha:** 30 Septiembre 2026  
> **Estado:** FASE 0 — Motor Fiscal  
> **Fuente de verdad:** COPILOTO_FISCAL_MASTER_PLAN.md §4, §8, §13  
> **Autor:** Antigravity (generado durante FASE 0)

> [!CAUTION]
> Las reglas fiscales en este documento son **ficticias y exclusivamente para entorno DEMO**. No representan asesoramiento fiscal real. Las reglas reales deberán contrastarse con fuentes oficiales (AEAT, BOE) antes de activar en producción (Fase 8+).

---

## 1. Principio Fundamental

> **La IA NO es el motor fiscal.**

```
DATO ESTRUCTURADO
    +
REGLAS DETERMINISTAS (FiscalRuleSet versionadas)
    +
PERIODO FISCAL
    =
RESULTADO CALCULADO

La IA solo explica el resultado. Nunca lo produce.
```

---

## 2. Estructura del Motor Fiscal

```
src/engine/fiscal/
  │
  ├── types/
  │   ├── FiscalRuleSet.ts          ← Tipado del conjunto de reglas
  │   ├── FiscalResult.ts           ← Tipado del resultado calculado
  │   ├── VatRate.ts                ← Tipos de IVA válidos
  │   ├── ExpenseCategory.ts        ← Categorías de gasto deducible
  │   └── TaxPeriodDefinition.ts    ← Definición de periodo
  │
  ├── rules/
  │   ├── demo/
  │   │   └── DEMO_v1.rules.ts      ← Reglas ficticias DEMO (versión 1)
  │   └── README.md                 ← Instrucciones para añadir reglas reales
  │
  ├── calculators/
  │   ├── VatCalculator.ts          ← Cálculo IVA soportado/repercutido
  │   ├── PeriodCalculator.ts       ← Determinación de periodos trimestrales
  │   └── SnapshotCalculator.ts     ← Cálculo completo del TaxSnapshot
  │
  ├── validators/
  │   ├── ExpenseValidator.ts       ← Validación de gastos
  │   └── DocumentValidator.ts     ← Validación de documentos
  │
  ├── anomaly/
  │   ├── AnomalyDetector.ts        ← Orquestador de reglas de anomalías
  │   └── rules/
  │       ├── DuplicateDocumentRule.ts
  │       ├── MissingVatRule.ts
  │       ├── UnusualVatRatioRule.ts
  │       ├── InvalidDateRule.ts
  │       ├── PossibleDuplicateSupplierRule.ts
  │       ├── UnreviewedExpenseRule.ts
  │       └── UnusualExpenseRule.ts
  │
  └── registry/
      └── RuleRegistry.ts           ← Registro central de versiones de reglas
```

---

## 3. Tipado del FiscalRuleSet

```typescript
// src/engine/fiscal/types/FiscalRuleSet.ts

export interface FiscalRuleSet {
  // Identificación de la versión
  version: string                    // Ej: 'DEMO_v1' | 'ES_RETA_2024_v1'
  label: string                      // Nombre legible: 'Reglas DEMO v1'
  jurisdiction: string               // 'ES' | 'ES-MD' | 'DEMO'
  isDemo: boolean                    // TRUE → reglas ficticias
  effectiveFrom: string              // ISO date: '2026-01-01'
  effectiveTo: string | null         // NULL → vigente
  source: string                     // URL o referencia de la fuente oficial
  sourceConsultedAt: string | null   // Fecha de consulta de la fuente
  notes: string                      // Advertencias o aclaraciones

  // Reglas de IVA
  vat: VatRules

  // Reglas de periodos
  periods: PeriodRules

  // Reglas de deducibilidad
  deductibility: DeductibilityRules

  // Reglas de anomalía
  anomaly: AnomalyRules
}

export interface VatRules {
  // Tipos de IVA aplicables (hostelería España)
  rates: {
    standard: number          // IVA general (21% en España real)
    reduced: number           // IVA reducido (10% en España real)
    superReduced: number      // IVA superreducido (4% en España real)
    exempt: number            // 0% (exento)
  }

  // Tipos de IVA aplicables en hostelería (por defecto)
  hospitalityDefaultRate: number    // Ej: 10% para comida en local

  // Umbral mínimo de IVA para considerarlo significativo
  minimumVatAmountThreshold: number
}

export interface PeriodRules {
  periodType: 'quarterly' | 'monthly'
  quarters: QuarterDefinition[]
}

export interface QuarterDefinition {
  quarter: 1 | 2 | 3 | 4
  monthStart: number   // 1-12
  monthEnd: number     // 1-12
  declarationDeadline: string  // 'MM-DD' relativo al año
}

export interface DeductibilityRules {
  // Categorías totalmente deducibles
  fullyDeductible: string[]
  // Categorías parcialmente deducibles (con porcentaje)
  partiallyDeductible: { category: string; percentage: number }[]
  // Categorías no deducibles
  nonDeductible: string[]
  // Categorías que requieren revisión manual
  requiresReview: string[]
}

export interface AnomalyRules {
  // Umbral para detectar IVA inusual (ratio respecto a histórico)
  unusualVatRatioThreshold: number       // Ej: 0.3 → 30% de desviación
  // Días máximos de diferencia entre fecha de documento y fecha de registro
  maxDateDifferencesDays: number
  // Umbral para detectar gasto inusualmente alto
  unusualExpenseAmountThreshold: number
  // Umbral de similitud para detectar proveedor duplicado
  supplierNameSimilarityThreshold: number
}
```

---

## 4. Reglas DEMO_v1 (Ficticias)

```typescript
// src/engine/fiscal/rules/demo/DEMO_v1.rules.ts
// ⚠️ REGLAS FICTICIAS — ENTORNO DEMO — NO USAR EN PRODUCCIÓN

import { FiscalRuleSet } from '../../types/FiscalRuleSet'

export const DEMO_v1: FiscalRuleSet = {
  version: 'DEMO_v1',
  label: 'Reglas de Simulación DEMO v1',
  jurisdiction: 'DEMO',
  isDemo: true,
  effectiveFrom: '2026-01-01',
  effectiveTo: null,
  source: 'INTERNO — REGLAS FICTICIAS PARA DESARROLLO',
  sourceConsultedAt: null,
  notes: 'ATENCIÓN: Estas reglas son ficticias y no representan la legislación fiscal española vigente. Solo para uso en entorno DEMO.',

  vat: {
    rates: {
      standard: 21,         // Ficticio (similar al real español)
      reduced: 10,          // Ficticio (similar al real español)
      superReduced: 4,      // Ficticio
      exempt: 0
    },
    hospitalityDefaultRate: 10,   // Hostelería: IVA reducido por defecto
    minimumVatAmountThreshold: 1  // Ignorar IVA < 1€
  },

  periods: {
    periodType: 'quarterly',
    quarters: [
      { quarter: 1, monthStart: 1, monthEnd: 3, declarationDeadline: '04-20' },
      { quarter: 2, monthStart: 4, monthEnd: 6, declarationDeadline: '07-20' },
      { quarter: 3, monthStart: 7, monthEnd: 9, declarationDeadline: '10-20' },
      { quarter: 4, monthStart: 10, monthEnd: 12, declarationDeadline: '01-30' }
    ]
  },

  deductibility: {
    fullyDeductible: [
      'alimentacion',       // Materias primas
      'bebidas',
      'limpieza',
      'suministros',
      'alquiler',
      'servicios_profesionales',
      'software',
      'material_oficina',
      'seguros',
      'marketing'
    ],
    partiallyDeductible: [
      { category: 'transporte', percentage: 50 },
      { category: 'telefono', percentage: 50 }
    ],
    nonDeductible: [
      'multas',
      'donativos'
    ],
    requiresReview: [
      'otros',
      'personal',           // Requiere validación de contratos/nóminas
      'mantenimiento'       // Puede tener parte no deducible
    ]
  },

  anomaly: {
    unusualVatRatioThreshold: 0.30,        // Alerta si IVA varía >30% vs histórico
    maxDateDifferencesDays: 90,            // Alerta si documento tiene >90 días de antigüedad
    unusualExpenseAmountThreshold: 5000,   // Alerta si gasto supera 5.000€
    supplierNameSimilarityThreshold: 0.85  // Alerta si similitud de nombre >85%
  }
}
```

---

## 5. VatCalculator

```typescript
// src/engine/fiscal/calculators/VatCalculator.ts
// Interfaz conceptual — implementación real en Fase 2

interface VatCalculationInput {
  expenses: ExpenseRecord[]      // Solo gastos CONFIRMED y DEDUCTIBLE
  income: IncomeRecord[]
  rules: FiscalRuleSet
  periodYear: number
  periodQuarter: number
}

interface VatCalculationResult {
  // IVA repercutido (de las ventas)
  vatOutput: {
    total: number
    byRate: { rate: number; base: number; vat: number }[]
  }
  // IVA soportado (de los gastos deducibles)
  vatInput: {
    total: number
    byRate: { rate: number; base: number; vat: number }[]
    byCategory: { category: string; vat: number }[]
  }
  // Balance estimativo
  estimatedBalance: number       // vatOutput - vatInput
  // Advertencias del cálculo
  warnings: CalculationWarning[]
  // Metadatos de trazabilidad
  rulesVersion: string
  calculatedAt: string
  expenseIdsUsed: string[]       // IDs exactos de gastos incluidos en el cálculo
  incomeIdsUsed: string[]
}

// REGLA CRÍTICA DE REDONDEO:
// Todos los importes se redondean a 2 decimales usando Round Half Up
// Nunca usar Math.round() nativo (imprecisión en JavaScript)
// Usar función dedicada: roundHalfUp(value: number, decimals: number): number
```

**Reglas de inclusión en el cálculo de IVA:**

| Condición | Incluido en cálculo |
|---|---|
| Gasto con `status: CONFIRMED` y `deductibility_status: DEDUCTIBLE` | ✅ IVA soportado |
| Gasto con `status: CONFIRMED` y `deductibility_status: PARTIAL` | ✅ IVA soportado proporcional |
| Gasto con `status: PENDING` | ❌ NO incluido (reduce `data_completeness`) |
| Gasto con `status: FLAGGED` | ❌ NO incluido (genera alerta) |
| Ingreso con `status: confirmed` | ✅ IVA repercutido |
| Documento en estado `NEEDS_REVIEW` | ❌ NO incluido (genera alerta) |

---

## 6. PeriodCalculator

```typescript
// src/engine/fiscal/calculators/PeriodCalculator.ts

interface PeriodResult {
  year: number
  quarter: 1 | 2 | 3 | 4
  dateFrom: Date
  dateTo: Date
  declarationDeadline: Date
  status: 'open' | 'approaching' | 'overdue'
  daysUntilDeadline: number
}

// getPeriodForDate(date: Date, rules: FiscalRuleSet): PeriodResult
// getCurrentPeriod(rules: FiscalRuleSet): PeriodResult
// isDateInPeriod(date: Date, period: PeriodResult): boolean
// getPreviousPeriods(year: number, quarter: number, count: number): PeriodResult[]
```

---

## 7. SnapshotCalculator

El `SnapshotCalculator` es el punto de entrada principal del motor fiscal.

```typescript
// src/engine/fiscal/calculators/SnapshotCalculator.ts

interface SnapshotInput {
  businessId: string
  taxPeriodId: string
  rulesVersion: string                    // Debe coincidir con la versión activa en RuleRegistry
  triggeredBy: 'user' | 'system' | 'n8n'
  triggeredByUserId?: string
}

interface SnapshotOutput {
  // Datos del snapshot (se persisten en tax_snapshots)
  vatOutput: number
  vatInput: number
  estimatedVatBalance: number
  incomeBase: number
  expensesBase: number
  estimatedResult: number
  dataCompleteness: number        // 0-1
  pendingDocuments: number
  unreviewedExpenses: number
  warnings: SnapshotWarning[]
  inputSnapshot: object           // Foto exacta de los datos usados
  rulesVersion: string

  // Metadatos
  calculatedAt: string
  isPartial: boolean              // TRUE si hay datos pendientes que afectan al resultado
}

// FLUJO:
// 1. Obtener FiscalRuleSet del RuleRegistry por rulesVersion
// 2. Obtener todos los datos del periodo (expenses + income)
// 3. Filtrar solo datos CONFIRMED
// 4. Calcular con VatCalculator
// 5. Calcular data_completeness (confirmados / (confirmados + pendientes))
// 6. Ejecutar AnomalyDetector
// 7. Persistir en tax_snapshots (marcar previo como is_latest=FALSE)
// 8. Registrar AuditEvent: SNAPSHOT_CALCULATED
// 9. Retornar resultado
```

---

## 8. AnomalyDetector

Sistema de detección basado en **reglas deterministas**, no ML.

```typescript
// src/engine/fiscal/anomaly/AnomalyDetector.ts

interface AnomalyRule {
  type: string                  // Tipo de alerta
  severity: 'low' | 'medium' | 'high' | 'critical'
  check(context: AnomalyContext): AnomalyFinding | null
}

interface AnomalyContext {
  business: BusinessRecord
  documents: DocumentRecord[]
  expenses: ExpenseRecord[]
  income: IncomeRecord[]
  suppliers: SupplierRecord[]
  period: PeriodResult
  rules: FiscalRuleSet
  historicalSnapshots: TaxSnapshotRecord[]
}

interface AnomalyFinding {
  type: string
  severity: string
  title: string
  description: string          // En lenguaje claro, NUNCA "esto es ilegal"
  evidence: object
  entityType: string
  entityId: string
  suggestedAction: string
}
```

**Reglas implementadas en DEMO_v1:**

| Regla | Condición de activación |
|---|---|
| `DuplicateDocumentRule` | Dos documentos con el mismo `hash_sha256` |
| `MissingVatRule` | Factura de importe > umbral sin campo IVA |
| `UnusualVatRatioRule` | Ratio IVA/Base > 30% desviación vs histórico |
| `InvalidDateRule` | Fecha del documento >90 días antes de la fecha de registro |
| `PossibleDuplicateSupplierRule` | Similitud de nombre normalizado >85% entre proveedores |
| `MissingDocumentRule` | Gasto manual sin documento adjunto > 500€ |
| `UnreviewedExpenseRule` | Gastos en estado PENDING a <15 días del cierre del periodo |
| `PeriodMismatchRule` | Fecha de factura no coincide con el periodo declarado |
| `UnusualExpenseRule` | Gasto único > 5.000€ sin nota justificativa |

**Lenguaje de alertas (ejemplos):**

| ❌ NO usar | ✅ Usar |
|---|---|
| "Este gasto es ilegal" | "Este gasto requiere revisión manual" |
| "Ha cometido fraude fiscal" | "Se ha detectado una posible inconsistencia en este documento" |
| "Esto es deducible" | "Según las reglas DEMO_v1, esta categoría es potencialmente deducible" |

---

## 9. RuleRegistry

```typescript
// src/engine/fiscal/registry/RuleRegistry.ts

class RuleRegistry {
  // Obtener conjunto de reglas por versión
  getByVersion(version: string): FiscalRuleSet

  // Obtener la versión activa para una jurisdicción y fecha
  getActiveVersion(jurisdiction: string, date: Date): FiscalRuleSet

  // Listar versiones disponibles
  listVersions(): RuleVersionSummary[]

  // Verificar si una versión es de DEMO
  isDemo(version: string): boolean
}

// Versiones registradas inicialmente:
// - 'DEMO_v1' → Reglas ficticias, jurisdiction: 'DEMO', isDemo: true
```

---

## 10. Reglas de Redondeo

Dado que estamos tratando valores monetarios:

```typescript
// src/engine/fiscal/utils/rounding.ts

/**
 * Redondeo Half-Up para valores monetarios.
 * No usar Math.round() nativo por imprecisión en flotantes.
 * Ejemplo: roundHalfUp(2.345, 2) → 2.35
 */
export function roundHalfUp(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals)
  return Math.round((value + Number.EPSILON) * factor) / factor
}

/**
 * Suma de array de números con redondeo correcto.
 * Evita acumulación de errores de flotante.
 */
export function sumAmounts(amounts: number[]): number {
  const total = amounts.reduce((acc, val) => acc + val, 0)
  return roundHalfUp(total)
}
```

---

## 11. Tests del Motor Fiscal (Prioritarios)

El motor fiscal es la parte más crítica del sistema. Los tests son **obligatorios** antes de usar cualquier cálculo en producción.

**Tests requeridos (Fase 2):**

```
tests/unit/engine/
  VatCalculator.test.ts
    ✓ IVA al 21% sobre base correcta
    ✓ IVA al 10% sobre base correcta
    ✓ IVA exento (0%) no genera IVA
    ✓ Redondeo correcto en centésimas
    ✓ Suma de IVAs múltiples
    ✓ Gasto PENDING no incluido en IVA soportado
    ✓ Gasto parcialmente deducible (50%) calcula correctamente
    ✓ Balance = vatOutput - vatInput

  PeriodCalculator.test.ts
    ✓ Q1: enero-marzo
    ✓ Q2: abril-junio
    ✓ Q3: julio-septiembre
    ✓ Q4: octubre-diciembre
    ✓ Fecha límite correcta por trimestre
    ✓ Año bisiesto no altera periodos

  AnomalyDetector.test.ts
    ✓ Detecta documento duplicado por hash
    ✓ No detecta duplicado si hashes diferentes
    ✓ Detecta factura sin IVA > umbral
    ✓ Detecta proveedor similar (>85%)
    ✓ No detecta proveedor diferente (<85%)
    ✓ Lenguaje de alertas no contiene términos prohibidos
```

---

## 12. Hoja de Ruta del Motor Fiscal

| Fase | Estado | Acción |
|---|---|---|
| FASE 0 | ✅ | Documentación y especificación del motor |
| FASE 1 | — | Esqueleto de tipos y RuleRegistry sin lógica |
| FASE 2 | — | VatCalculator + PeriodCalculator + SnapshotCalculator + Tests unitarios |
| FASE 3 | — | DocumentValidator + ExpenseValidator |
| FASE 4 | — | AnomalyDetector con todas las reglas DEMO |
| FASE 8 | — | Implementar reglas reales (requiere revisión jurídica + fuentes AEAT) |

---

*Documento generado durante FASE 0. El motor fiscal no se implementa hasta Fase 2, con tests desde el inicio.*
