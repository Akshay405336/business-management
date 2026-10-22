import { isApiError } from '@/shared/api/api-error';

function pickBestApiDetail(
  details: readonly { path: string; message: string }[],
): { path: string; message: string } | undefined {
  if (details.length === 0) return undefined;
  const meaningful = details.find(
    (detail) => detail.message && detail.message !== 'Invalid input',
  );
  return meaningful ?? details[0];
}

export function describeCrmError(error: unknown): string {
  if (isApiError(error)) {
    const detail = pickBestApiDetail(error.details);
    if (detail?.message) {
      const label = detail.path ? `${detail.path}: ` : '';
      if (error.message === detail.message) {
        return `${label}${detail.message}`.trim();
      }
      if (detail.message !== 'Invalid input') {
        return `${detail.message}${detail.path ? ` (${detail.path})` : ''}`;
      }
      return `${error.message}${detail.path ? ` (${detail.path})` : ''}`;
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}
