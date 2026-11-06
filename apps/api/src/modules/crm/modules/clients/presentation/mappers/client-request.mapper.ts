import { normalizedLeadPhoneForStorage } from '@techwin/validation';
import type { ChangeClientStatusRequest, CreateClientRequest, UpdateClientRequest } from '@techwin/validation';
import type { CreateClientData, UpdateClientData } from '../../domain/types/client.types.js';
import type { ClientStatus } from '../../domain/enums/client-status.enum.js';

export function toCreateClientInput(
  body: CreateClientRequest,
): Omit<CreateClientData, 'createdByAdminId'> {
  return {
    type: body.type,
    name: body.name,
    primaryContact: body.primaryContact,
    email: body.email,
    phone: body.phone,
    phoneNormalized: normalizedLeadPhoneForStorage(body.phone),
    website: body.website,
    billingAddress: body.billingAddress,
    taxRegistration: body.taxRegistration,
    status: body.status,
    notes: body.notes,
    sourceLeadId: body.sourceLeadId,
  };
}

export function toUpdateClientInput(body: UpdateClientRequest): UpdateClientData & {
  archived?: boolean;
} {
  const { archived, ...rest } = body;
  return { ...rest, archived };
}

export function toChangeClientStatusInput(body: ChangeClientStatusRequest): ClientStatus {
  return body.status;
}
