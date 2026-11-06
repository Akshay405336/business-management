import type { QuotationAuditEventType } from '../enums/quotation-event-type.enum.js';
import type { QuotationDocumentType, QuotationStatus } from '../enums/quotation-status.enum.js';

export interface QuotationAuditEntry {
  readonly type: QuotationAuditEventType;
  readonly adminId: string | null;
  readonly entityType: string;
  readonly entityId: string;
  readonly metadata?: Readonly<Record<string, string | number | boolean | null>>;
}

export interface QuotationLineItemWriteInput {
  readonly id?: string;
  readonly name: string;
  readonly description?: string;
  readonly category?: string;
  readonly sourcePackageId?: string | null;
  readonly quantity: string | number;
  readonly unit?: string;
  readonly unitPrice: string | number;
  readonly discount?: string | number;
  readonly taxRate?: string | number;
  readonly sortOrder?: number;
}

export interface QuotationListFilters {
  readonly page: number;
  readonly pageSize: number;
  readonly search?: string;
  readonly type?: QuotationDocumentType;
  readonly status?: QuotationStatus;
  readonly issueFrom?: string;
  readonly issueTo?: string;
}

export interface CreateQuotationData {
  readonly type: QuotationDocumentType;
  readonly title: string;
  readonly description?: string;
  readonly scopeOfWork?: string;
  readonly leadId?: string | null;
  readonly clientId?: string | null;
  readonly clientName: string;
  readonly companyName?: string;
  readonly clientPhone: string;
  readonly clientEmail: string;
  readonly billingAddress: string;
  readonly clientGstin?: string;
  readonly issueDate: Date;
  readonly expiryDate?: Date | null;
  readonly currency?: string;
  readonly notes?: string;
  readonly terms?: string;
  readonly paymentTerms?: string;
  readonly deliveryTimeline?: string;
  readonly lineItems?: readonly QuotationLineItemWriteInput[];
  readonly sourcePackageId?: string | null;
  readonly createdByAdminId: string;
}

export interface QuotationPersistLineItem {
  readonly id: string;
  readonly quotationId: string;
  readonly name: string;
  readonly category: string;
  readonly sourcePackageId: string | null;
  readonly description: string;
  readonly quantity: string;
  readonly unit: string;
  readonly unitPrice: string;
  readonly discount: string;
  readonly taxRate: string;
  readonly lineTotal: string;
  readonly sortOrder: number;
}

export interface QuotationPersistTotals {
  readonly subtotal: string;
  readonly discountTotal: string;
  readonly taxTotal: string;
  readonly grandTotal: string;
}

export interface CreateQuotationPersistData extends CreateQuotationData {
  readonly id: string;
  readonly lineItems: readonly QuotationPersistLineItem[];
  readonly totals: QuotationPersistTotals;
  readonly packageSnapshot: Record<string, unknown> | null;
}

export interface UpdateQuotationPersistData extends UpdateQuotationData {
  readonly lineItems?: readonly QuotationPersistLineItem[];
  readonly totals?: QuotationPersistTotals;
}

export interface UpdateQuotationData {
  readonly title?: string;
  readonly description?: string;
  readonly scopeOfWork?: string;
  readonly leadId?: string | null;
  readonly clientId?: string | null;
  readonly clientName?: string;
  readonly companyName?: string;
  readonly clientPhone?: string;
  readonly clientEmail?: string;
  readonly billingAddress?: string;
  readonly clientGstin?: string;
  readonly issueDate?: Date;
  readonly expiryDate?: Date | null;
  readonly currency?: string;
  readonly notes?: string;
  readonly terms?: string;
  readonly paymentTerms?: string;
  readonly deliveryTimeline?: string;
  readonly lineItems?: readonly QuotationLineItemWriteInput[];
}
