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
} from '../types';

const titleCase = (value: string): string =>
  value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const labelPipelineStatus = (status: PipelineStatus): string => titleCase(status);
export const labelStageOutcome = (outcome: PipelineStageOutcome): string => titleCase(outcome);
export const labelLeadPriority = (priority: LeadPriority): string => titleCase(priority);
export const labelLeadSource = (source: LeadSource): string => titleCase(source);
export const labelActivityType = (type: LeadActivityType): string => titleCase(type);
export const labelClientType = (type: ClientType): string => titleCase(type);
export const labelClientStatus = (status: ClientStatus): string => titleCase(status);
export const labelProposalType = (type: ProposalDocumentType): string => titleCase(type);
export const labelProposalStatus = (status: ProposalStatus): string => titleCase(status);
