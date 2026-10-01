import { AnomalyAlert, FiscalDocument } from "@/types";

export interface AnomalyEngineExpense {
  id: string;
  document_id?: string | null;
  supplier_id?: string | null;
  date: string;
  description?: string | null;
  base_amount: number;
  vat_rate?: number | null;
  vat_amount?: number | null;
  total_amount: number;
  category?: string | null;
  deductibility_status?: string | null;
  validation_status?: string | null;
  fiscal_period_year?: number | null;
  fiscal_period_quarter?: number | null;
  notes?: string | null;
  suppliers?: { name?: string | null; tax_id_masked?: string | null } | null;
}

export interface AnomalyEngineIncome {
  id: string;
  date: string;
  base_amount: number;
  vat_amount: number;
  total_amount: number;
  fiscal_period_quarter?: number | null;
}

export interface AnomalyEngineSupplier {
  id: string;
  name: string;
  tax_id_masked?: string | null;
}

export interface AnomalyEngineContext {
  documents?: FiscalDocument[];
  expenses?: AnomalyEngineExpense[];
  income?: AnomalyEngineIncome[];
  suppliers?: AnomalyEngineSupplier[];
  selectedQuarter?: "1T" | "2T" | "3T" | "4T";
  selectedYear?: number;
}

const QUARTER_MONTH_INDICES: Record<string, number[]> = {
  "1T": [0, 1, 2],
  "2T": [3, 4, 5],
  "3T": [6, 7, 8],
  "4T": [9, 10, 11],
};

/**
 * Normaliza cadenas de texto para comparar similitud entre nombres de proveedores
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .replace(/\b(sa|sl|sau|slu|sll|coop|cif)\b/g, "");
}

/**
 * Motor determinista de detección de anomalías fiscales y alertas AEAT
 */
export function detectFiscalAnomalies(context: AnomalyEngineContext): AnomalyAlert[] {
  const alerts: AnomalyAlert[] = [];
  const {
    documents = [],
    expenses = [],
    income = [],
    suppliers = [],
    selectedQuarter = "4T",
    selectedYear = 2026,
  } = context;

  const validMonthIndices = QUARTER_MONTH_INDICES[selectedQuarter] || [9, 10, 11];

  // ---------------------------------------------------------------------------
  // 1. REGLA: UNUSUAL_EXPENSE (Gasto inusualmente elevado para el sector)
  // Umbral hostelería: facturas > 1.500 € requieren justificación contractual
  // ---------------------------------------------------------------------------
  for (const exp of expenses) {
    const total = Number(exp.total_amount || 0);
    if (total >= 1500) {
      alerts.push({
        id: `anom-high-${exp.id}`,
        documentId: exp.document_id || exp.id,
        title: "Importe de gasto elevado (> 1.500 €)",
        description: `El gasto de ${total.toFixed(2)} € con "${exp.suppliers?.name || exp.description || 'Proveedor'}" supera el umbral de control estándar para hostelería. La AEAT exige albarán detallado y factura completa para justificar su correlación con los ingresos.`,
        severity: "medium",
        type: "HIGH_AMOUNT",
        createdAt: exp.date || new Date().toISOString(),
        resolved: false,
        evidence: {
          expenseId: exp.id,
          totalAmount: total,
          supplier: exp.suppliers?.name,
          category: exp.category,
        },
        entityType: "expense",
        entityId: exp.id,
        source: "system",
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 2. REGLA: MISSING_NIF (Factura o gasto sin NIF del emisor)
  // Requisito formal del art. 6 del Reglamento de Facturación
  // ---------------------------------------------------------------------------
  for (const doc of documents) {
    const nif = (doc.nif || "").trim();
    if (!nif || nif === "-" || nif.toLowerCase() === "sin nif" || nif.length < 5) {
      alerts.push({
        id: `anom-nonif-doc-${doc.id}`,
        documentId: doc.id,
        title: "Documento sin NIF/CIF emisor identificado",
        description: `El documento "${doc.filename}" carece de NIF/CIF válido del emisor. La Agencia Tributaria rechaza sistemáticamente el IVA soportado de facturas sin identificación fiscal del proveedor.`,
        severity: "high",
        type: "UNREGISTERED_NIF",
        createdAt: doc.uploadedAt || new Date().toISOString(),
        resolved: false,
        evidence: {
          documentId: doc.id,
          filename: doc.filename,
          statedNif: doc.nif,
        },
        entityType: "document",
        entityId: doc.id,
        source: "system",
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 3. REGLA: UNUSUAL_VAT_RATIO (Inconsistencia en cálculo teórico de IVA)
  // Desviación entre base imponible, tipo de gravamen y cuota
  // ---------------------------------------------------------------------------
  for (const exp of expenses) {
    const base = Number(exp.base_amount || 0);
    const rate = Number(exp.vat_rate || 0);
    const statedVat = Number(exp.vat_amount || 0);

    if (base > 0 && rate > 0) {
      const theoreticalVat = Number(((base * rate) / 100).toFixed(2));
      const diff = Math.abs(statedVat - theoreticalVat);

      if (diff >= 1.5) {
        alerts.push({
          id: `anom-vatratio-${exp.id}`,
          documentId: exp.document_id || exp.id,
          title: "Descuadre en cuota de IVA aplicada",
          description: `La cuota registrada (${statedVat.toFixed(2)} €) difiere del cálculo matemático oficial (${theoreticalVat.toFixed(2)} € al ${rate}% sobre base de ${base.toFixed(2)} €). Riesgo de regularización en el Modelo 303.`,
          severity: "high",
          type: "UNUSUAL_VAT_RATIO",
          createdAt: exp.date || new Date().toISOString(),
          resolved: false,
          evidence: {
            expenseId: exp.id,
            baseAmount: base,
            vatRate: rate,
            statedVat,
            theoreticalVat,
            discrepancy: diff,
          },
          entityType: "expense",
          entityId: exp.id,
          source: "system",
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 4. REGLA: DUPLICATE_INVOICE (Facturas duplicadas con mismo emisor y número)
  // ---------------------------------------------------------------------------
  const seenInvoices = new Map<string, string>();
  for (const doc of documents) {
    const key = `${(doc.nif || "").toUpperCase()}__${(doc.invoiceNumber || "").trim().toUpperCase()}`;
    if (doc.invoiceNumber && doc.invoiceNumber !== "S/N" && doc.nif && doc.nif !== "-") {
      if (seenInvoices.has(key)) {
        alerts.push({
          id: `anom-dup-${doc.id}`,
          documentId: doc.id,
          title: "Posible duplicidad de factura detectada",
          description: `La factura con número "${doc.invoiceNumber}" del proveedor ${doc.providerName || doc.nif} coincide con otro registro previo en el sistema. Peligro de doble deducción indebida.`,
          severity: "high",
          type: "DUPLICATE",
          createdAt: doc.uploadedAt || new Date().toISOString(),
          resolved: false,
          evidence: {
            documentId: doc.id,
            invoiceNumber: doc.invoiceNumber,
            nif: doc.nif,
            previousMatchId: seenInvoices.get(key),
          },
          entityType: "document",
          entityId: doc.id,
          source: "system",
        });
      } else {
        seenInvoices.set(key, doc.id);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 5. REGLA: UNREVIEWED_EXPENSE (Documentos pendientes de conciliación)
  // ---------------------------------------------------------------------------
  for (const doc of documents) {
    if (doc.status === "PENDING_REVIEW" || doc.status === "EXTRACTED" || doc.status === "UPLOADED") {
      alerts.push({
        id: `anom-pending-${doc.id}`,
        documentId: doc.id,
        title: "Factura pendiente de aprobación humana",
        description: `El documento "${doc.filename}" (${doc.providerName || "Proveedor"}) fue extraído pero aún no ha sido confirmado. Su cuota deducible no está computando en la liquidación oficial.`,
        severity: "medium",
        type: "UNREVIEWED_EXPENSE",
        createdAt: doc.uploadedAt || new Date().toISOString(),
        resolved: false,
        evidence: {
          documentId: doc.id,
          status: doc.status,
          totalAmount: doc.totalAmount,
        },
        entityType: "document",
        entityId: doc.id,
        source: "system",
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 6. REGLA: PERIOD_MISMATCH (Gasto con fecha fuera del trimestre activo)
  // ---------------------------------------------------------------------------
  for (const exp of expenses) {
    if (exp.date) {
      const expDate = new Date(exp.date);
      const expMonth = expDate.getMonth();
      const expYear = expDate.getFullYear();

      if (expYear === selectedYear && !validMonthIndices.includes(expMonth)) {
        alerts.push({
          id: `anom-period-${exp.id}`,
          documentId: exp.document_id || exp.id,
          title: "Factura fuera del trimestre fiscal activo",
          description: `El gasto de fecha ${exp.date} pertenece a un trimestre diferente de ${selectedQuarter} ${selectedYear}. Debe asignarse al periodo tributario correspondiente para evitar recargos extemporáneos.`,
          severity: "low",
          type: "PERIOD_MISMATCH",
          createdAt: exp.date,
          resolved: false,
          evidence: {
            expenseId: exp.id,
            date: exp.date,
            expectedQuarter: selectedQuarter,
          },
          entityType: "expense",
          entityId: exp.id,
          source: "system",
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 7. REGLA: POSSIBLE_DUPLICATE_SUPPLIER (Proveedores con nombres redundantes)
  // ---------------------------------------------------------------------------
  const normalizedSuppliers = suppliers.map((s) => ({
    id: s.id,
    rawName: s.name,
    norm: normalizeName(s.name),
  }));

  for (let i = 0; i < normalizedSuppliers.length; i++) {
    for (let j = i + 1; j < normalizedSuppliers.length; j++) {
      const s1 = normalizedSuppliers[i];
      const s2 = normalizedSuppliers[j];

      if (s1.norm && s2.norm && (s1.norm.includes(s2.norm) || s2.norm.includes(s1.norm))) {
        alerts.push({
          id: `anom-supsim-${s1.id}-${s2.id}`,
          title: "Proveedores duplicados con nombre similar",
          description: `Se detectó coincidencia entre "${s1.rawName}" y "${s2.rawName}". Se recomienda unificar la ficha de proveedor para no dispersar el Modelo 347 (operaciones > 3.005,06 €).`,
          severity: "low",
          type: "DUPLICATE_SUPPLIER",
          createdAt: new Date().toISOString(),
          resolved: false,
          evidence: {
            supplierIdA: s1.id,
            supplierNameA: s1.rawName,
            supplierIdB: s2.id,
            supplierNameB: s2.rawName,
          },
          entityType: "supplier",
          entityId: s1.id,
          source: "system",
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 8. REGLA: SECTOR_VAT_RATIO (Ratio global soportado vs repercutido)
  // Si las compras superan el 90% de las ventas en hostelería sin justificar
  // ---------------------------------------------------------------------------
  const totalSalesVat = income.reduce((sum, inc) => sum + (inc.vat_amount || 0), 0);
  const totalDeductibleVat = expenses.reduce((sum, exp) => sum + (exp.vat_amount || 0), 0);

  if (totalSalesVat > 0 && totalDeductibleVat > totalSalesVat * 0.95) {
    alerts.push({
      id: `anom-sector-ratio-${selectedQuarter}-${selectedYear}`,
      title: "Ratio de IVA soportado anormalmente alto para hostelería",
      description: `El IVA soportado (${totalDeductibleVat.toFixed(2)} €) supera el 95% de las ventas repercutidas (${totalSalesVat.toFixed(2)} €). En hostelería (CNAE 5610), saldos sistemáticamente negativos o cercanos a cero activan inspecciones de censo y comprobación limitada de la AEAT.`,
      severity: "medium",
      type: "UNUSUAL_VAT_RATIO",
      createdAt: new Date().toISOString(),
      resolved: false,
      evidence: {
        totalSalesVat,
        totalDeductibleVat,
        ratio: Number((totalDeductibleVat / totalSalesVat).toFixed(2)),
      },
      entityType: "period",
      source: "system",
    });
  }

  return alerts;
}
