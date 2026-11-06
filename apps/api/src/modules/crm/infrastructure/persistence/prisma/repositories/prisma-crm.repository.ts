import { Inject, Injectable } from '@nestjs/common';
import type { ProposalStatus } from '../../../../domain/crm-types.js';
import type {
  ClientRecord,
  CreateClientInput,
  CreateLeadActivityInput,
  CreateLeadInput,
  CreatePipelineInput,
  CreateProposalInput,
  CreateStageInput,
  CrmAuditInput,
  CrmRepository,
  LeadActivityRecord,
  LeadListFilters,
  LeadRecord,
  PaginatedLeads,
  PaginatedProposals,
  PipelineListFilters,
  PipelineRecord,
  PipelineStageRecord,
  ProposalListFilters,
  ProposalRecord,
  UpdateClientInput,
  UpdateLeadInput,
  UpdatePipelineInput,
  UpdateProposalInput,
  UpdateStageInput,
} from '../../../../domain/repositories/crm.repository.js';
import { PrismaService } from '../../../../../../infrastructure/database/prisma.service.js';
import { CrmClientPersistence } from './crm-client.persistence.js';
import { CrmLeadPersistence } from './crm-lead.persistence.js';
import { CrmOrganizationPersistence } from './crm-organization.persistence.js';
import { CrmPipelinePersistence } from './crm-pipeline.persistence.js';
import { CrmProposalPersistence } from './crm-proposal.persistence.js';
import type { CrmPersistenceHost } from './crm-persistence.shared.js';

@Injectable()
export class PrismaCrmRepository implements CrmRepository, CrmPersistenceHost {
  private readonly organizationPersistence: CrmOrganizationPersistence;
  private readonly pipelinePersistence: CrmPipelinePersistence;
  private readonly leadPersistence: CrmLeadPersistence;
  private readonly clientPersistence: CrmClientPersistence;
  private readonly proposalPersistence: CrmProposalPersistence;

  constructor(@Inject(PrismaService) readonly prisma: PrismaService) {
    this.organizationPersistence = new CrmOrganizationPersistence(prisma);
    this.pipelinePersistence = new CrmPipelinePersistence(this);
    this.clientPersistence = new CrmClientPersistence(this);
    this.leadPersistence = new CrmLeadPersistence(this);
    this.proposalPersistence = new CrmProposalPersistence(this);
  }

  ensureOrganizationForAdmin(adminId: string): Promise<{ organizationId: string }> {
    return this.organizationPersistence.ensureOrganizationForAdmin(adminId);
  }

  ensureDefaultPipeline(organizationId: string): Promise<PipelineRecord> {
    return this.organizationPersistence.ensureDefaultPipeline(organizationId);
  }

  getDefaultPipeline(organizationId: string): Promise<PipelineRecord> {
    return this.organizationPersistence.getDefaultPipeline(organizationId);
  }

  getPipeline(organizationId: string, pipelineId: string): Promise<PipelineRecord | null> {
    return this.pipelinePersistence.getPipeline(organizationId, pipelineId);
  }

  getLead(organizationId: string, leadId: string): Promise<LeadRecord | null> {
    return this.leadPersistence.getLead(organizationId, leadId);
  }

  getClient(organizationId: string, clientId: string): Promise<ClientRecord | null> {
    return this.clientPersistence.getClient(organizationId, clientId);
  }

  getProposal(organizationId: string, proposalId: string): Promise<ProposalRecord | null> {
    return this.proposalPersistence.getProposal(organizationId, proposalId);
  }

  listPipelines(
    organizationId: string,
    filters?: PipelineListFilters,
  ): Promise<readonly PipelineRecord[]> {
    return this.pipelinePersistence.listPipelines(organizationId, filters);
  }

  createPipeline(
    organizationId: string,
    input: CreatePipelineInput,
    audit: CrmAuditInput,
  ): Promise<PipelineRecord> {
    return this.pipelinePersistence.createPipeline(organizationId, input, audit);
  }

  updatePipeline(
    organizationId: string,
    pipelineId: string,
    input: UpdatePipelineInput,
    audit: CrmAuditInput,
  ): Promise<PipelineRecord> {
    return this.pipelinePersistence.updatePipeline(organizationId, pipelineId, input, audit);
  }

  deletePipeline(
    organizationId: string,
    pipelineId: string,
    audit: CrmAuditInput,
  ): Promise<void> {
    return this.pipelinePersistence.deletePipeline(organizationId, pipelineId, audit);
  }

  createStage(
    organizationId: string,
    pipelineId: string,
    input: CreateStageInput,
    audit: CrmAuditInput,
  ): Promise<PipelineStageRecord> {
    return this.pipelinePersistence.createStage(organizationId, pipelineId, input, audit);
  }

  updateStage(
    organizationId: string,
    pipelineId: string,
    stageId: string,
    input: UpdateStageInput,
    audit: CrmAuditInput,
  ): Promise<PipelineStageRecord> {
    return this.pipelinePersistence.updateStage(organizationId, pipelineId, stageId, input, audit);
  }

  deleteStage(
    organizationId: string,
    pipelineId: string,
    stageId: string,
    targetStageId: string | undefined,
    audit: CrmAuditInput,
  ): Promise<void> {
    return this.pipelinePersistence.deleteStage(
      organizationId,
      pipelineId,
      stageId,
      targetStageId,
      audit,
    );
  }

  reorderStages(
    organizationId: string,
    pipelineId: string,
    orderedStageIds: readonly string[],
    audit: CrmAuditInput,
  ): Promise<readonly PipelineStageRecord[]> {
    return this.pipelinePersistence.reorderStages(
      organizationId,
      pipelineId,
      orderedStageIds,
      audit,
    );
  }

  activateStage(
    organizationId: string,
    pipelineId: string,
    stageId: string,
    audit: CrmAuditInput,
  ): Promise<PipelineStageRecord> {
    return this.pipelinePersistence.activateStage(organizationId, pipelineId, stageId, audit);
  }

  deactivateStage(
    organizationId: string,
    pipelineId: string,
    stageId: string,
    targetStageId: string | undefined,
    audit: CrmAuditInput,
  ): Promise<PipelineStageRecord> {
    return this.pipelinePersistence.deactivateStage(
      organizationId,
      pipelineId,
      stageId,
      targetStageId,
      audit,
    );
  }

  listLeads(organizationId: string, filters: LeadListFilters): Promise<PaginatedLeads> {
    return this.leadPersistence.listLeads(organizationId, filters);
  }

  findLeadIdByPhone(
    organizationId: string,
    phone: string,
    excludeLeadId?: string,
  ): Promise<string | null> {
    return this.leadPersistence.findLeadIdByPhone(organizationId, phone, excludeLeadId);
  }

  findLeadIdByEmail(
    organizationId: string,
    email: string,
    excludeLeadId?: string,
  ): Promise<string | null> {
    return this.leadPersistence.findLeadIdByEmail(organizationId, email, excludeLeadId);
  }

  createLead(
    organizationId: string,
    input: CreateLeadInput,
    audit: CrmAuditInput,
  ): Promise<LeadRecord> {
    return this.leadPersistence.createLead(organizationId, input, audit);
  }

  updateLead(
    organizationId: string,
    leadId: string,
    input: UpdateLeadInput,
    audit: CrmAuditInput,
  ): Promise<LeadRecord> {
    return this.leadPersistence.updateLead(organizationId, leadId, input, audit);
  }

  deleteLead(organizationId: string, leadId: string, audit: CrmAuditInput): Promise<void> {
    return this.leadPersistence.deleteLead(organizationId, leadId, audit);
  }

  changeLeadStage(
    organizationId: string,
    leadId: string,
    stageId: string,
    beforeLeadId: string | null | undefined,
    adminId: string,
    audit: CrmAuditInput,
  ): Promise<LeadRecord> {
    return this.leadPersistence.changeLeadStage(
      organizationId,
      leadId,
      stageId,
      beforeLeadId,
      adminId,
      audit,
    );
  }

  listLeadActivities(
    organizationId: string,
    leadId: string,
  ): Promise<readonly LeadActivityRecord[]> {
    return this.leadPersistence.listLeadActivities(organizationId, leadId);
  }

  createLeadActivity(
    organizationId: string,
    leadId: string,
    input: CreateLeadActivityInput,
  ): Promise<LeadActivityRecord> {
    return this.leadPersistence.createLeadActivity(organizationId, leadId, input);
  }

  convertLeadToClient(
    organizationId: string,
    leadId: string,
    adminId: string,
    audit: CrmAuditInput,
  ): Promise<{ lead: LeadRecord; client: ClientRecord }> {
    return this.leadPersistence.convertLeadToClient(organizationId, leadId, adminId, audit);
  }

  listClients(organizationId: string): Promise<readonly ClientRecord[]> {
    return this.clientPersistence.listClients(organizationId);
  }

  createClient(
    organizationId: string,
    input: CreateClientInput,
    audit: CrmAuditInput,
  ): Promise<ClientRecord> {
    return this.clientPersistence.createClient(organizationId, input, audit);
  }

  updateClient(
    organizationId: string,
    clientId: string,
    input: UpdateClientInput,
    audit: CrmAuditInput,
  ): Promise<ClientRecord> {
    return this.clientPersistence.updateClient(organizationId, clientId, input, audit);
  }

  previewClientReference(organizationId: string): Promise<string> {
    return this.clientPersistence.previewClientReference(organizationId);
  }

  deleteClient(organizationId: string, clientId: string, audit: CrmAuditInput): Promise<void> {
    return this.clientPersistence.deleteClient(organizationId, clientId, audit);
  }

  listProposals(organizationId: string, filters: ProposalListFilters): Promise<PaginatedProposals> {
    return this.proposalPersistence.listProposals(organizationId, filters);
  }

  previewProposalDocumentNumber(
    organizationId: string,
    type: ProposalRecord['type'],
  ): Promise<string> {
    return this.proposalPersistence.previewProposalDocumentNumber(organizationId, type);
  }

  deleteProposal(organizationId: string, proposalId: string, audit: CrmAuditInput): Promise<void> {
    return this.proposalPersistence.deleteProposal(organizationId, proposalId, audit);
  }

  createProposal(
    organizationId: string,
    input: CreateProposalInput,
    audit: CrmAuditInput,
  ): Promise<ProposalRecord> {
    return this.proposalPersistence.createProposal(organizationId, input, audit);
  }

  updateProposal(
    organizationId: string,
    proposalId: string,
    input: UpdateProposalInput,
    audit: CrmAuditInput,
  ): Promise<ProposalRecord> {
    return this.proposalPersistence.updateProposal(organizationId, proposalId, input, audit);
  }

  changeProposalStatus(
    organizationId: string,
    proposalId: string,
    toStatus: ProposalStatus,
    note: string,
    adminId: string,
    audit: CrmAuditInput,
  ): Promise<ProposalRecord> {
    return this.proposalPersistence.changeProposalStatus(
      organizationId,
      proposalId,
      toStatus,
      note,
      adminId,
      audit,
    );
  }

  getProposalPrintData(
    organizationId: string,
    proposalId: string,
  ): Promise<ProposalRecord & { organizationName: string }> {
    return this.proposalPersistence.getProposalPrintData(organizationId, proposalId);
  }
}
