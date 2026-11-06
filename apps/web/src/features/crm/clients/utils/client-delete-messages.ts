import { isApiError } from '@/shared/api/api-error';

const DEPENDENCY_HINTS = [
  'projects are linked',
  'quotations reference',
  'converted lead',
  'whatsapp contacts',
] as const;

export function isClientDeleteBlockedError(failure: unknown): boolean {
  if (!isApiError(failure)) return false;
  if (failure.status === 409) return true;
  const message = failure.message.toLowerCase();
  return DEPENDENCY_HINTS.some((hint) => message.includes(hint));
}

export function clientDeleteBlockedMessage(failure: unknown): string {
  if (isApiError(failure) && failure.message.trim()) {
    return failure.message;
  }
  return 'This client could not be deleted because related records still reference it.';
}
