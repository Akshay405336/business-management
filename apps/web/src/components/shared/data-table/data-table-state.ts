export type DataTablePhase = 'initial-loading' | 'empty' | 'error' | 'success';

export function deriveDataTablePhase(input: {
  loading: boolean;
  error: string | null;
  rowCount: number;
}): DataTablePhase {
  const { loading, error, rowCount } = input;
  if (loading && rowCount === 0 && !error) return 'initial-loading';
  if (error && rowCount === 0) return 'error';
  if (!loading && !error && rowCount === 0) return 'empty';
  return 'success';
}

export function isDataTableRefreshing(input: {
  loading: boolean;
  rowCount: number;
}): boolean {
  return input.loading && input.rowCount > 0;
}
