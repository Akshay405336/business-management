import type { CreateQuotationData } from '../types/quotation.types.js';
import { QuotationTitle } from '../value-objects/quotation-title.vo.js';

export class QuotationCreationPolicy {
  static validate(input: CreateQuotationData): CreateQuotationData {
    QuotationTitle.create(input.title);
    return {
      ...input,
      clientEmail: input.clientEmail.trim().toLowerCase(),
      clientGstin: (input.clientGstin ?? '').trim().toUpperCase(),
      companyName: input.companyName ?? '',
      description: input.description ?? '',
      notes: input.notes ?? '',
      terms: input.terms ?? '',
      scopeOfWork: input.scopeOfWork ?? '',
      paymentTerms: input.paymentTerms ?? '',
      deliveryTimeline: input.deliveryTimeline ?? '',
      currency: input.currency ?? 'INR',
    };
  }
}
