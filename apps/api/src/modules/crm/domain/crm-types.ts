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
export type CrmAuditEventType =
  | 'PIPELINE_CREATED'
  | 'PIPELINE_UPDATED'
  | 'PIPELINE_DELETED'
  | 'STAGE_CREATED'
  | 'STAGE_UPDATED'
  | 'STAGE_DELETED'
  | 'STAGE_REORDERED'
  | 'LEAD_CREATED'
  | 'LEAD_UPDATED'
  | 'LEAD_ARCHIVED'
  | 'LEAD_RESTORED'
  | 'LEAD_DELETED'
  | 'LEAD_STAGE_CHANGED'
  | 'LEAD_CONVERTED'
  | 'CLIENT_CREATED'
  | 'CLIENT_UPDATED'
  | 'PROPOSAL_CREATED'
  | 'PROPOSAL_UPDATED'
  | 'PROPOSAL_STATUS_CHANGED'
  | 'SERVICE_PACKAGE_CREATED'
  | 'SERVICE_PACKAGE_UPDATED';
