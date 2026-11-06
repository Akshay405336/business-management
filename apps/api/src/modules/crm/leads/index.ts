export { LEAD_REPOSITORY, type LeadRepository } from './domain/repositories/lead.repository.js';
export type { LeadReadModel, LeadActivityReadModel } from './domain/types/lead-read-model.js';
export type {
  CreateLeadData,
  UpdateLeadData,
  LeadListFilters,
  LeadAuditEntry,
} from './domain/types/lead.types.js';
export type { LeadPriority } from './domain/enums/lead-priority.enum.js';
export type { LeadSource } from './domain/enums/lead-source.enum.js';
export type { LeadActivityType } from './domain/enums/lead-activity-type.enum.js';

export { CreateLeadHandler } from './application/create/create-lead.handler.js';
export { UpdateLeadHandler } from './application/update/update-lead.handler.js';
export { DeleteLeadHandler } from './application/delete/delete-lead.handler.js';
export { BulkDeleteLeadsHandler } from './application/bulk-delete/bulk-delete-leads.handler.js';
export { LeadBulkActionRunner } from './application/bulk-operations/lead-bulk-action.runner.js';
export { GetLeadHandler } from './application/get/get-lead.handler.js';
export { ListLeadsHandler } from './application/list/list-leads.handler.js';
export { ChangeLeadStageHandler } from './application/change-stage/change-lead-stage.handler.js';
export { CreateLeadActivityHandler } from './application/create-activity/create-lead-activity.handler.js';
export { ListLeadActivitiesHandler } from './application/list-activities/list-lead-activities.handler.js';
export { ConvertLeadHandler } from './application/convert/convert-lead.handler.js';
export { LinkLeadToClientHandler } from './application/link-client/link-lead-to-client.handler.js';
export { ListLeadTagsHandler } from './application/tags/list-lead-tags.handler.js';
export { CreateLeadTagHandler } from './application/tags/create-lead-tag.handler.js';
export { ValidateLeadImportHandler } from './application/import/validate-lead-import.handler.js';
export { ExecuteLeadImportHandler } from './application/import/execute-lead-import.handler.js';

export { LeadController } from './presentation/controllers/lead.controller.js';
export { PrismaLeadRepository } from './infrastructure/persistence/prisma/repositories/prisma-lead.repository.js';
