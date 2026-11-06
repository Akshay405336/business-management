import type {
  ClientRecord,
  CreateLeadActivityInput,
  CreateLeadInput,
  CrmAuditInput,
  LeadActivityRecord,
  LeadListFilters,
  LeadRecord,
  PaginatedLeads,
  UpdateLeadInput,
} from '../../../../domain/repositories/crm.repository.js';
import type { CrmPersistenceHost } from './crm-persistence.shared.js';
import { LeadPrismaStore } from '../../../../leads/infrastructure/persistence/prisma/lead-prisma.store.js';
import type { LeadAuditEntry } from '../../../../leads/domain/types/lead.types.js';

/** CRM repository adapter — delegates to the Leads feature persistence store. */
export class CrmLeadPersistence {
  private readonly store: LeadPrismaStore;

  constructor(host: CrmPersistenceHost) {
    this.store = new LeadPrismaStore(host);
  }

  listLeads(organizationId: string, filters: LeadListFilters): Promise<PaginatedLeads> {
    return this.store.listLeads(organizationId, filters).then((page) => ({
      items: page.items.map((lead) => lead.toReadModel() as LeadRecord),
      total: page.total,
      page: page.page,
      pageSize: page.pageSize,
    }));
  }

  getLead(organizationId: string, leadId: string): Promise<LeadRecord | null> {
    return this.store.getLead(organizationId, leadId).then((lead) =>
      lead ? (lead.toReadModel() as LeadRecord) : null,
    );
  }

  findLeadIdByPhone(
    organizationId: string,
    phone: string,
    excludeLeadId?: string,
  ): Promise<string | null> {
    return this.store.findLeadIdByPhone(organizationId, phone, excludeLeadId);
  }

  findLeadIdByEmail(
    organizationId: string,
    email: string,
    excludeLeadId?: string,
  ): Promise<string | null> {
    return this.store.findLeadIdByEmail(organizationId, email, excludeLeadId);
  }

  createLead(
    organizationId: string,
    input: CreateLeadInput,
    audit: CrmAuditInput,
  ): Promise<LeadRecord> {
    return this.store
      .createLead(organizationId, input, audit as LeadAuditEntry)
      .then((lead) => lead.toReadModel() as LeadRecord);
  }

  updateLead(
    organizationId: string,
    leadId: string,
    input: UpdateLeadInput,
    audit: CrmAuditInput,
  ): Promise<LeadRecord> {
    return this.store
      .updateLead(organizationId, leadId, input, audit as LeadAuditEntry)
      .then((lead) => lead.toReadModel() as LeadRecord);
  }

  deleteLead(organizationId: string, leadId: string, audit: CrmAuditInput): Promise<void> {
    return this.store.deleteLead(organizationId, leadId, audit as LeadAuditEntry);
  }

  changeLeadStage(
    organizationId: string,
    leadId: string,
    stageId: string,
    beforeLeadId: string | null | undefined,
    adminId: string,
    audit: CrmAuditInput,
  ): Promise<LeadRecord> {
    return this.store
      .changeLeadStage(organizationId, leadId, stageId, beforeLeadId, adminId, audit as LeadAuditEntry)
      .then((lead) => lead.toReadModel() as LeadRecord);
  }

  listLeadActivities(
    organizationId: string,
    leadId: string,
  ): Promise<readonly LeadActivityRecord[]> {
    return this.store
      .listLeadActivities(organizationId, leadId)
      .then((items) => items.map((a) => a.toReadModel() as LeadActivityRecord));
  }

  createLeadActivity(
    organizationId: string,
    leadId: string,
    input: CreateLeadActivityInput,
  ): Promise<LeadActivityRecord> {
    return this.store
      .createLeadActivity(organizationId, leadId, input)
      .then((activity) => activity.toReadModel() as LeadActivityRecord);
  }

  convertLeadToClient(
    organizationId: string,
    leadId: string,
    adminId: string,
    audit: CrmAuditInput,
  ): Promise<{
    lead: LeadRecord;
    client: ClientRecord | null;
    duplicateClient: {
      id: string;
      name: string;
      referenceNumber: string;
      type: ClientRecord['type'];
      phone: string | null;
    } | null;
  }> {
    return this.store.convertLeadToClient(organizationId, leadId, adminId, audit as LeadAuditEntry).then(
      ({ lead, client, duplicateClient }) => ({
        lead: lead.toReadModel() as LeadRecord,
        client,
        duplicateClient,
      }),
    );
  }

  linkLeadToExistingClient(
    organizationId: string,
    leadId: string,
    clientId: string,
    adminId: string,
    audit: CrmAuditInput,
  ): Promise<{ lead: LeadRecord; client: ClientRecord }> {
    return this.store
      .linkLeadToExistingClient(organizationId, leadId, clientId, adminId, audit as LeadAuditEntry)
      .then(({ lead, client }) => ({
        lead: lead.toReadModel() as LeadRecord,
        client,
      }));
  }
}
