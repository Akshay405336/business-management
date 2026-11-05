import type { CrmAuditEventType } from '../../../domain/crm-types.js';
import type { CrmActor } from '../../../application/shared/crm-actor.js';
import type { PipelineAuditEntry } from '../../domain/types/pipeline.types.js';

export function pipelineAudit(
  actor: CrmActor,
  type: CrmAuditEventType,
  entityId: string,
  metadata?: PipelineAuditEntry['metadata'],
): PipelineAuditEntry {
  return {
    type,
    adminId: actor.adminId,
    entityType: 'pipeline',
    entityId,
    metadata,
  };
}

export function pipelineStageAudit(
  actor: CrmActor,
  type: CrmAuditEventType,
  pipelineId: string,
  stageId: string,
): PipelineAuditEntry {
  return {
    type,
    adminId: actor.adminId,
    entityType: 'pipeline_stage',
    entityId: stageId,
    metadata: { pipelineId },
  };
}
