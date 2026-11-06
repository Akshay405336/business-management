import type {
  ClientQuotationListResponse,
  ClientQuotationOption,
  ProjectDetail,
  ProjectListItem,
  ProjectManagerOption,
  ProjectPhase,
} from '@techwin/contracts';
import type {
  ClientQuotationRecord,
  ProjectDetailRecord,
  ProjectListRecord,
  ProjectManagerRecord,
  ProjectPhaseRecord,
} from '../../../domain/repositories/project.repository.js';

export function toProjectListItem(record: ProjectListRecord): ProjectListItem {
  return { ...record };
}

export function toProjectPhase(record: ProjectPhaseRecord): ProjectPhase {
  return { ...record };
}

export function toProjectDetail(record: ProjectDetailRecord): ProjectDetail {
  return {
    ...toProjectListItem(record),
    description: record.description,
    clientPhone: record.clientPhone,
    clientEmail: record.clientEmail,
    projectManagerAdminId: record.projectManagerAdminId,
    projectManagerName: record.projectManagerName,
    expectedEndDate: record.expectedEndDate,
    currentPhase: record.currentPhase,
    proposalId: record.proposalId,
    quotationNumber: record.quotationNumber,
    quotationTitle: record.quotationTitle,
    acceptedCommercialValue: record.acceptedCommercialValue,
    currency: record.currency,
    scopeAndRequirements: record.scopeAndRequirements,
    mainDeliverables: record.mainDeliverables,
    acceptanceCriteria: record.acceptanceCriteria,
    internalNotes: record.internalNotes,
    phases: record.phases.map(toProjectPhase),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function toProjectManagerOption(record: ProjectManagerRecord): ProjectManagerOption {
  return { ...record };
}

export function toClientQuotationOption(record: ClientQuotationRecord): ClientQuotationOption {
  return { ...record };
}

export function toClientQuotationListResponse(
  records: readonly ClientQuotationRecord[],
): ClientQuotationListResponse {
  return { quotations: records.map(toClientQuotationOption) };
}
