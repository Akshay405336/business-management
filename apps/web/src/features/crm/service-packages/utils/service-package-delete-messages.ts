import { isApiError } from '@/shared/api/api-error';

const QUOTATION_REFERENCE_HINT = 'referenced by quotations' as const;

export function isServicePackageDeleteBlockedError(failure: unknown): boolean {
  if (!isApiError(failure)) return false;
  const message = failure.message.toLowerCase();
  return (
    message.includes(QUOTATION_REFERENCE_HINT) ||
    message.includes('referenced by proposal') ||
    failure.status === 409
  );
}

export function servicePackageDeleteBlockedMessage(): string {
  return 'This package could not be deleted. Try again or contact support if the problem continues.';
}
