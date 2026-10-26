import {
  normalizedLeadEmailOrNull,
  normalizedLeadPhoneOrNull,
} from '@techwin/validation';
import { EmployeeValidationError } from '../domain/errors/employee.errors.js';
import type { EmployeeRepository } from '../domain/repositories/employee.repository.js';

const DUPLICATE_EMAIL = 'An employee with this work email already exists.';
const DUPLICATE_PHONE = 'An employee with this phone number already exists.';

export async function assertEmployeeContactAvailable(
  repository: EmployeeRepository,
  organizationId: string,
  contact: { workEmail?: string | null; phone?: string | null },
  options?: { excludeEmployeeId?: string },
): Promise<void> {
  const email = normalizedLeadEmailOrNull(contact.workEmail);
  const phone = normalizedLeadPhoneOrNull(contact.phone);
  const excludeEmployeeId = options?.excludeEmployeeId;
  const conflicts: { path: string; message: string }[] = [];

  if (email) {
    const existing = await repository.findEmployeeIdByWorkEmail(
      organizationId,
      email,
      excludeEmployeeId,
    );
    if (existing) conflicts.push({ path: 'workEmail', message: DUPLICATE_EMAIL });
  }
  if (phone) {
    const existing = await repository.findEmployeeIdByPhone(
      organizationId,
      phone,
      excludeEmployeeId,
    );
    if (existing) conflicts.push({ path: 'phone', message: DUPLICATE_PHONE });
  }
  if (conflicts.length > 0) {
    throw new EmployeeValidationError(
      conflicts.length === 1 ? conflicts[0]!.message : 'Update the highlighted contact fields.',
      conflicts,
    );
  }
}

export function normalizeEmployeeContact(input: {
  workEmail?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
}): { workEmail?: string | null; phone?: string | null; alternatePhone?: string | null } {
  const normalized: {
    workEmail?: string | null;
    phone?: string | null;
    alternatePhone?: string | null;
  } = {};
  if (input.workEmail !== undefined) {
    normalized.workEmail = normalizedLeadEmailOrNull(input.workEmail);
  }
  if (input.phone !== undefined) {
    normalized.phone = normalizedLeadPhoneOrNull(input.phone);
  }
  if (input.alternatePhone !== undefined) {
    normalized.alternatePhone = normalizedLeadPhoneOrNull(input.alternatePhone);
  }
  return normalized;
}
