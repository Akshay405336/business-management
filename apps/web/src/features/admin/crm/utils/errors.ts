import { isApiError } from '@/shared/api/api-error';

export function describeCrmError(error: unknown): string {
  if (isApiError(error)) {
    const detail = error.details[0];
    if (detail?.path && detail.message) {
      return `${error.message} (${detail.path}: ${detail.message})`;
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}
