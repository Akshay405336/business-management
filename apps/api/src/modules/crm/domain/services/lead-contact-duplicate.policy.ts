import { CrmValidationError } from '../errors/crm.errors.js';

export const LEAD_DUPLICATE_PHONE_MESSAGE = 'A lead with this phone number already exists.';
export const LEAD_DUPLICATE_EMAIL_MESSAGE = 'A lead with this email address already exists.';

export type LeadContactDuplicateField = 'phone' | 'email';

export function leadContactDuplicateError(
  conflicts: readonly { field: LeadContactDuplicateField; message: string }[],
): CrmValidationError {
  if (conflicts.length === 0) {
    throw new Error('leadContactDuplicateError requires at least one conflict.');
  }
  const message =
    conflicts.length === 1
      ? conflicts[0]!.message
      : 'A lead with this contact information already exists.';
  return new CrmValidationError(
    message,
    conflicts.map((conflict) => ({ path: conflict.field, message: conflict.message })),
  );
}
