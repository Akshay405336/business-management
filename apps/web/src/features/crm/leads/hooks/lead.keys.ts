import type { LeadListQuery } from '../types/lead.types';

export const leadKeys = {
  all: ['crm', 'leads'] as const,
  lists: () => [...leadKeys.all, 'list'] as const,
  list: (query: LeadListQuery) => [...leadKeys.lists(), query] as const,
  details: () => [...leadKeys.all, 'detail'] as const,
  detail: (id: string) => [...leadKeys.details(), id] as const,
  activities: (id: string) => [...leadKeys.detail(id), 'activities'] as const,
  tags: (search?: string) => [...leadKeys.all, 'tags', search ?? ''] as const,
};
