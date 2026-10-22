import type { ApiErrorDetail } from '@techwin/contracts';
import type { Dispatch, SetStateAction } from 'react';
import type { z } from 'zod';

export function zodFieldError(schema: z.ZodType, value: unknown): string | undefined {
  const result = schema.safeParse(value);
  if (result.success) return undefined;
  const message = formatZodIssueMessage(result.error.issues[0]);
  return message ?? undefined;
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

function issuePathKey(path: readonly PropertyKey[], issue: z.ZodIssue): string {
  const joined = path.map(String).join('.');
  if (joined) return joined;
  if (issue.code === 'unrecognized_keys' && 'keys' in issue && Array.isArray(issue.keys)) {
    const first = issue.keys[0];
    if (first !== undefined) return String(first);
  }
  return joined;
}

function isZodIssue(value: unknown): value is z.ZodIssue {
  return typeof value === 'object' && value !== null && 'code' in value;
}

/** Prefer nested custom messages (e.g. money parse) over generic union errors. */
export function formatZodIssueMessage(issue: z.ZodIssue | undefined): string | undefined {
  if (!issue) return undefined;
  if (issue.code === 'invalid_union' && 'errors' in issue && Array.isArray(issue.errors)) {
    for (const branch of issue.errors) {
      if (!Array.isArray(branch)) continue;
      for (const nested of branch) {
        if (!isZodIssue(nested)) continue;
        const nestedMessage = formatZodIssueMessage(nested);
        if (nestedMessage && nestedMessage !== 'Invalid input') return nestedMessage;
      }
    }
  }
  if (typeof issue.message === 'string' && issue.message.length > 0) {
    return issue.message;
  }
  return undefined;
}

export function zodIssuesToFieldMap(error: z.ZodError): Record<string, string> {
  const map: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issuePathKey(issue.path, issue);
    if (!key || map[key]) continue;
    const message = formatZodIssueMessage(issue);
    if (message) map[key] = message;
  }
  return map;
}

/** @deprecated Prefer {@link zodIssuesToFieldMap} for nested form fields (e.g. phases). */
export function zodErrorToFieldMap(error: z.ZodError): Record<string, string> {
  return zodIssuesToFieldMap(error);
}

export function apiDetailsToFieldMap(
  details: readonly ApiErrorDetail[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const detail of details) {
    if (!detail.message || map[detail.path]) continue;
    const key = detail.path || '_form';
    map[key] = detail.message;
  }
  return map;
}
