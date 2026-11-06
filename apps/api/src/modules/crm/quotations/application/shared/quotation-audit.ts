import type { CrmActor } from '../../../application/shared/crm-actor.js';
import type { QuotationAuditEventType } from '../../domain/enums/quotation-event-type.enum.js';
import type { QuotationAuditEntry } from '../../domain/types/quotation.types.js';

export function quotationAudit(
  actor: CrmActor,
  type: QuotationAuditEventType,
  entityId: string,
  metadata?: QuotationAuditEntry['metadata'],
): QuotationAuditEntry {
  return {
    type,
    adminId: actor.adminId,
    entityType: 'quotation',
    entityId,
    metadata,
  };
}
