export type DocumentStatus =
  | "UPLOADED"
  | "EXTRACTING"
  | "EXTRACTED"
  | "PENDING_REVIEW"
  | "REVIEWED"
  | "CONFIRMED"
  | "APPROVED"
  | "REJECTED";

export type InvoiceStatus =
  | "UNREVIEWED"
  | "PENDING"
  | "APPROVED"
  | "DUPLICATE"
  | "INVALID_IVA"
  | "MISSING_NIF"
  | "DRAFT";

export interface FiscalDocument {
  id: string;
  filename: string;
  fileSize: number;
  uploadedAt: string;
  status: DocumentStatus;
  url?: string;
  providerName?: string;
  nif?: string;
  invoiceNumber?: string;
  date?: string;
  baseAmount?: number;
  vatRate?: number; // 21, 10, 4
  vatAmount?: number;
  totalAmount?: number;
  category?: string;
  deductiblePercentage?: number; // 0, 50, 100
  aiNotes?: string;
  anomalies?: AnomalyAlert[];
}

export type AlertSeverity = "high" | "medium" | "low";

export type AnomalyType =
  | "DUPLICATE"
  | "HIGH_AMOUNT"
  | "MISSING_VAT"
  | "UNREGISTERED_NIF"
  | "IRPF_MISMATCH"
  | "UNUSUAL_VAT_RATIO"
  | "UNUSUAL_EXPENSE"
  | "MISSING_VAT_DATA"
  | "UNREVIEWED_EXPENSE"
  | "PERIOD_MISMATCH"
  | "DUPLICATE_SUPPLIER"
  | "MISSING_NIF";

export interface AnomalyAlert {
  id: string;
  documentId?: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  type: AnomalyType | string;
  createdAt: string;
  resolved: boolean;
  resolutionReason?: string;
  evidence?: Record<string, unknown>;
  entityType?: "document" | "expense" | "supplier" | "period" | string;
  entityId?: string;
  source?: "system" | "n8n" | "manual" | string;
}

export interface QuarterlySummary {
  quarter: "1T" | "2T" | "3T" | "4T";
  year: number;
  deadline: string;
  daysRemaining: number;
  collectedVat: number; // IVA Repercutido (ventas)
  deductibleVat: number; // IVA Soportado (gastos)
  netVat: number; // A ingresar / compensar
  dataCompleteness: number; // 0-100%
  totalInvoices: number;
  pendingReviewCount: number;
  urgentAlertsCount: number;
  totalSalesBase?: number;
  totalExpensesBase?: number;
  operatingResult?: number;
  pendingExpensesBase?: number;
  pendingExpensesVat?: number;
  monthlyBreakdown: {
    month: string;
    collected: number;
    deductible: number;
  }[];
}
