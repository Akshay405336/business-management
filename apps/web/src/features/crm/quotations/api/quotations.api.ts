import { CRM_ROUTES } from '@techwin/contracts';
import type { QuotationDocumentType } from '@techwin/contracts';
import { apiBinaryRequest, apiRequest } from '@/shared/api/api-client';
import { buildQueryString } from '@/features/crm/leads/utils/query-string';
import type {
  ChangeQuotationStatusRequest,
  CreateQuotationRequest,
  SendQuotationRequest,
  CrmQuotation,
  CrmQuotationListResponse,
  CrmQuotationPrintResponse,
  QuotationDocumentCodePreviewResponse,
  QuotationListQuery,
  UpdateQuotationRequest,
} from '../types/quotation.types';

export function listQuotations(
  query: Partial<QuotationListQuery> = {},
  signal?: AbortSignal,
): Promise<CrmQuotationListResponse> {
  return apiRequest<CrmQuotationListResponse>(
    `${CRM_ROUTES.quotations}${buildQueryString(query)}`,
    { auth: true, signal },
  );
}

export function previewQuotationCode(
  type: QuotationDocumentType,
  signal?: AbortSignal,
): Promise<QuotationDocumentCodePreviewResponse> {
  return apiRequest<QuotationDocumentCodePreviewResponse>(
    `${CRM_ROUTES.quotationCodePreview}${buildQueryString({ type })}`,
    { auth: true, signal },
  );
}

export function getQuotation(id: string, signal?: AbortSignal): Promise<CrmQuotation> {
  return apiRequest<CrmQuotation>(CRM_ROUTES.quotation(id), { auth: true, signal });
}

export function createQuotation(body: CreateQuotationRequest): Promise<CrmQuotation> {
  return apiRequest<CrmQuotation>(CRM_ROUTES.quotations, { method: 'POST', auth: true, body });
}

export function updateQuotation(id: string, body: UpdateQuotationRequest): Promise<CrmQuotation> {
  return apiRequest<CrmQuotation>(CRM_ROUTES.quotation(id), { method: 'PATCH', auth: true, body });
}

export function changeQuotationStatus(
  id: string,
  body: ChangeQuotationStatusRequest,
): Promise<CrmQuotation> {
  return apiRequest<CrmQuotation>(CRM_ROUTES.quotationStatus(id), {
    method: 'PATCH',
    auth: true,
    body,
  });
}

export function deleteQuotation(id: string): Promise<void> {
  return apiRequest<void>(CRM_ROUTES.quotation(id), { method: 'DELETE', auth: true });
}

export function getQuotationPrint(
  id: string,
  signal?: AbortSignal,
): Promise<CrmQuotationPrintResponse> {
  return apiRequest<CrmQuotationPrintResponse>(CRM_ROUTES.quotationPrint(id), {
    auth: true,
    signal,
  });
}

export function getQuotationPdfBlob(id: string, signal?: AbortSignal): Promise<Blob> {
  return apiBinaryRequest(CRM_ROUTES.quotationPrintPdf(id), { auth: true, signal });
}

export function sendQuotation(id: string, body: SendQuotationRequest): Promise<CrmQuotation> {
  return apiRequest<CrmQuotation>(CRM_ROUTES.quotationSend(id), {
    method: 'POST',
    auth: true,
    body,
  });
}
