import { CRM_ROUTES } from '@techwin/contracts';
import { apiRequest } from '@/shared/api/api-client';
import { buildQueryString } from '../utils/query-string';
import type {
  ChangeLeadStageRequest,
  CreateLeadActivityRequest,
  CreateLeadRequest,
  CrmLead,
  CrmLeadActivity,
  CrmLeadActivityListResponse,
  CrmLeadConvertResponse,
  CrmLeadListResponse,
  LeadListQuery,
  UpdateLeadRequest,
} from '../types';

export function listLeads(
  query: LeadListQuery = {},
  signal?: AbortSignal,
): Promise<CrmLeadListResponse> {
  return apiRequest<CrmLeadListResponse>(`${CRM_ROUTES.leads}${buildQueryString(query)}`, {
    auth: true,
    signal,
  });
}

export function getLead(id: string, signal?: AbortSignal): Promise<CrmLead> {
  return apiRequest<CrmLead>(CRM_ROUTES.lead(id), { auth: true, signal });
}

export function createLead(body: CreateLeadRequest): Promise<CrmLead> {
  return apiRequest<CrmLead>(CRM_ROUTES.leads, { method: 'POST', auth: true, body });
}

export function updateLead(id: string, body: UpdateLeadRequest): Promise<CrmLead> {
  return apiRequest<CrmLead>(CRM_ROUTES.lead(id), { method: 'PATCH', auth: true, body });
}

export function deleteLead(id: string): Promise<void> {
  return apiRequest<void>(CRM_ROUTES.lead(id), { method: 'DELETE', auth: true });
}

export function changeLeadStage(id: string, body: ChangeLeadStageRequest): Promise<CrmLead> {
  return apiRequest<CrmLead>(CRM_ROUTES.leadStage(id), { method: 'PATCH', auth: true, body });
}

export function listLeadActivities(
  id: string,
  signal?: AbortSignal,
): Promise<CrmLeadActivityListResponse> {
  return apiRequest<CrmLeadActivityListResponse>(CRM_ROUTES.leadActivities(id), {
    auth: true,
    signal,
  });
}

export function createLeadActivity(
  id: string,
  body: CreateLeadActivityRequest,
): Promise<CrmLeadActivity> {
  return apiRequest<CrmLeadActivity>(CRM_ROUTES.leadActivities(id), {
    method: 'POST',
    auth: true,
    body,
  });
}

export function convertLead(id: string): Promise<CrmLeadConvertResponse> {
  return apiRequest<CrmLeadConvertResponse>(CRM_ROUTES.leadConvert(id), {
    method: 'POST',
    auth: true,
  });
}
