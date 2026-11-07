import type { EmployeeListQuery } from '../types';

export const employeeQueryKeys = {
  all: ['employees'] as const,
  list: (query: EmployeeListQuery) => ['employees', 'list', query] as const,
  detail: (id: string) => ['employees', 'detail', id] as const,
  deletionImpact: (id: string) => ['employees', 'deletion-impact', id] as const,
  codePreview: ['employees', 'code-preview'] as const,
  assignable: (search: string) => ['employees', 'assignable', search] as const,
};
