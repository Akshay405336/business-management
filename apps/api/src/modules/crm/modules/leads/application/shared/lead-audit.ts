import type { CrmActor } from '../../../../shared/application/crm-actor.js';
import type { LeadAuditEntry } from '../../domain/types/lead.types.js';

export function leadAudit(
  actor: CrmActor,
  type: LeadAuditEntry['type'],
  entityId: string,
  metadata?: LeadAuditEntry['metadata'],
): LeadAuditEntry {
  return {
    type,
    adminId: actor.adminId,
    entityType: 'lead',
    entityId,
    metadata,
  };
}
