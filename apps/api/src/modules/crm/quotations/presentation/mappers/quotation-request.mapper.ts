import type { CreateQuotationRequest, UpdateQuotationRequest } from '@techwin/validation';
import type {
  CreateQuotationData,
  UpdateQuotationData,
} from '../../domain/types/quotation.types.js';

const mapLineItems = (
  items: CreateQuotationRequest['lineItems'] | UpdateQuotationRequest['lineItems'],
) =>
  items?.map((item, index) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    category: item.category,
    sourcePackageId: item.sourcePackageId ?? null,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.unitPrice,
    discount: item.discount,
    taxRate: item.taxRate,
    sortOrder: item.sortOrder ?? index,
  }));

export const toCreateQuotationInput = (body: CreateQuotationRequest): Omit<
  CreateQuotationData,
  'createdByAdminId'
> => ({
  type: body.type,
  title: body.title,
  description: body.description,
  scopeOfWork: body.scopeOfWork,
  leadId: body.leadId ?? null,
  clientId: body.clientId ?? null,
  clientName: body.clientName,
  companyName: body.companyName,
  clientPhone: body.clientPhone,
  clientEmail: body.clientEmail,
  billingAddress: body.billingAddress ?? '',
  clientGstin: body.clientGstin,
  issueDate: new Date(`${body.issueDate}T00:00:00.000Z`),
  expiryDate: body.expiryDate ? new Date(`${body.expiryDate}T00:00:00.000Z`) : null,
  currency: body.currency ?? 'INR',
  notes: body.notes,
  terms: body.terms,
  paymentTerms: body.paymentTerms,
  deliveryTimeline: body.deliveryTimeline,
  sourcePackageId: body.sourcePackageId ?? null,
  lineItems: mapLineItems(body.lineItems) ?? [],
});

export const toUpdateQuotationInput = (body: UpdateQuotationRequest): UpdateQuotationData => ({
  title: body.title,
  description: body.description,
  scopeOfWork: body.scopeOfWork,
  leadId: body.leadId,
  clientId: body.clientId,
  clientName: body.clientName,
  companyName: body.companyName,
  clientPhone: body.clientPhone,
  clientEmail: body.clientEmail,
  billingAddress: body.billingAddress,
  clientGstin: body.clientGstin,
  issueDate: body.issueDate ? new Date(`${body.issueDate}T00:00:00.000Z`) : undefined,
  expiryDate:
    body.expiryDate === undefined
      ? undefined
      : body.expiryDate
        ? new Date(`${body.expiryDate}T00:00:00.000Z`)
        : null,
  currency: body.currency,
  notes: body.notes,
  terms: body.terms,
  paymentTerms: body.paymentTerms,
  deliveryTimeline: body.deliveryTimeline,
  lineItems: body.lineItems ? mapLineItems(body.lineItems) : undefined,
});
