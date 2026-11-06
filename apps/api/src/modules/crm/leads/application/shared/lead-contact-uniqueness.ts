import {
  LEAD_DUPLICATE_EMAIL_MESSAGE,
  LEAD_DUPLICATE_PHONE_MESSAGE,
  leadContactDuplicateError,
} from '../../domain/policies/lead-contact-duplicate.policy.js';
import { LeadContactService } from '../../domain/services/lead-contact.service.js';
import type { LeadRepository } from '../../domain/repositories/lead.repository.js';

export async function assertLeadContactAvailable(
  leads: LeadRepository,
  organizationId: string,
  contact: {
    readonly phone?: string | null;
    readonly email?: string | null;
  },
  options?: { readonly excludeLeadId?: string },
): Promise<void> {
  const normalized = LeadContactService.normalizeForPersistence(contact);
  const phone = normalized.phone ?? null;
  const email = normalized.email ?? null;
  const excludeLeadId = options?.excludeLeadId;
  const conflicts: { field: 'phone' | 'email'; message: string }[] = [];

  if (phone) {
    const existingId = await leads.findLeadIdByPhone(organizationId, phone, excludeLeadId);
    if (existingId) {
      conflicts.push({ field: 'phone', message: LEAD_DUPLICATE_PHONE_MESSAGE });
    }
  }

  if (email) {
    const existingId = await leads.findLeadIdByEmail(organizationId, email, excludeLeadId);
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
  return LeadContactService.normalizeForPersistence(input);
}
