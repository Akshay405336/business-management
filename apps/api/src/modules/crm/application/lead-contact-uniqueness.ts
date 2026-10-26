import {
  normalizedLeadEmailOrNull,
  normalizedLeadPhoneOrNull,
} from '@techwin/validation';
import {
  LEAD_DUPLICATE_EMAIL_MESSAGE,
  LEAD_DUPLICATE_PHONE_MESSAGE,
  leadContactDuplicateError,
} from '../domain/services/lead-contact-duplicate.policy.js';
import type { CrmRepository } from '../domain/repositories/crm.repository.js';

export async function assertLeadContactAvailable(
  crm: CrmRepository,
  organizationId: string,
  contact: {
    readonly phone?: string | null;
    readonly email?: string | null;
  },
  options?: { readonly excludeLeadId?: string },
): Promise<void> {
  const phone = normalizedLeadPhoneOrNull(contact.phone);
  const email = normalizedLeadEmailOrNull(contact.email);
  const excludeLeadId = options?.excludeLeadId;
  const conflicts: { field: 'phone' | 'email'; message: string }[] = [];

  if (phone) {
    const existingId = await crm.findLeadIdByPhone(organizationId, phone, excludeLeadId);
    if (existingId) {
      conflicts.push({ field: 'phone', message: LEAD_DUPLICATE_PHONE_MESSAGE });
    }
  }

  if (email) {
    const existingId = await crm.findLeadIdByEmail(organizationId, email, excludeLeadId);
    if (existingId) {
      conflicts.push({ field: 'email', message: LEAD_DUPLICATE_EMAIL_MESSAGE });
    }
  }

  if (conflicts.length > 0) {
    throw leadContactDuplicateError(conflicts);
  }
}

export function normalizeLeadContactForPersistence(input: {
  readonly phone?: string | null;
  readonly email?: string | null;
}): { phone?: string | null; email?: string | null } {
  const normalized: { phone?: string | null; email?: string | null } = {};
  if (input.phone !== undefined) {
    normalized.phone = normalizedLeadPhoneOrNull(input.phone);
  }
  if (input.email !== undefined) {
    normalized.email = normalizedLeadEmailOrNull(input.email);
  }
  return normalized;
}
