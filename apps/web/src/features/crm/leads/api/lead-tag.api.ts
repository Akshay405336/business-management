import { CRM_ROUTES } from '@techwin/contracts';
import { apiRequest } from '@/shared/api/api-client';
import type { CrmLeadTag, CrmLeadTagListResponse } from '@techwin/contracts';
import type { CreateLeadTagRequest } from '@techwin/validation';

export async function listLeadTags(search?: string, signal?: AbortSignal): Promise<CrmLeadTagListResponse> {
  const query = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
  return apiRequest<CrmLeadTagListResponse>(`${CRM_ROUTES.leadTags}${query}`, {
    auth: true,
    signal,
  });
}

export async function createLeadTag(body: CreateLeadTagRequest, signal?: AbortSignal): Promise<CrmLeadTag> {
  return apiRequest<CrmLeadTag>(CRM_ROUTES.leadTags, {
    method: 'POST',
    auth: true,
    body,
    signal,
  });
}
