import { toUtcDateOnlyString } from '../../domain/utils/quotation-date.utils.js';
import type { QuotationPrintReadModel } from '../../domain/types/quotation-read-model.js';

export function defaultQuotationEmailSubject(print: QuotationPrintReadModel): string {
  return `Quotation ${print.documentNumber} - ${print.title}`;
}

export function defaultQuotationEmailBody(print: QuotationPrintReadModel): string {
  const clientName = print.clientName.trim() || 'Customer';
  const companyName = print.organizationName.trim() || 'Our team';
  const validUntil = print.expiryDate ? toUtcDateOnlyString(print.expiryDate) : 'the date shown';
  return [
    `Dear ${clientName},`,
    '',
    `Please find attached our quotation ${print.documentNumber} for ${print.title}.`,
    '',
    `The quotation is valid until ${validUntil}.`,
    '',
    'Please review the attached document and contact us if you have any questions.',
    '',
    'Regards,',
    companyName,
  ].join('\n');
}
