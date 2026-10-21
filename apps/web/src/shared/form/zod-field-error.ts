import type { Dispatch, SetStateAction } from 'react';
import type { z } from 'zod';

export function zodFieldError(schema: z.ZodType, value: unknown): string | undefined {
  const result = schema.safeParse(value);
  if (result.success) return undefined;
  const message = result.error.issues[0]?.message;
  return typeof message === 'string' ? message : undefined;
}

export function mergeFieldErrors(
  live: Partial<Record<string, string>>,
  stored: Record<string, string>,
  key: string,
): string | undefined {
  return live[key] ?? stored[key];
}

export function clearFormFieldError(
  setErrors: Dispatch<SetStateAction<Record<string, string>>>,
  key: string,
) {
  setErrors((current) => {
    if (!(key in current)) return current;
    const next = { ...current };
    delete next[key];
    return next;
  });
}

export function zodErrorToFieldMap(error: z.ZodError): Record<string, string> {
  const map: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !map[key]) {
      map[key] = issue.message;
    }
  }
  return map;
}
