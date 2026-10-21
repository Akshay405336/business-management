import { CRM_ROUTES } from '@techwin/contracts';
import { apiRequest } from '@/shared/api/api-client';
import type {
  CreateClientRequest,
  CrmClient,
  CrmClientListResponse,
  CrmLeadConvertResponse,
  UpdateClientRequest,
} from '../types';

export function listClients(signal?: AbortSignal): Promise<CrmClientListResponse> {
  return apiRequest<CrmClientListResponse>(CRM_ROUTES.clients, { auth: true, signal });
}

export function getClient(id: string, signal?: AbortSignal): Promise<CrmClient> {
  return apiRequest<CrmClient>(CRM_ROUTES.client(id), { auth: true, signal });
}

export function createClient(body: CreateClientRequest): Promise<CrmClient> {
  return apiRequest<CrmClient>(CRM_ROUTES.clients, { method: 'POST', auth: true, body });
}

export function updateClient(id: string, body: UpdateClientRequest): Promise<CrmClient> {
  return apiRequest<CrmClient>(CRM_ROUTES.client(id), { method: 'PATCH', auth: true, body });
}

export function convertClientFromLead(leadId: string): Promise<CrmLeadConvertResponse> {
  return apiRequest<CrmLeadConvertResponse>(CRM_ROUTES.clientFromLead(leadId), {
    method: 'POST',
    auth: true,
  });
}
