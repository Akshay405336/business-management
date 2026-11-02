/** Normalizes list query paging fields used across module list endpoints. */
export function normalizeListPage(page?: number): number {
  return page ?? 1;
}

export function normalizeListPageSize(pageSize?: number, defaultSize = 10): number {
  return pageSize ?? defaultSize;
}
