import type {
  CrmQuotation,
  CrmQuotationLineItem,
  CrmQuotationPrintResponse,
} from '@techwin/contracts';
import type {
  QuotationPrintReadModel,
  QuotationReadModel,
} from '../../domain/types/quotation-read-model.js';

const iso = (value: Date): string => value.toISOString();
const dateOnly = (value: Date): string => value.toISOString().slice(0, 10);
const money = (value: string): string => value;

const toCrmQuotationLineItem = (
  item: NonNullable<QuotationReadModel['lineItems']>[number],
): CrmQuotationLineItem => ({
  id: item.id,
  name: item.name,
  category: item.category,
  sourcePackageId: item.sourcePackageId,
  description: item.description,
  quantity: item.quantity,
  unit: item.unit,
  unitPrice: money(item.unitPrice),
  discount: money(item.discount),
  taxRate: item.taxRate,
  lineTotal: money(item.lineTotal),
  sortOrder: item.sortOrder,
});

export const toCrmQuotation = (quotation: QuotationReadModel): CrmQuotation => ({
  id: quotation.id,
  documentNumber: quotation.documentNumber,
  type: quotation.type,
  status: quotation.status,
  title: quotation.title,
  description: quotation.description,
  leadId: quotation.leadId,
  clientId: quotation.clientId,
  issueDate: dateOnly(quotation.issueDate),
  expiryDate: quotation.expiryDate ? dateOnly(quotation.expiryDate) : null,
  currency: quotation.currency,
  subtotal: money(quotation.subtotal),
  discountTotal: money(quotation.discountTotal),
  taxTotal: money(quotation.taxTotal),
  grandTotal: money(quotation.grandTotal),
  notes: quotation.notes,
  terms: quotation.terms,
  scopeOfWork: quotation.scopeOfWork,
  paymentTerms: quotation.paymentTerms,
  deliveryTimeline: quotation.deliveryTimeline,
  clientName: quotation.clientName,
  companyName: quotation.companyName,
  clientPhone: quotation.clientPhone,
  clientEmail: quotation.clientEmail,
  billingAddress: quotation.billingAddress,
  clientGstin: quotation.clientGstin,
  version: quotation.version,
  sourcePackageId: quotation.sourcePackageId,
  packageSnapshot: (quotation.packageSnapshot as CrmQuotation['packageSnapshot']) ?? null,
  lineItems: (quotation.lineItems ?? []).map(toCrmQuotationLineItem),
  sentAt: quotation.sentAt ? iso(quotation.sentAt) : null,
  createdAt: iso(quotation.createdAt),
  updatedAt: iso(quotation.updatedAt),
});

export const toCrmQuotationPrint = (
  quotation: QuotationPrintReadModel,
): CrmQuotationPrintResponse => ({
  ...toCrmQuotation(quotation),
  organizationName: quotation.organizationName,
});
