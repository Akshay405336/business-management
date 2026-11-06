import type { QuotationDocumentType, QuotationStatus } from '../enums/quotation-status.enum.js';

export interface QuotationLineItemReadModel {
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
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface QuotationReadModel {
  readonly id: string;
  readonly organizationId: string;
  readonly documentNumber: string;
  readonly type: QuotationDocumentType;
  readonly status: QuotationStatus;
  readonly title: string;
  readonly description: string;
  readonly leadId: string | null;
  readonly clientId: string | null;
  readonly issueDate: Date;
  readonly expiryDate: Date | null;
  readonly currency: string;
  readonly subtotal: string;
  readonly discountTotal: string;
  readonly taxTotal: string;
  readonly grandTotal: string;
  readonly notes: string;
  readonly terms: string;
  readonly scopeOfWork: string;
  readonly paymentTerms: string;
  readonly deliveryTimeline: string;
  readonly clientName: string;
  readonly companyName: string;
  readonly clientPhone: string;
  readonly clientEmail: string;
  readonly billingAddress: string;
  readonly clientGstin: string;
  readonly version: number;
  readonly sourcePackageId: string | null;
  readonly packageSnapshot: unknown;
  readonly sentAt: Date | null;
  readonly createdByAdminId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly lineItems?: readonly QuotationLineItemReadModel[];
}

export interface PaginatedQuotations {
  readonly items: readonly QuotationReadModel[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface QuotationPrintReadModel extends QuotationReadModel {
  readonly organizationName: string;
}
