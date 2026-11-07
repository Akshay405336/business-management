import { isApiError } from '@/shared/api/api-error';
import { describeCrmError } from '@/features/admin/crm/utils/errors';

export const describeEmployeeError = describeCrmError;

export function applyEmployeeFieldErrors(
  error: unknown,
  setFieldErrors: (value: Record<string, string> | ((previous: Record<string, string>) => Record<string, string>)) => void,
): boolean {
  if (!isApiError(error) || error.details.length === 0) return false;
  const patch: Record<string, string> = {};
  for (const detail of error.details) {
    if (detail.path?.trim() && detail.message) {
      patch[detail.path] = detail.message;
    }
  }
  if (Object.keys(patch).length === 0) return false;
  setFieldErrors((previous) => ({ ...previous, ...patch }));
  return true;
}
