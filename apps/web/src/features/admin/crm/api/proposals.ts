import { CRM_ROUTES } from '@techwin/contracts';
import type { ProposalDocumentType } from '@techwin/contracts';
import { apiRequest } from '@/shared/api/api-client';
import { buildQueryString } from '../utils/query-string';
import type {
  ChangeProposalStatusRequest,
  CreateProposalRequest,
  CrmProposal,
  CrmProposalListResponse,
  CrmProposalPrintResponse,
  ProposalDocumentCodePreviewResponse,
  ProposalListQuery,
  UpdateProposalRequest,
} from '../types';

export function listProposals(
  query: Partial<ProposalListQuery> = {},
  signal?: AbortSignal,
): Promise<CrmProposalListResponse> {
  return apiRequest<CrmProposalListResponse>(
    `${CRM_ROUTES.proposals}${buildQueryString(query)}`,
    { auth: true, signal },
  );
}

export function previewProposalCode(
  type: ProposalDocumentType,
  signal?: AbortSignal,
): Promise<ProposalDocumentCodePreviewResponse> {
  return apiRequest<ProposalDocumentCodePreviewResponse>(
    `${CRM_ROUTES.proposalCodePreview}${buildQueryString({ type })}`,
    { auth: true, signal },
  );
}

export function deleteProposal(id: string): Promise<void> {
  return apiRequest<void>(CRM_ROUTES.proposal(id), {
    method: 'DELETE',
    auth: true,
  });
}

export function getProposal(id: string, signal?: AbortSignal): Promise<CrmProposal> {
  return apiRequest<CrmProposal>(CRM_ROUTES.proposal(id), { auth: true, signal });
}

export function createProposal(body: CreateProposalRequest): Promise<CrmProposal> {
  return apiRequest<CrmProposal>(CRM_ROUTES.proposals, { method: 'POST', auth: true, body });
}

export function updateProposal(id: string, body: UpdateProposalRequest): Promise<CrmProposal> {
  return apiRequest<CrmProposal>(CRM_ROUTES.proposal(id), { method: 'PATCH', auth: true, body });
}

export function changeProposalStatus(
  id: string,
  body: ChangeProposalStatusRequest,
): Promise<CrmProposal> {
  return apiRequest<CrmProposal>(CRM_ROUTES.proposalStatus(id), {
    method: 'POST',
    auth: true,
    body,
  });
}

export function getProposalPrint(
  id: string,
  signal?: AbortSignal,
): Promise<CrmProposalPrintResponse> {
  return apiRequest<CrmProposalPrintResponse>(CRM_ROUTES.proposalPrint(id), {
    auth: true,
    signal,
  });
}
