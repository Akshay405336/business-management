import { API_PREFIX } from './http.js';
import type { ServicePackageSnapshot } from './service-packages.js';

export const CRM_ROUTES = {
  pipelines: `${API_PREFIX}/crm/pipelines`,
  defaultPipeline: `${API_PREFIX}/crm/pipelines/default`,
  pipeline: (id: string) => `${API_PREFIX}/crm/pipelines/${id}`,
  pipelineStages: (pipelineId: string) => `${API_PREFIX}/crm/pipelines/${pipelineId}/stages`,
  pipelineStage: (pipelineId: string, stageId: string) =>
    `${API_PREFIX}/crm/pipelines/${pipelineId}/stages/${stageId}`,
  pipelineStageReorder: (pipelineId: string) =>
    `${API_PREFIX}/crm/pipelines/${pipelineId}/stages/reorder`,
  pipelineStageActivate: (pipelineId: string, stageId: string) =>
    `${API_PREFIX}/crm/pipelines/${pipelineId}/stages/${stageId}/activate`,
  pipelineStageDeactivate: (pipelineId: string, stageId: string) =>
    `${API_PREFIX}/crm/pipelines/${pipelineId}/stages/${stageId}/deactivate`,
  leads: `${API_PREFIX}/crm/leads`,
  lead: (id: string) => `${API_PREFIX}/crm/leads/${id}`,
  leadStage: (id: string) => `${API_PREFIX}/crm/leads/${id}/stage`,
  leadActivities: (id: string) => `${API_PREFIX}/crm/leads/${id}/activities`,
  leadConvert: (id: string) => `${API_PREFIX}/crm/leads/${id}/convert`,
  clients: `${API_PREFIX}/crm/clients`,
  client: (id: string) => `${API_PREFIX}/crm/clients/${id}`,
  clientFromLead: (leadId: string) => `${API_PREFIX}/crm/clients/from-lead/${leadId}`,
  proposals: `${API_PREFIX}/crm/proposals`,
  servicePackages: `${API_PREFIX}/crm/service-packages`,
  servicePackage: (id: string) => `${API_PREFIX}/crm/service-packages/${id}`,
  servicePackageStatus: (id: string) => `${API_PREFIX}/crm/service-packages/${id}/status`,
  servicePackageCodePreview: `${API_PREFIX}/crm/service-packages/code-preview`,
  proposal: (id: string) => `${API_PREFIX}/crm/proposals/${id}`,
  proposalStatus: (id: string) => `${API_PREFIX}/crm/proposals/${id}/status`,
  proposalPrint: (id: string) => `${API_PREFIX}/crm/proposals/${id}/print`,
} as const;

export type PipelineStatus = 'ACTIVE' | 'INACTIVE';
export type PipelineStageOutcome = 'NONE' | 'WON' | 'LOST';
export type LeadPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type LeadSource =
  'WEBSITE' | 'REFERRAL' | 'COLD_CALL' | 'EMAIL' | 'SOCIAL' | 'EVENT' | 'PARTNER' | 'OTHER';
export type LeadActivityType =
  | 'FIRST_CALL'
  | 'FOLLOW_UP_CALL'
  | 'MEETING'
  | 'EMAIL'
  | 'NOTE'
  | 'TASK'
  | 'STAGE_CHANGE'
  | 'PROPOSAL_CREATED'
  | 'PROPOSAL_STATUS_CHANGE'
  | 'LEAD_CONVERTED';
export type ClientType = 'INDIVIDUAL' | 'COMPANY';
export type ClientStatus = 'ACTIVE' | 'INACTIVE';
export type ProposalDocumentType = 'PROPOSAL' | 'QUOTATION';
export type ProposalStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';

export interface CrmPipelineStage {
  readonly id: string;
  readonly pipelineId: string;
  readonly name: string;
  readonly description: string;
  readonly color: string;
  readonly status: PipelineStatus;
  readonly sortOrder: number;
  readonly outcome: PipelineStageOutcome;
  readonly leadCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CrmPipeline {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly status: PipelineStatus;
  readonly isDefault: boolean;
  readonly sortOrder: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly stages: readonly CrmPipelineStage[];
}

export interface CrmPipelineListResponse {
  readonly pipelines: readonly CrmPipeline[];
}

export interface CrmLead {
  readonly id: string;
  readonly referenceNumber: string;
  readonly fullName: string;
  readonly companyName: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly website: string | null;
  readonly source: LeadSource;
  readonly pipelineId: string;
  readonly stageId: string;
  readonly assignedAdminId: string | null;
  readonly priority: LeadPriority;
  readonly estimatedValue: string;
  readonly currency: string;
  readonly expectedCloseDate: string | null;
  readonly nextFollowUpDate: string | null;
  readonly description: string;
  readonly tags: readonly string[];
  readonly convertedClientId: string | null;
  readonly convertedAt: string | null;
  readonly archivedAt: string | null;
  readonly kanbanSortOrder: number;
  readonly lastActivityAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CrmLeadListResponse {
  readonly items: readonly CrmLead[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface CrmLeadActivity {
  readonly id: string;
  readonly leadId: string;
  readonly type: LeadActivityType;
  readonly title: string;
  readonly description: string;
  readonly occurredAt: string;
  readonly dueAt: string | null;
  readonly completedAt: string | null;
  readonly metadata: unknown;
  readonly createdByAdminId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CrmLeadActivityListResponse {
  readonly activities: readonly CrmLeadActivity[];
}

export interface CrmLeadConvertResponse {
  readonly lead: CrmLead;
  readonly client: CrmClient;
}

export interface CrmClient {
  readonly id: string;
  readonly referenceNumber: string;
  readonly type: ClientType;
  readonly name: string;
  readonly primaryContact: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly website: string | null;
  readonly billingAddress: string;
  readonly taxRegistration: string;
  readonly status: ClientStatus;
  readonly notes: string;
  readonly sourceLeadId: string | null;
  readonly archivedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CrmClientListResponse {
  readonly clients: readonly CrmClient[];
}

export interface CrmProposalLineItem {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly quantity: string;
  readonly unit: string;
  readonly unitPrice: string;
  readonly discount: string;
  readonly taxRate: string;
  readonly lineTotal: string;
  readonly sortOrder: number;
}

export interface CrmProposal {
  readonly id: string;
  readonly documentNumber: string;
  readonly type: ProposalDocumentType;
  readonly status: ProposalStatus;
  readonly title: string;
  readonly description: string;
  readonly leadId: string | null;
  readonly clientId: string | null;
  readonly issueDate: string;
  readonly expiryDate: string | null;
  readonly currency: string;
  readonly subtotal: string;
  readonly discountTotal: string;
  readonly taxTotal: string;
  readonly grandTotal: string;
  readonly notes: string;
  readonly terms: string;
  readonly version: number;
  readonly sourcePackageId: string | null;
  readonly packageSnapshot: ServicePackageSnapshot | null;
  readonly lineItems: readonly CrmProposalLineItem[];
  readonly createdAt: string;
  readonly updatedAt: string;
}


export interface CrmProposalListResponse {
  readonly proposals: readonly CrmProposal[];
}

export interface CrmProposalPrintResponse extends CrmProposal {
  readonly organizationName: string;
}
