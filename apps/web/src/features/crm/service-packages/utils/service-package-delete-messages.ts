import { isApiError } from '@/shared/api/api-error';

const PROPOSAL_REFERENCE_HINT =
  'referenced by proposal' as const;

export function isServicePackageDeleteBlockedError(failure: unknown): boolean {
  if (!isApiError(failure)) return false;
  const message = failure.message.toLowerCase();
  return message.includes(PROPOSAL_REFERENCE_HINT) || failure.status === 409;
}

export function servicePackageDeleteBlockedMessage(): string {
  return 'This package could not be deleted. Try again or contact support if the problem continues.';
}
