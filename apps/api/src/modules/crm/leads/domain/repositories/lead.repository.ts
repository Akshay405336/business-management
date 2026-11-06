import type { ClientRecord } from '../../../domain/repositories/crm.repository.js';
import type { Lead } from '../entities/lead.entity.js';
import type { LeadActivity } from '../entities/lead-activity.entity.js';
import type {
  CreateLeadActivityData,
  CreateLeadData,
  LeadAuditEntry,
  LeadListFilters,
  PaginatedLeads,
  UpdateLeadData,
} from '../types/lead.types.js';
import type { LeadTagSnapshot } from '../types/lead-read-model.js';
import type { CreateLeadTagData, LeadTagReadModel } from '../types/lead-tag.types.js';
import type { LeadImportRowInput } from '../types/lead-import.types.js';

export const LEAD_REPOSITORY = Symbol('LEAD_REPOSITORY');

export interface LeadRepository {
  listLeads(organizationId: string, filters: LeadListFilters): Promise<PaginatedLeads>;
  getLead(organizationId: string, leadId: string): Promise<Lead | null>;
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
    input: CreateLeadData,
    audit: LeadAuditEntry,
  ): Promise<Lead>;
  updateLead(
    organizationId: string,
    leadId: string,
    input: UpdateLeadData,
    audit: LeadAuditEntry,
  ): Promise<Lead>;
  deleteLead(organizationId: string, leadId: string, audit: LeadAuditEntry): Promise<void>;
  changeLeadStage(
    organizationId: string,
    leadId: string,
    stageId: string,
    beforeLeadId: string | null | undefined,
    adminId: string,
    audit: LeadAuditEntry,
  ): Promise<Lead>;
  listLeadActivities(
    organizationId: string,
    leadId: string,
  ): Promise<readonly LeadActivity[]>;
  createLeadActivity(
    organizationId: string,
    leadId: string,
    input: CreateLeadActivityData,
  ): Promise<LeadActivity>;
  convertLeadToClient(
    organizationId: string,
    leadId: string,
    adminId: string,
    audit: LeadAuditEntry,
  ): Promise<{
    readonly lead: Lead;
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
    audit: LeadAuditEntry,
  ): Promise<{ readonly lead: Lead; readonly client: ClientRecord }>;
  loadTagsByLeadIds(
    organizationId: string,
    leadIds: readonly string[],
  ): Promise<Map<string, LeadTagSnapshot[]>>;
  listLeadTags(organizationId: string, search?: string): Promise<LeadTagReadModel[]>;
  createLeadTag(organizationId: string, input: CreateLeadTagData): Promise<LeadTagReadModel>;
  resolveTagIdsByNames(
    organizationId: string,
    names: readonly string[],
  ): Promise<{ readonly tagIds: string[]; readonly missing: string[] }>;
  previewLeadImport(
    organizationId: string,
    pipelineId: string,
    rows: readonly LeadImportRowInput[],
  ): Promise<import('@techwin/contracts').CrmLeadImportPreviewResponse>;
  executeLeadImport(
    organizationId: string,
    pipelineId: string,
    rows: readonly LeadImportRowInput[],
    adminId: string,
    audit: LeadAuditEntry,
  ): Promise<import('@techwin/contracts').CrmLeadImportResponse & { totalRows: number }>;
}
