import { Prisma } from '../../../../../generated/prisma/client.js';
import {
  LEAD_DUPLICATE_EMAIL_MESSAGE,
  LEAD_DUPLICATE_PHONE_MESSAGE,
  leadContactDuplicateError,
} from '../../../domain/services/lead-contact-duplicate.policy.js';

const LEAD_PHONE_UNIQUE_INDEX = 'leads_organization_id_phone_key';
const LEAD_EMAIL_UNIQUE_INDEX = 'leads_organization_id_email_key';

export function rethrowLeadContactUniqueViolation(error: unknown): never {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    throw error;
  }

  const target = error.meta?.target;
  const targets = Array.isArray(target)
    ? target.map(String)
    : typeof target === 'string'
      ? [target]
      : [];

  const conflicts: { field: 'phone' | 'email'; message: string }[] = [];
  const targetText = targets.join(' ').toLowerCase();

  if (
    targets.includes('phone') ||
    targetText.includes('phone') ||
    targetText.includes(LEAD_PHONE_UNIQUE_INDEX)
  ) {
    conflicts.push({ field: 'phone', message: LEAD_DUPLICATE_PHONE_MESSAGE });
  }
  if (
    targets.includes('email') ||
    targetText.includes('email') ||
    targetText.includes(LEAD_EMAIL_UNIQUE_INDEX)
  ) {
    conflicts.push({ field: 'email', message: LEAD_DUPLICATE_EMAIL_MESSAGE });
  }

  if (conflicts.length > 0) {
    throw leadContactDuplicateError(conflicts);
  }

  throw error;
}
