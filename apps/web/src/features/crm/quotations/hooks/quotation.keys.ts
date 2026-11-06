import type { QuotationListQuery } from '../types/quotation.types';

export const quotationKeys = {
  all: ['crm', 'quotations'] as const,
  list: (query: QuotationListQuery) => [...quotationKeys.all, 'list', query] as const,
  detail: (id: string) => [...quotationKeys.all, 'detail', id] as const,
  print: (id: string) => [...quotationKeys.all, 'print', id] as const,
};
