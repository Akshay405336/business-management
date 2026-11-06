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
  pipelineBulkStatus: `${API_PREFIX}/crm/pipelines/bulk/status`,
  pipelineBulkDelete: `${API_PREFIX}/crm/pipelines/bulk/delete`,
  leads: `${API_PREFIX}/crm/leads`,
  leadTags: `${API_PREFIX}/crm/leads/tags`,
  leadTag: (tagId: string) => `${API_PREFIX}/crm/leads/tags/${tagId}`,
  leadImportValidate: `${API_PREFIX}/crm/leads/import/validate`,
  leadImport: `${API_PREFIX}/crm/leads/import`,
  leadBulkDelete: `${API_PREFIX}/crm/leads/bulk/delete`,
  lead: (id: string) => `${API_PREFIX}/crm/leads/${id}`,
  leadStage: (id: string) => `${API_PREFIX}/crm/leads/${id}/stage`,
  leadActivities: (id: string) => `${API_PREFIX}/crm/leads/${id}/activities`,
  leadConvert: (id: string) => `${API_PREFIX}/crm/leads/${id}/convert`,
  leadLinkClient: (id: string) => `${API_PREFIX}/crm/leads/${id}/link-client`,
  clients: `${API_PREFIX}/crm/clients`,
  client: (id: string) => `${API_PREFIX}/crm/clients/${id}`,
  clientFromLead: (leadId: string) => `${API_PREFIX}/crm/clients/from-lead/${leadId}`,
  clientReferencePreview: `${API_PREFIX}/crm/clients/reference-preview`,
  quotations: `${API_PREFIX}/crm/quotations`,
  quotation: (id: string) => `${API_PREFIX}/crm/quotations/${id}`,
  quotationStatus: (id: string) => `${API_PREFIX}/crm/quotations/${id}/status`,
  quotationPrint: (id: string) => `${API_PREFIX}/crm/quotations/${id}/print`,
  quotationPrintPdf: (id: string) => `${API_PREFIX}/crm/quotations/${id}/print/pdf`,
  quotationSend: (id: string) => `${API_PREFIX}/crm/quotations/${id}/send`,
  quotationCodePreview: `${API_PREFIX}/crm/quotations/code-preview`,
  servicePackages: `${API_PREFIX}/crm/service-packages`,
  servicePackage: (id: string) => `${API_PREFIX}/crm/service-packages/${id}`,
  servicePackageStatus: (id: string) => `${API_PREFIX}/crm/service-packages/${id}/status`,
  servicePackageCodePreview: `${API_PREFIX}/crm/service-packages/code-preview`,
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
  | 'LEAD_CONVERTED'
  | 'LEAD_LINKED_TO_CLIENT';
export type ClientType = 'INDIVIDUAL' | 'COMPANY';
export type ClientStatus = 'ACTIVE' | 'INACTIVE';
export type QuotationDocumentType = 'PROPOSAL' | 'QUOTATION';
export type QuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';

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
  readonly leadCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly stages: readonly CrmPipelineStage[];
}

export interface CrmPipelineListResponse {
  readonly pipelines: readonly CrmPipeline[];
}

export interface CrmPipelineBulkActionFailure {
  readonly pipelineId: string;
  readonly message: string;
}

export interface CrmPipelineBulkActionResponse {
  readonly succeededIds: readonly string[];
  readonly failures: readonly CrmPipelineBulkActionFailure[];
}

export type CrmLeadTagStatus = 'ACTIVE' | 'INACTIVE';

export interface CrmLeadTag {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly color: string;
  readonly status?: CrmLeadTagStatus;
}

export interface CrmTag {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string;
  readonly color: string;
  readonly status: CrmLeadTagStatus;
  readonly leadCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CrmTagListResponse {
  readonly items: readonly CrmTag[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
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
  /** @deprecated Prefer `leadTags`; kept for backward compatibility. */
  readonly tags: readonly string[];
  readonly leadTags: readonly CrmLeadTag[];
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

export interface CrmLeadBulkActionFailure {
  readonly leadId: string;
  readonly message: string;
}

export interface CrmLeadBulkActionResponse {
  readonly succeededIds: readonly string[];
  readonly failures: readonly CrmLeadBulkActionFailure[];
}

/** @deprecated Use {@link CrmTagListResponse}. */
export interface CrmLeadTagListResponse {
  readonly items: readonly CrmLeadTag[];
}

export type CrmLeadImportRowStatus =
  | 'NEW'
  | 'EXISTING'
  | 'DUPLICATE_IN_FILE'
  | 'INVALID';

export interface CrmLeadImportPreviewRow {
  readonly rowNumber: number;
  readonly fullName: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly stage: string | null;
  readonly priority: LeadPriority | null;
  readonly tags: readonly string[];
  readonly status: CrmLeadImportRowStatus;
  readonly message: string;
  readonly existingLeadId: string | null;
  readonly existingLeadName: string | null;
  readonly existingPipelineId: string | null;
  readonly existingStageId: string | null;
}

export interface CrmLeadImportPreviewResponse {
  readonly totalRows: number;
  readonly validNewCount: number;
  readonly existingCount: number;
  readonly duplicateInFileCount: number;
  readonly invalidCount: number;
  readonly readyToImportCount: number;
  readonly rows: readonly CrmLeadImportPreviewRow[];
}

export interface CrmLeadImportRowError {
  readonly rowNumber: number;
  readonly message: string;
}

export interface CrmLeadImportResponse {
  readonly totalRows: number;
  readonly importedCount: number;
  readonly existingCount: number;
  readonly duplicateCount: number;
  readonly failedCount: number;
  readonly importedLeadIds: readonly string[];
  readonly rowErrors: readonly CrmLeadImportRowError[];
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

/** Shown when converting a lead whose phone matches an existing client (same organization). */
export interface CrmDuplicateClientSummary {
  readonly id: string;
  readonly name: string;
  readonly referenceNumber: string;
  readonly type: ClientType;
  /** Display / stored phone for the existing client. */
  readonly phone: string | null;
}

export interface CrmLeadConvertResponse {
  readonly lead: CrmLead;
  /** Present when conversion created a new client. Null when `duplicateClient` is set or when only a duplicate was found. */
  readonly client: CrmClient | null;
  /** When non-null, a client with the same normalized phone already exists — link explicitly or cancel. */
  readonly duplicateClient: CrmDuplicateClientSummary | null;
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
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface ClientReferencePreviewResponse {
  readonly referenceNumber: string;
  readonly isPreview: true;
}

export interface CrmQuotationLineItem {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly sourcePackageId: string | null;
  readonly description: string;
  readonly quantity: string;
  readonly unit: string;
  readonly unitPrice: string;
  readonly discount: string;
  readonly taxRate: string;
  readonly lineTotal: string;
  readonly sortOrder: number;
}

export interface CrmQuotation {
  readonly id: string;
  readonly documentNumber: string;
  readonly type: QuotationDocumentType;
  readonly status: QuotationStatus;
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
  readonly scopeOfWork: string;
  readonly paymentTerms: string;
  readonly deliveryTimeline: string;
  readonly clientName: string;
  readonly companyName: string;
  readonly clientPhone: string;
  readonly clientEmail: string;
  readonly billingAddress: string;
  readonly clientGstin: string;
  readonly version: number;
  readonly sourcePackageId: string | null;
  readonly packageSnapshot: ServicePackageSnapshot | null;
  readonly lineItems: readonly CrmQuotationLineItem[];
  readonly sentAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CrmQuotationListResponse {
  readonly items: readonly CrmQuotation[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface QuotationDocumentCodePreviewResponse {
  readonly documentNumber: string;
  readonly type: QuotationDocumentType;
  readonly isPreview: true;
}

export interface CrmQuotationPrintResponse extends CrmQuotation {
  readonly organizationName: string;
}
