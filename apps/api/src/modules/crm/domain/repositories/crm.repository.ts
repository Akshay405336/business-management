import type {
  ClientStatus,
  ClientType,
  CrmAuditEventType,
  LeadActivityType,
  LeadPriority,
  LeadSource,
  PipelineStageOutcome,
  PipelineStatus,
  ProposalDocumentType,
  ProposalStatus,
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
  readonly subject: string;
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

export interface ClientRecord {
  readonly id: string;
  readonly organizationId: string;
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
  readonly createdByAdminId: string;
  readonly archivedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ProposalLineItemRecord {
  readonly id: string;
  readonly proposalId: string;
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
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ProposalRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly documentNumber: string;
  readonly type: ProposalDocumentType;
  readonly status: ProposalStatus;
  readonly title: string;
  readonly description: string;
  readonly leadId: string | null;
  readonly clientId: string | null;
  readonly issueDate: Date;
  readonly expiryDate: Date | null;
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
  readonly packageSnapshot: unknown;
  readonly createdByAdminId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly lineItems?: readonly ProposalLineItemRecord[];
}

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

export interface CreateClientInput {
  readonly type: ClientType;
  readonly name: string;
  readonly primaryContact?: string;
  readonly email?: string | null;
  readonly phone?: string | null;
  readonly website?: string | null;
  readonly billingAddress?: string;
  readonly taxRegistration?: string;
  readonly status?: ClientStatus;
  readonly notes?: string;
  readonly sourceLeadId?: string | null;
  readonly createdByAdminId: string;
}

export interface UpdateClientInput {
  readonly type?: ClientType;
  readonly name?: string;
  readonly primaryContact?: string;
  readonly email?: string | null;
  readonly phone?: string | null;
  readonly website?: string | null;
  readonly billingAddress?: string;
  readonly taxRegistration?: string;
  readonly status?: ClientStatus;
  readonly notes?: string;
  readonly archivedAt?: Date | null;
}

export interface ProposalLineItemWriteInput {
  readonly id?: string;
  readonly name: string;
  readonly description?: string;
  readonly category?: string;
  readonly sourcePackageId?: string | null;
  readonly quantity: string | number;
  readonly unit?: string;
  readonly unitPrice: string | number;
  readonly discount?: string | number;
  readonly taxRate?: string | number;
  readonly sortOrder?: number;
}

export interface ProposalListFilters {
  readonly page: number;
  readonly pageSize: number;
  readonly search?: string;
  readonly type?: ProposalDocumentType;
  readonly status?: ProposalStatus;
  readonly issueFrom?: string;
  readonly issueTo?: string;
}

export interface PaginatedProposals {
  readonly items: readonly ProposalRecord[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface CreateProposalInput {
  readonly type: ProposalDocumentType;
  readonly title: string;
  readonly description?: string;
  readonly scopeOfWork?: string;
  readonly leadId?: string | null;
  readonly clientId?: string | null;
  readonly clientName: string;
  readonly companyName?: string;
  readonly clientPhone: string;
  readonly clientEmail: string;
  readonly billingAddress: string;
  readonly clientGstin?: string;
  readonly issueDate: Date;
  readonly expiryDate?: Date | null;
  readonly currency?: string;
  readonly notes?: string;
  readonly terms?: string;
  readonly paymentTerms?: string;
  readonly deliveryTimeline?: string;
  readonly lineItems?: readonly ProposalLineItemWriteInput[];
  readonly sourcePackageId?: string | null;
  readonly createdByAdminId: string;
}

export interface UpdateProposalInput {
  readonly title?: string;
  readonly description?: string;
  readonly scopeOfWork?: string;
  readonly leadId?: string | null;
  readonly clientId?: string | null;
  readonly clientName?: string;
  readonly companyName?: string;
  readonly clientPhone?: string;
  readonly clientEmail?: string;
  readonly billingAddress?: string;
  readonly clientGstin?: string;
  readonly issueDate?: Date;
  readonly expiryDate?: Date | null;
  readonly currency?: string;
  readonly notes?: string;
  readonly terms?: string;
  readonly paymentTerms?: string;
  readonly deliveryTimeline?: string;
  readonly lineItems?: readonly ProposalLineItemWriteInput[];
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
  ): Promise<{ readonly lead: LeadRecord; readonly client: ClientRecord }>;

  listClients(organizationId: string): Promise<readonly ClientRecord[]>;
  getClient(organizationId: string, clientId: string): Promise<ClientRecord | null>;
  createClient(
    organizationId: string,
    input: CreateClientInput,
    audit: CrmAuditInput,
  ): Promise<ClientRecord>;
  updateClient(
    organizationId: string,
    clientId: string,
    input: UpdateClientInput,
    audit: CrmAuditInput,
  ): Promise<ClientRecord>;
  previewClientReference(organizationId: string): Promise<string>;
  deleteClient(organizationId: string, clientId: string, audit: CrmAuditInput): Promise<void>;

  listProposals(organizationId: string, filters: ProposalListFilters): Promise<PaginatedProposals>;
  previewProposalDocumentNumber(
    organizationId: string,
    type: ProposalDocumentType,
  ): Promise<string>;
  getProposal(organizationId: string, proposalId: string): Promise<ProposalRecord | null>;
  deleteProposal(organizationId: string, proposalId: string, audit: CrmAuditInput): Promise<void>;
  createProposal(
    organizationId: string,
    input: CreateProposalInput,
    audit: CrmAuditInput,
  ): Promise<ProposalRecord>;
  updateProposal(
    organizationId: string,
    proposalId: string,
    input: UpdateProposalInput,
    audit: CrmAuditInput,
  ): Promise<ProposalRecord>;
  changeProposalStatus(
    organizationId: string,
    proposalId: string,
    toStatus: ProposalStatus,
    note: string,
    adminId: string,
    audit: CrmAuditInput,
  ): Promise<ProposalRecord>;
  getProposalPrintData(
    organizationId: string,
    proposalId: string,
  ): Promise<ProposalRecord & { readonly organizationName: string }>;

  listServicePackages(organizationId: string): Promise<readonly ServicePackageRecord[]>;
  previewServicePackageCode(organizationId: string): Promise<string>;
  getServicePackage(organizationId: string, packageId: string): Promise<ServicePackageRecord | null>;
  createServicePackage(
    organizationId: string,
    input: CreateServicePackageInput,
    audit: CrmAuditInput,
  ): Promise<ServicePackageRecord>;
  updateServicePackage(
    organizationId: string,
    packageId: string,
    input: UpdateServicePackageInput,
    audit: CrmAuditInput,
  ): Promise<ServicePackageRecord>;
  changeServicePackageStatus(
    organizationId: string,
    packageId: string,
    input: ChangeServicePackageStatusInput,
    audit: CrmAuditInput,
  ): Promise<ServicePackageRecord>;
  deleteServicePackage(
    organizationId: string,
    packageId: string,
    audit: CrmAuditInput,
  ): Promise<void>;
}

export type ServicePackageStatus = 'ACTIVE' | 'INACTIVE';
export type ServicePackageDeliveryUnit = 'DAYS' | 'WEEKS' | 'MONTHS';
export type PackageDiscountType = 'FIXED' | 'PERCENT';

export interface ServicePackageRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly code: string;
  readonly name: string;
  readonly categories: unknown;
  readonly shortDescription: string;
  readonly detailedDescription: string;
  readonly status: ServicePackageStatus;
  readonly technologyStack: unknown;
  readonly includedPages: unknown;
  readonly integrations: unknown;
  readonly adminPanelFeatures: unknown;
  readonly hostingDeployment: unknown;
  readonly deliveryServices: unknown;
  readonly integrationNotes: string;
  readonly pageCount: number | null;
  readonly basePrice: string;
  readonly addOns: unknown;
  readonly discountType: PackageDiscountType;
  readonly discountValue: string;
  readonly gstRate: string;
  readonly taxableAmount: string;
  readonly gstAmount: string;
  readonly finalPrice: string;
  readonly deliveryDurationValue: number | null;
  readonly deliveryDurationUnit: ServicePackageDeliveryUnit | null;
  readonly supportPeriod: string;
  readonly revisionAllowance: string;
  readonly termsExclusions: string;
  readonly createdByAdminId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ServicePackageWriteInput {
  readonly code?: string;
  readonly name?: string;
  readonly categories?: unknown;
  readonly deliveryDurationValue?: number | null;
  readonly deliveryDurationUnit?: ServicePackageDeliveryUnit | null;
  readonly shortDescription?: string;
  readonly detailedDescription?: string;
  readonly technologyStack?: unknown;
  readonly includedPages?: unknown;
  readonly integrations?: unknown;
  readonly adminPanelFeatures?: unknown;
  readonly hostingDeployment?: unknown;
  readonly deliveryServices?: unknown;
  readonly integrationNotes?: string;
  readonly pageCount?: number | null;
  readonly basePrice?: string | number;
  readonly addOns?: unknown;
  readonly discountType?: PackageDiscountType | null;
  readonly discountValue?: string | number;
  readonly gstRate?: string | number | null;
  readonly supportPeriod?: string;
  readonly revisionAllowance?: string;
  readonly termsExclusions?: string;
  readonly createdByAdminId?: string;
}

export interface CreateServicePackageInput extends ServicePackageWriteInput {
  readonly name: string;
  readonly categories: unknown;
  readonly basePrice: string | number;
  readonly discountType: PackageDiscountType;
  readonly discountValue: string | number;
  readonly gstRate?: string | number | null;
  readonly deliveryDurationValue: number;
  readonly deliveryDurationUnit: ServicePackageDeliveryUnit;
  readonly createdByAdminId: string;
}

export interface ChangeServicePackageStatusInput {
  readonly status: ServicePackageStatus;
}

export type UpdateServicePackageInput = ServicePackageWriteInput;
