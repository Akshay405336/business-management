import type { z } from 'zod';
import { isApiError } from '@/shared/api/api-error';
import { zodErrorToFieldMap } from '@/shared/form/zod-field-error';
import {
  describeOrgAccessError,
  humanizeOrgAccessFieldError,
  humanizeOrgAccessFieldErrorMap,
  isOrgAccessSchemaContractError,
  orgAccessDetailFieldPath,
} from './org-access-form-errors';

export {
  describeOrgAccessError,
  humanizeOrgAccessFieldError,
  humanizeOrgAccessFieldErrorMap,
  orgAccessDetailFieldPath,
};

export function applyOrgAccessFieldErrors(
  error: unknown,
  setFieldErrors: (value: Record<string, string> | ((previous: Record<string, string>) => Record<string, string>)) => void,
): boolean {
  if (!isApiError(error) || error.details.length === 0) return false;
  const patch: Record<string, string> = {};
  for (const detail of error.details) {
    if (isOrgAccessSchemaContractError(detail.message)) {
      continue;
    }
    const path = orgAccessDetailFieldPath(detail);
    if (path && detail.message) {
      patch[path] = humanizeOrgAccessFieldError(path, detail.message);
    }
  }
  if (Object.keys(patch).length === 0) return false;
  setFieldErrors((previous) => ({ ...previous, ...patch }));
  return true;
}

export function mapOrgAccessZodFieldErrors(error: z.ZodError): Record<string, string> {
  const raw = zodErrorToFieldMap(error);
  const filtered: Record<string, string> = {};
  for (const [field, message] of Object.entries(raw)) {
    if (isOrgAccessSchemaContractError(message)) continue;
    filtered[field] = humanizeOrgAccessFieldError(field, message);
  }
  return filtered;
}

export function orgAccessZodHasSchemaContractError(error: z.ZodError): boolean {
  return error.issues.some((issue) => isOrgAccessSchemaContractError(issue.message));
}
