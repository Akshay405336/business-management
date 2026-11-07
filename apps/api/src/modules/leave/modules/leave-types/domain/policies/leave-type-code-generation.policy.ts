import { LeaveConflictError, LeaveValidationError } from '../../../../domain/errors/leave.errors.js';

export const LEAVE_TYPE_CODE_MAX_LENGTH = 64;

export function generateLeaveTypeCodeFromName(name: string): string {
  const code = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_');
  if (!code) {
    throw new LeaveValidationError(
      'Leave type name must contain letters or numbers so a code can be generated.',
    );
  }
  return code.slice(0, LEAVE_TYPE_CODE_MAX_LENGTH).replace(/_+$/g, '');
}

export function allocateUniqueLeaveTypeCode(
  base: string,
  existingCodes: ReadonlySet<string>,
): string {
  const taken = new Set([...existingCodes].map((code) => code.toUpperCase()));
  if (!taken.has(base)) return base;
  for (let index = 2; index <= 999; index += 1) {
    const suffix = `_${index}`;
    const candidate = `${base.slice(0, LEAVE_TYPE_CODE_MAX_LENGTH - suffix.length)}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
  throw new LeaveConflictError(
    'Could not generate a unique leave type code. Rename the leave type and try again.',
  );
}
