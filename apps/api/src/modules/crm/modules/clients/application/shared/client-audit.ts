import type { CrmActor } from '../../../../shared/application/crm-actor.js';
import type { ClientAuditEventType } from '../../domain/enums/client-event-type.enum.js';
import type { ClientAuditEntry } from '../../domain/types/client.types.js';

export function clientAudit(
  actor: CrmActor,
  type: ClientAuditEventType,
  entityId: string,
  metadata?: Readonly<Record<string, string | number | boolean | null>>,
): ClientAuditEntry {
  return {
    type,
    adminId: actor.adminId,
    entityType: 'client',
    entityId,
    metadata,
  };
}
