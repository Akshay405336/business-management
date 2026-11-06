import {
  CLIENT_LIST_DEFAULT_PAGE_SIZE,
  CLIENT_LIST_LEGACY_FIRST_PAGE_SIZE,
} from '../../domain/types/client.types.js';

export function resolveClientListPagination(filters: {
  readonly page?: number;
  readonly pageSize?: number;
}): { readonly page: number; readonly pageSize: number; readonly legacyFirstPage: boolean } {
  const hasExplicitPagination =
    filters.page !== undefined || filters.pageSize !== undefined;
  if (!hasExplicitPagination) {
    return {
      page: 1,
      pageSize: CLIENT_LIST_LEGACY_FIRST_PAGE_SIZE,
      legacyFirstPage: true,
    };
  }
  return {
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? CLIENT_LIST_DEFAULT_PAGE_SIZE,
    legacyFirstPage: false,
  };
}
