import { CRM_ROUTES } from '@techwin/contracts';
import { apiRequest } from '@/shared/api/api-client';
import type {
  ChangeProposalStatusRequest,
  CreateProposalRequest,
  CrmProposal,
  CrmProposalListResponse,
  CrmProposalPrintResponse,
  UpdateProposalRequest,
} from '../types';

export function listProposals(signal?: AbortSignal): Promise<CrmProposalListResponse> {
  return apiRequest<CrmProposalListResponse>(CRM_ROUTES.proposals, { auth: true, signal });
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
