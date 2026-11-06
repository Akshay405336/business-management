import { Decimal } from '@prisma/client/runtime/client';
import { decimalToString } from '../../../../../infrastructure/services/quotation-money.js';
import type {
  QuotationLineItemReadModel,
  QuotationReadModel,
} from '../../../../domain/types/quotation-read-model.js';

export function toQuotation(row: {
  id: string;
  organizationId: string;
  documentNumber: string;
  type: QuotationReadModel['type'];
  status: QuotationReadModel['status'];
  title: string;
  description: string;
  leadId: string | null;
  clientId: string | null;
  issueDate: Date;
  expiryDate: Date | null;
  currency: string;
  subtotal: Decimal;
  discountTotal: Decimal;
  taxTotal: Decimal;
  grandTotal: Decimal;
  notes: string;
  terms: string;
  scopeOfWork: string;
  paymentTerms: string;
  deliveryTimeline: string;
  clientName: string;
  companyName: string;
  clientPhone: string;
  clientEmail: string;
  billingAddress: string;
  clientGstin: string;
  version: number;
  sourcePackageId: string | null;
  packageSnapshot: unknown;
  sentAt: Date | null;
  createdByAdminId: string;
  createdAt: Date;
  updatedAt: Date;
  lineItems?: Array<{
    id: string;
    quotationId: string;
    name: string;
    category: string;
    sourcePackageId: string | null;
    description: string;
    quantity: Decimal;
    unit: string;
    unitPrice: Decimal;
    discount: Decimal;
    taxRate: Decimal;
    lineTotal: Decimal;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
}): QuotationReadModel {
  return {
    ...row,
    sourcePackageId: row.sourcePackageId ?? null,
    packageSnapshot: row.packageSnapshot ?? null,
    subtotal: decimalToString(row.subtotal),
    discountTotal: decimalToString(row.discountTotal),
    taxTotal: decimalToString(row.taxTotal),
    grandTotal: decimalToString(row.grandTotal),
    lineItems: row.lineItems?.map(toQuotationLineItem),
  };
}

function toQuotationLineItem(item: {
  id: string;
  quotationId: string;
  name: string;
  category: string;
  sourcePackageId: string | null;
  description: string;
  quantity: Decimal;
  unit: string;
  unitPrice: Decimal;
  discount: Decimal;
  taxRate: Decimal;
  lineTotal: Decimal;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}): QuotationLineItemReadModel {
  return {
    ...item,
    category: item.category ?? '',
    sourcePackageId: item.sourcePackageId ?? null,
    quantity: item.quantity.toFixed(4),
    unitPrice: decimalToString(item.unitPrice),
    discount: decimalToString(item.discount),
    taxRate: item.taxRate.toFixed(4),
    lineTotal: decimalToString(item.lineTotal),
  };
}
