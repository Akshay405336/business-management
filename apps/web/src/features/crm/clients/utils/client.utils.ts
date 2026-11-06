import type {
  ClientListQuery,
  ClientStatus,
  ClientType,
  CreateClientRequest,
  CrmClient,
  UpdateClientRequest,
} from '../types/client.types';

export type ClientStatusFilter = 'ALL' | ClientStatus;
export type ClientTypeFilter = 'ALL' | ClientType;

export type ClientSortKey =
  | 'default'
  | 'name-asc'
  | 'name-desc'
  | 'code-asc'
  | 'code-desc'
  | 'created-desc'
  | 'created-asc';

export type ClientFormState = {
  type: ClientType;
  referencePreview: string;
  name: string;
  primaryContact: string;
  email: string;
  phone: string;
  website: string;
  billingAddress: string;
  taxRegistration: string;
  notes: string;
};

export function emptyClientForm(): ClientFormState {
  return {
    type: 'INDIVIDUAL',
    referencePreview: '',
    name: '',
    primaryContact: '',
    email: '',
    phone: '',
    website: '',
    billingAddress: '',
    taxRegistration: '',
    notes: '',
  };
}

export function clientToForm(client: CrmClient): ClientFormState {
  return {
    type: client.type,
    referencePreview: client.referenceNumber,
    name: client.name,
    primaryContact: client.primaryContact,
    email: client.email ?? '',
    phone: client.phone ?? '',
    website: client.website ?? '',
    billingAddress: client.billingAddress,
    taxRegistration: client.taxRegistration,
    notes: client.notes,
  };
}

export function buildCreateClientPayload(form: ClientFormState): CreateClientRequest {
  return {
    type: form.type,
    name: form.name.trim(),
    primaryContact: form.primaryContact.trim() || undefined,
    email: form.email.trim() || null,
    phone: form.phone.trim(),
    website: form.website.trim() || null,
    billingAddress: form.billingAddress.trim() || undefined,
    taxRegistration: form.taxRegistration.trim() || undefined,
    notes: form.notes.trim() || undefined,
    status: 'ACTIVE',
  };
}

export function buildUpdateClientPayload(form: ClientFormState): UpdateClientRequest {
  return {
    type: form.type,
    name: form.name.trim(),
    primaryContact: form.primaryContact.trim(),
    email: form.email.trim() || null,
    phone: form.phone.trim(),
    website: form.website.trim() || null,
    billingAddress: form.billingAddress.trim(),
    taxRegistration: form.taxRegistration.trim(),
    notes: form.notes.trim(),
  };
}

export function sortKeyToListQuery(sortKey: ClientSortKey): Pick<ClientListQuery, 'sort' | 'sortDir'> {
  switch (sortKey) {
    case 'name-asc':
      return { sort: 'name', sortDir: 'asc' };
    case 'name-desc':
      return { sort: 'name', sortDir: 'desc' };
    case 'code-asc':
      return { sort: 'referenceNumber', sortDir: 'asc' };
    case 'code-desc':
      return { sort: 'referenceNumber', sortDir: 'desc' };
    case 'created-asc':
      return { sort: 'createdAt', sortDir: 'asc' };
    case 'created-desc':
      return { sort: 'createdAt', sortDir: 'desc' };
    default:
      return { sort: 'createdAt', sortDir: 'desc' };
  }
}

export function truncateLocation(address: string, max = 48): string {
  const trimmed = address.trim();
  if (!trimmed) return '—';
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}
