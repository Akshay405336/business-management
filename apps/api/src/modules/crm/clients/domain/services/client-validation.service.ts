import { normalizedLeadPhoneForStorage } from '@techwin/validation';
import { ClientEmail } from '../value-objects/client-email.vo.js';
import { ClientName } from '../value-objects/client-name.vo.js';
import { ClientPhone } from '../value-objects/client-phone.vo.js';
import type { CreateClientData, UpdateClientData } from '../types/client.types.js';

const trimOptional = (value: string | undefined, fallback = ''): string =>
  value === undefined ? fallback : value.trim();

export class ClientValidationService {
  static normalizeCreate(input: CreateClientData): CreateClientData {
    const name = ClientName.create(input.name).value;
    const email = ClientEmail.create(input.email).value;
    const phone = ClientPhone.createRequired(input.phone).value;
    const phoneNormalized = normalizedLeadPhoneForStorage(phone);
    return {
      ...input,
      name,
      primaryContact: trimOptional(input.primaryContact),
      email,
      phone,
      phoneNormalized,
      website: input.website?.trim() || null,
      billingAddress: trimOptional(input.billingAddress),
      taxRegistration: trimOptional(input.taxRegistration),
      notes: trimOptional(input.notes),
      status: input.status ?? 'ACTIVE',
    };
  }

  static normalizeUpdate(input: UpdateClientData): UpdateClientData {
    const phoneVo =
      input.phone !== undefined ? ClientPhone.createRequired(input.phone) : undefined;
    return {
      ...input,
      ...(input.name !== undefined ? { name: ClientName.create(input.name).value } : {}),
      ...(input.email !== undefined ? { email: ClientEmail.create(input.email).value } : {}),
      ...(phoneVo !== undefined
        ? {
            phone: phoneVo.value,
            phoneNormalized: normalizedLeadPhoneForStorage(phoneVo.value),
          }
        : {}),
      ...(input.primaryContact !== undefined
        ? { primaryContact: input.primaryContact.trim() }
        : {}),
      ...(input.website !== undefined ? { website: input.website?.trim() || null } : {}),
      ...(input.billingAddress !== undefined
        ? { billingAddress: input.billingAddress.trim() }
        : {}),
      ...(input.taxRegistration !== undefined
        ? { taxRegistration: input.taxRegistration.trim() }
        : {}),
      ...(input.notes !== undefined ? { notes: input.notes.trim() } : {}),
    };
  }
}
