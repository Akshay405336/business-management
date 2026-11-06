import type { ClientListQuery } from '../types/client.types';

export const clientKeys = {
  all: ['crm', 'clients'] as const,
  list: (query: ClientListQuery) => [...clientKeys.all, 'list', query] as const,
  detail: (id: string) => [...clientKeys.all, 'detail', id] as const,
  referencePreview: () => [...clientKeys.all, 'reference-preview'] as const,
};
