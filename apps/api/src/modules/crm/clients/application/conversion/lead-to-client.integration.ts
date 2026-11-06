import { normalizedLeadPhoneForStorage } from '@techwin/validation';
import { Client } from '../../domain/entities/client.entity.js';
import type { ClientType } from '../../domain/enums/client-type.enum.js';
import type { CreateClientData } from '../../domain/types/client.types.js';

/** Maps lead read-model fields into client creation data during lead conversion. */
export function buildClientCreateFromLead(input: {
  readonly leadId: string;
  readonly fullName: string;
  readonly companyName: string;
  readonly email: string | null;
  /** Validated non-empty before conversion (see lead store). */
  readonly phone: string;
  readonly website: string | null;
  readonly createdByAdminId: string;
}): CreateClientData {
  const type: ClientType = input.companyName.trim() ? 'COMPANY' : 'INDIVIDUAL';
  const name = input.companyName.trim() || input.fullName.trim();
  const phone = input.phone;
  return {
    type,
    name,
    primaryContact: input.fullName.trim(),
    email: input.email,
    phone,
    phoneNormalized: normalizedLeadPhoneForStorage(phone),
    website: input.website,
    sourceLeadId: input.leadId,
    createdByAdminId: input.createdByAdminId,
    status: 'ACTIVE',
  };
}

/** Applies Client domain validation to lead conversion payload. */
export function prepareClientCreateFromLead(input: Parameters<typeof buildClientCreateFromLead>[0]): CreateClientData {
  return Client.validateCreate(buildClientCreateFromLead(input));
}
