import { CRM_ROUTES } from '@techwin/contracts';
import { apiRequest } from '@/shared/api/api-client';
import type { CrmLeadImportPreviewResponse, CrmLeadImportResponse } from '@techwin/contracts';
import type { z } from 'zod';
import type { executeLeadImportRequestSchema } from '@techwin/validation';

export type LeadImportPayload = z.infer<typeof executeLeadImportRequestSchema>;

export async function validateLeadImport(
  body: LeadImportPayload,
  signal?: AbortSignal,
): Promise<CrmLeadImportPreviewResponse> {
  return apiRequest<CrmLeadImportPreviewResponse>(CRM_ROUTES.leadImportValidate, {
    method: 'POST',
    auth: true,
    body,
    signal,
  });
}

export async function executeLeadImport(
  body: LeadImportPayload,
  signal?: AbortSignal,
): Promise<CrmLeadImportResponse> {
  return apiRequest<CrmLeadImportResponse>(CRM_ROUTES.leadImport, {
    method: 'POST',
    auth: true,
    body,
    signal,
  });
}
