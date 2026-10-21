import { Inject, Injectable } from '@nestjs/common';
import type {
  ClientStatus,
  ClientType,
  LeadActivityType,
  LeadPriority,
  LeadSource,
  PipelineStageOutcome,
  PipelineStatus,
  ProposalDocumentType,
  ProposalStatus,
} from '../domain/crm-types.js';
import { CrmNotFoundError } from '../domain/errors/crm.errors.js';
import {
  CRM_REPOSITORY,
  type ChangeServicePackageStatusInput,
  type CreateProposalInput,
  type CreateServicePackageInput,
  type CrmRepository,
  type LeadListFilters,
  type UpdateProposalInput,
  type UpdateServicePackageInput,
} from '../domain/repositories/crm.repository.js';

export interface CrmActor {
  readonly organizationId: string;
  readonly adminId: string;
}

@Injectable()
export class CrmUseCases {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  listPipelines(actor: CrmActor) {
    return this.crm.listPipelines(actor.organizationId);
  }

  getDefaultPipeline(actor: CrmActor) {
    return this.crm.getDefaultPipeline(actor.organizationId);
  }

  getPipeline(actor: CrmActor, pipelineId: string) {
    return this.require(this.crm.getPipeline(actor.organizationId, pipelineId), 'Pipeline');
  }

  createPipeline(
    actor: CrmActor,
    input: { name: string; description?: string; status?: PipelineStatus },
  ) {
    return this.crm.createPipeline(actor.organizationId, input, {
      type: 'PIPELINE_CREATED',
      adminId: actor.adminId,
      entityType: 'pipeline',
      entityId: crypto.randomUUID(),
      metadata: { name: input.name },
    });
  }

  updatePipeline(
    actor: CrmActor,
    pipelineId: string,
    input: {
      name?: string;
      description?: string;
      status?: PipelineStatus;
      sortOrder?: number;
    },
  ) {
    return this.crm.updatePipeline(actor.organizationId, pipelineId, input, {
      type: 'PIPELINE_UPDATED',
      adminId: actor.adminId,
      entityType: 'pipeline',
      entityId: pipelineId,
    });
  }

  deletePipeline(actor: CrmActor, pipelineId: string) {
    return this.crm.deletePipeline(actor.organizationId, pipelineId, {
      type: 'PIPELINE_DELETED',
      adminId: actor.adminId,
      entityType: 'pipeline',
      entityId: pipelineId,
    });
  }

  createStage(
    actor: CrmActor,
    pipelineId: string,
    input: {
      name: string;
      description?: string;
      color?: string;
      status?: PipelineStatus;
      outcome?: PipelineStageOutcome;
    },
  ) {
    return this.crm.createStage(actor.organizationId, pipelineId, input, {
      type: 'STAGE_CREATED',
      adminId: actor.adminId,
      entityType: 'pipeline_stage',
      entityId: crypto.randomUUID(),
      metadata: { pipelineId, name: input.name },
    });
  }

  updateStage(
    actor: CrmActor,
    pipelineId: string,
    stageId: string,
    input: {
      name?: string;
      description?: string;
      color?: string;
      status?: PipelineStatus;
      outcome?: PipelineStageOutcome;
    },
  ) {
    return this.crm.updateStage(actor.organizationId, pipelineId, stageId, input, {
      type: 'STAGE_UPDATED',
      adminId: actor.adminId,
      entityType: 'pipeline_stage',
      entityId: stageId,
    });
  }

  deleteStage(actor: CrmActor, pipelineId: string, stageId: string, targetStageId?: string) {
    return this.crm.deleteStage(actor.organizationId, pipelineId, stageId, targetStageId, {
      type: 'STAGE_DELETED',
      adminId: actor.adminId,
      entityType: 'pipeline_stage',
      entityId: stageId,
    });
  }

  reorderStages(actor: CrmActor, pipelineId: string, orderedStageIds: readonly string[]) {
    return this.crm.reorderStages(actor.organizationId, pipelineId, orderedStageIds, {
      type: 'STAGE_REORDERED',
      adminId: actor.adminId,
      entityType: 'pipeline',
      entityId: pipelineId,
    });
  }

  activateStage(actor: CrmActor, pipelineId: string, stageId: string) {
    return this.crm.activateStage(actor.organizationId, pipelineId, stageId, {
      type: 'STAGE_UPDATED',
      adminId: actor.adminId,
      entityType: 'pipeline_stage',
      entityId: stageId,
      metadata: { action: 'activate' },
    });
  }

  deactivateStage(actor: CrmActor, pipelineId: string, stageId: string, targetStageId?: string) {
    return this.crm.deactivateStage(actor.organizationId, pipelineId, stageId, targetStageId, {
      type: 'STAGE_UPDATED',
      adminId: actor.adminId,
      entityType: 'pipeline_stage',
      entityId: stageId,
      metadata: { action: 'deactivate' },
    });
  }

  listLeads(
    actor: CrmActor,
    filters: Omit<LeadListFilters, 'page' | 'pageSize'> & { page?: number; pageSize?: number },
  ) {
    return this.crm.listLeads(actor.organizationId, {
      ...filters,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 25,
    });
  }

  getLead(actor: CrmActor, leadId: string) {
    return this.require(this.crm.getLead(actor.organizationId, leadId), 'Lead');
  }

  createLead(
    actor: CrmActor,
    input: {
      fullName: string;
      companyName?: string;
      email?: string | null;
      phone?: string | null;
      website?: string | null;
      source?: LeadSource;
      pipelineId: string;
      stageId?: string;
      assignedAdminId?: string | null;
      priority?: LeadPriority;
      estimatedValue?: string | number;
      currency?: string;
      expectedCloseDate?: Date | null;
      nextFollowUpDate?: Date | null;
      description?: string;
      tags?: readonly string[];
    },
  ) {
    const leadId = crypto.randomUUID();
    return this.crm.createLead(
      actor.organizationId,
      { ...input, createdByAdminId: actor.adminId },
      {
        type: 'LEAD_CREATED',
        adminId: actor.adminId,
        entityType: 'lead',
        entityId: leadId,
      },
    );
  }

  updateLead(
    actor: CrmActor,
    leadId: string,
    input: {
      fullName?: string;
      companyName?: string;
      email?: string | null;
      phone?: string | null;
      website?: string | null;
      source?: LeadSource;
      pipelineId?: string;
      stageId?: string;
      assignedAdminId?: string | null;
      priority?: LeadPriority;
      estimatedValue?: string | number;
      currency?: string;
      expectedCloseDate?: Date | null;
      nextFollowUpDate?: Date | null;
      description?: string;
      tags?: readonly string[];
      archived?: boolean;
    },
  ) {
    const { archived, ...rest } = input;
    return this.crm.updateLead(
      actor.organizationId,
      leadId,
      {
        ...rest,
        archivedAt: archived === undefined ? undefined : archived ? new Date() : null,
      },
      {
        type: archived ? 'LEAD_ARCHIVED' : 'LEAD_UPDATED',
        adminId: actor.adminId,
        entityType: 'lead',
        entityId: leadId,
      },
    );
  }

  deleteLead(actor: CrmActor, leadId: string) {
    return this.crm.deleteLead(actor.organizationId, leadId, {
      type: 'LEAD_DELETED',
      adminId: actor.adminId,
      entityType: 'lead',
      entityId: leadId,
    });
  }

  changeLeadStage(
    actor: CrmActor,
    leadId: string,
    stageId: string,
    beforeLeadId?: string | null,
  ) {
    return this.crm.changeLeadStage(
      actor.organizationId,
      leadId,
      stageId,
      beforeLeadId,
      actor.adminId,
      {
        type: 'LEAD_STAGE_CHANGED',
        adminId: actor.adminId,
        entityType: 'lead',
        entityId: leadId,
        metadata: { stageId, beforeLeadId: beforeLeadId ?? null },
      },
    );
  }

  listLeadActivities(actor: CrmActor, leadId: string) {
    return this.crm.listLeadActivities(actor.organizationId, leadId);
  }

  createLeadActivity(
    actor: CrmActor,
    leadId: string,
    input: {
      type: LeadActivityType;
      title: string;
      description?: string;
      occurredAt: Date;
      dueAt?: Date | null;
      completedAt?: Date | null;
      metadata?: unknown;
    },
  ) {
    return this.crm.createLeadActivity(actor.organizationId, leadId, {
      ...input,
      createdByAdminId: actor.adminId,
    });
  }

  convertLead(actor: CrmActor, leadId: string) {
    return this.crm.convertLeadToClient(actor.organizationId, leadId, actor.adminId, {
      type: 'LEAD_CONVERTED',
      adminId: actor.adminId,
      entityType: 'lead',
      entityId: leadId,
    });
  }

  listClients(actor: CrmActor) {
    return this.crm.listClients(actor.organizationId);
  }

  getClient(actor: CrmActor, clientId: string) {
    return this.require(this.crm.getClient(actor.organizationId, clientId), 'Client');
  }

  createClient(
    actor: CrmActor,
    input: {
      type: ClientType;
      name: string;
      primaryContact?: string;
      email?: string | null;
      phone?: string | null;
      website?: string | null;
      billingAddress?: string;
      taxRegistration?: string;
      status?: ClientStatus;
      notes?: string;
      sourceLeadId?: string | null;
    },
  ) {
    const clientId = crypto.randomUUID();
    return this.crm.createClient(
      actor.organizationId,
      { ...input, createdByAdminId: actor.adminId },
      {
        type: 'CLIENT_CREATED',
        adminId: actor.adminId,
        entityType: 'client',
        entityId: clientId,
      },
    );
  }

  updateClient(
    actor: CrmActor,
    clientId: string,
    input: {
      type?: ClientType;
      name?: string;
      primaryContact?: string;
      email?: string | null;
      phone?: string | null;
      website?: string | null;
      billingAddress?: string;
      taxRegistration?: string;
      status?: ClientStatus;
      notes?: string;
      archived?: boolean;
    },
  ) {
    const { archived, ...rest } = input;
    return this.crm.updateClient(
      actor.organizationId,
      clientId,
      {
        ...rest,
        archivedAt: archived === undefined ? undefined : archived ? new Date() : null,
      },
      {
        type: 'CLIENT_UPDATED',
        adminId: actor.adminId,
        entityType: 'client',
        entityId: clientId,
      },
    );
  }

  convertLeadToClient(actor: CrmActor, leadId: string) {
    return this.convertLead(actor, leadId);
  }

  previewClientReference(actor: CrmActor) {
    return this.crm.previewClientReference(actor.organizationId);
  }

  deleteClient(actor: CrmActor, clientId: string) {
    return this.crm.deleteClient(actor.organizationId, clientId, {
      type: 'CLIENT_UPDATED',
      adminId: actor.adminId,
      entityType: 'client',
      entityId: clientId,
      metadata: { deleted: true },
    });
  }

  listProposals(actor: CrmActor, filters: import('../domain/repositories/crm.repository.js').ProposalListFilters) {
    return this.crm.listProposals(actor.organizationId, filters);
  }

  previewProposalDocumentNumber(actor: CrmActor, type: ProposalDocumentType) {
    return this.crm.previewProposalDocumentNumber(actor.organizationId, type);
  }

  deleteProposal(actor: CrmActor, proposalId: string) {
    return this.crm.deleteProposal(actor.organizationId, proposalId, {
      type: 'PROPOSAL_UPDATED',
      adminId: actor.adminId,
      entityType: 'proposal',
      entityId: proposalId,
    });
  }

  getProposal(actor: CrmActor, proposalId: string) {
    return this.require(this.crm.getProposal(actor.organizationId, proposalId), 'Proposal');
  }

  createProposal(actor: CrmActor, input: CreateProposalInput) {
    const proposalId = crypto.randomUUID();
    return this.crm.createProposal(
      actor.organizationId,
      { ...input, createdByAdminId: actor.adminId },
      {
        type: 'PROPOSAL_CREATED',
        adminId: actor.adminId,
        entityType: 'proposal',
        entityId: proposalId,
      },
    );
  }

  updateProposal(actor: CrmActor, proposalId: string, input: UpdateProposalInput) {
    return this.crm.updateProposal(actor.organizationId, proposalId, input, {
      type: 'PROPOSAL_UPDATED',
      adminId: actor.adminId,
      entityType: 'proposal',
      entityId: proposalId,
    });
  }

  changeProposalStatus(actor: CrmActor, proposalId: string, toStatus: ProposalStatus, note = '') {
    return this.crm.changeProposalStatus(
      actor.organizationId,
      proposalId,
      toStatus,
      note,
      actor.adminId,
      {
        type: 'PROPOSAL_STATUS_CHANGED',
        adminId: actor.adminId,
        entityType: 'proposal',
        entityId: proposalId,
        metadata: { toStatus },
      },
    );
  }

  getProposalPrintData(actor: CrmActor, proposalId: string) {
    return this.crm.getProposalPrintData(actor.organizationId, proposalId);
  }

  listServicePackages(actor: CrmActor) {
    return this.crm.listServicePackages(actor.organizationId);
  }

  getServicePackage(actor: CrmActor, packageId: string) {
    return this.require(this.crm.getServicePackage(actor.organizationId, packageId), 'Service package');
  }

  previewServicePackageCode(actor: CrmActor) {
    return this.crm.previewServicePackageCode(actor.organizationId);
  }

  createServicePackage(actor: CrmActor, input: CreateServicePackageInput) {
    return this.crm.createServicePackage(actor.organizationId, input, {
      type: 'SERVICE_PACKAGE_CREATED',
      adminId: actor.adminId,
      entityType: 'service_package',
      entityId: 'pending',
    });
  }

  updateServicePackage(
    actor: CrmActor,
    packageId: string,
    input: UpdateServicePackageInput,
  ) {
    return this.crm.updateServicePackage(actor.organizationId, packageId, input, {
      type: 'SERVICE_PACKAGE_UPDATED',
      adminId: actor.adminId,
      entityType: 'service_package',
      entityId: packageId,
    });
  }

  changeServicePackageStatus(
    actor: CrmActor,
    packageId: string,
    input: ChangeServicePackageStatusInput,
  ) {
    return this.crm.changeServicePackageStatus(actor.organizationId, packageId, input, {
      type: 'SERVICE_PACKAGE_UPDATED',
      adminId: actor.adminId,
      entityType: 'service_package',
      entityId: packageId,
    });
  }

  deleteServicePackage(actor: CrmActor, packageId: string) {
    return this.crm.deleteServicePackage(actor.organizationId, packageId, {
      type: 'SERVICE_PACKAGE_UPDATED',
      adminId: actor.adminId,
      entityType: 'service_package',
      entityId: packageId,
    });
  }

  private async require<T>(promise: Promise<T | null>, entity: string): Promise<T> {
    const value = await promise;
    if (!value) throw new CrmNotFoundError(entity);
    return value;
  }
}
