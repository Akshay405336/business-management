import type {
  CrmAuditEventType,
  LeadActivityType,
  LeadPriority,
  LeadSource,
  PipelineStageOutcome,
  PipelineStatus,
} from '../crm-types.js';

export const CRM_REPOSITORY = Symbol('CRM_REPOSITORY');

export const ORGANIZATION_SLUG_TECHWIN = 'techwin';
export const DEFAULT_ORGANIZATION_NAME = 'Techwin Organization';

export const SEQUENCE_KEYS = {
  lead: 'lead',
  client: 'client',
  proposal: 'proposal',
  quotation: 'quotation',
  project: 'project',
} as const;

export interface CrmAuditInput {
  readonly type: CrmAuditEventType;
  readonly adminId: string | null;
  readonly entityType: string;
  readonly entityId: string;
  readonly metadata?: Readonly<Record<string, string | number | boolean | null>>;
}

export interface PipelineRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly description: string;
  readonly status: PipelineStatus;
  readonly isDefault: boolean;
  readonly sortOrder: number;
  readonly leadCount?: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly stages?: readonly PipelineStageRecord[];
}

export interface PipelineStageRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly pipelineId: string;
  readonly name: string;
  readonly description: string;
  readonly color: string;
  readonly status: PipelineStatus;
  readonly sortOrder: number;
  readonly outcome: PipelineStageOutcome;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly leadCount?: number;
}

export interface LeadRecord {
  readonly id: string;
  readonly organizationId: string;
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
  readonly expectedCloseDate: Date | null;
  readonly nextFollowUpDate: Date | null;
  readonly description: string;
  readonly tags: readonly string[];
  readonly createdByAdminId: string;
  readonly convertedClientId: string | null;
  readonly convertedAt: Date | null;
  readonly convertedByAdminId: string | null;
  readonly archivedAt: Date | null;
  readonly kanbanSortOrder: number;
  readonly lastActivityAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface LeadActivityRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly leadId: string;
  readonly type: LeadActivityType;
  readonly title: string;
  readonly description: string;
  readonly occurredAt: Date;
  readonly dueAt: Date | null;
  readonly completedAt: Date | null;
  readonly metadata: unknown;
  readonly createdByAdminId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

import type { ClientReadModel as ClientRecord } from '../../../modules/clients/domain/types/client-read-model.js';

export type { ClientRecord };

export interface PaginatedLeads {
  readonly items: readonly LeadRecord[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface LeadListFilters {
  readonly pipelineId?: string;
  readonly stageId?: string;
  readonly assignedAdminId?: string;
  readonly priority?: LeadPriority;
  readonly source?: LeadSource;
  readonly search?: string;
  readonly includeArchived?: boolean;
  readonly kanbanOrder?: boolean;
  readonly page: number;
  readonly pageSize: number;
}

export interface PipelineStageInput {
  readonly id?: string;
  readonly name: string;
  readonly color: string;
}

export interface PipelineListFilters {
  readonly search?: string;
  readonly status?: PipelineStatus;
}

export interface CreatePipelineInput {
  readonly name: string;
  readonly description?: string;
  readonly status?: PipelineStatus;
  readonly stages: readonly PipelineStageInput[];
}

export interface UpdatePipelineInput {
  readonly name?: string;
  readonly description?: string;
  readonly status?: PipelineStatus;
  readonly sortOrder?: number;
  readonly stages?: readonly PipelineStageInput[];
}

export interface CreateStageInput {
  readonly name: string;
  readonly description?: string;
  readonly color?: string;
  readonly status?: PipelineStatus;
  readonly outcome?: PipelineStageOutcome;
}

export interface UpdateStageInput {
  readonly name?: string;
  readonly description?: string;
  readonly color?: string;
  readonly status?: PipelineStatus;
  readonly outcome?: PipelineStageOutcome;
}

export interface CreateLeadInput {
  readonly fullName: string;
  readonly companyName?: string;
  readonly email?: string | null;
  readonly phone?: string | null;
  readonly website?: string | null;
  readonly source?: LeadSource;
  readonly pipelineId: string;
  readonly stageId?: string;
  readonly assignedAdminId?: string | null;
  readonly priority?: LeadPriority;
  readonly estimatedValue?: string | number;
  readonly currency?: string;
  readonly expectedCloseDate?: Date | null;
  readonly nextFollowUpDate?: Date | null;
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly createdByAdminId: string;
}

export interface UpdateLeadInput {
  readonly fullName?: string;
  readonly companyName?: string;
  readonly email?: string | null;
  readonly phone?: string | null;
  readonly website?: string | null;
  readonly source?: LeadSource;
  readonly pipelineId?: string;
  readonly stageId?: string;
  readonly assignedAdminId?: string | null;
  readonly priority?: LeadPriority;
  readonly estimatedValue?: string | number;
  readonly currency?: string;
  readonly expectedCloseDate?: Date | null;
  readonly nextFollowUpDate?: Date | null;
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly archivedAt?: Date | null;
}

export interface CreateLeadActivityInput {
  readonly type: LeadActivityType;
  readonly title: string;
  readonly description?: string;
  readonly occurredAt: Date;
  readonly dueAt?: Date | null;
  readonly completedAt?: Date | null;
  readonly metadata?: unknown;
  readonly createdByAdminId: string;
}

export interface CrmRepository {
  ensureOrganizationForAdmin(adminId: string): Promise<{ readonly organizationId: string }>;

  ensureDefaultPipeline(organizationId: string): Promise<PipelineRecord>;
  listPipelines(
    organizationId: string,
    filters?: PipelineListFilters,
  ): Promise<readonly PipelineRecord[]>;
  getPipeline(organizationId: string, pipelineId: string): Promise<PipelineRecord | null>;
  getDefaultPipeline(organizationId: string): Promise<PipelineRecord>;
  createPipeline(
    organizationId: string,
    input: CreatePipelineInput,
    audit: CrmAuditInput,
  ): Promise<PipelineRecord>;
  updatePipeline(
    organizationId: string,
    pipelineId: string,
    input: UpdatePipelineInput,
    audit: CrmAuditInput,
  ): Promise<PipelineRecord>;
  deletePipeline(organizationId: string, pipelineId: string, audit: CrmAuditInput): Promise<void>;

  createStage(
    organizationId: string,
    pipelineId: string,
    input: CreateStageInput,
    audit: CrmAuditInput,
  ): Promise<PipelineStageRecord>;
  updateStage(
    organizationId: string,
    pipelineId: string,
    stageId: string,
    input: UpdateStageInput,
    audit: CrmAuditInput,
  ): Promise<PipelineStageRecord>;
  deleteStage(
    organizationId: string,
    pipelineId: string,
    stageId: string,
    targetStageId: string | undefined,
    audit: CrmAuditInput,
  ): Promise<void>;
  reorderStages(
    organizationId: string,
    pipelineId: string,
    orderedStageIds: readonly string[],
    audit: CrmAuditInput,
  ): Promise<readonly PipelineStageRecord[]>;
  activateStage(
    organizationId: string,
    pipelineId: string,
    stageId: string,
    audit: CrmAuditInput,
  ): Promise<PipelineStageRecord>;
  deactivateStage(
    organizationId: string,
    pipelineId: string,
    stageId: string,
    targetStageId: string | undefined,
    audit: CrmAuditInput,
  ): Promise<PipelineStageRecord>;

  listLeads(organizationId: string, filters: LeadListFilters): Promise<PaginatedLeads>;
  getLead(organizationId: string, leadId: string): Promise<LeadRecord | null>;
  findLeadIdByPhone(
    organizationId: string,
    phone: string,
    excludeLeadId?: string,
  ): Promise<string | null>;
  findLeadIdByEmail(
    organizationId: string,
    email: string,
    excludeLeadId?: string,
  ): Promise<string | null>;
  createLead(
    organizationId: string,
    input: CreateLeadInput,
    audit: CrmAuditInput,
  ): Promise<LeadRecord>;
  updateLead(
    organizationId: string,
    leadId: string,
    input: UpdateLeadInput,
    audit: CrmAuditInput,
  ): Promise<LeadRecord>;
  deleteLead(organizationId: string, leadId: string, audit: CrmAuditInput): Promise<void>;
  changeLeadStage(
    organizationId: string,
    leadId: string,
    stageId: string,
    beforeLeadId: string | null | undefined,
    adminId: string,
    audit: CrmAuditInput,
  ): Promise<LeadRecord>;

  listLeadActivities(
    organizationId: string,
    leadId: string,
  ): Promise<readonly LeadActivityRecord[]>;
  createLeadActivity(
    organizationId: string,
    leadId: string,
    input: CreateLeadActivityInput,
  ): Promise<LeadActivityRecord>;

  convertLeadToClient(
    organizationId: string,
    leadId: string,
    adminId: string,
    audit: CrmAuditInput,
  ): Promise<{
    readonly lead: LeadRecord;
    readonly client: ClientRecord | null;
    readonly duplicateClient: {
      readonly id: string;
      readonly name: string;
      readonly referenceNumber: string;
      readonly type: ClientRecord['type'];
      readonly phone: string | null;
    } | null;
  }>;

  linkLeadToExistingClient(
    organizationId: string,
    leadId: string,
    clientId: string,
    adminId: string,
    audit: CrmAuditInput,
  ): Promise<{ readonly lead: LeadRecord; readonly client: ClientRecord }>;

  getClient(organizationId: string, clientId: string): Promise<ClientRecord | null>;
}

export type {
  ServicePackageReadModel as ServicePackageRecord,
  CreateServicePackageData as CreateServicePackageInput,
  UpdateServicePackageData as UpdateServicePackageInput,
  ChangeServicePackageStatusData as ChangeServicePackageStatusInput,
  ServicePackageWriteInput,
  PackageDiscountType,
  ServicePackageDeliveryUnit,
} from '../../../modules/service-packages/index.js';
export type { ServicePackageStatus } from '../../../modules/service-packages/index.js';
