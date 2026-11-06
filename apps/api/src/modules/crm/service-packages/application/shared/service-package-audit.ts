import type { CrmActor } from '../../../application/shared/crm-actor.js';
import type { ServicePackageAuditEntry } from '../../domain/types/service-package.types.js';
import type { ServicePackageAuditEventType } from '../../domain/enums/service-package-event-type.enum.js';

export function servicePackageAudit(
  actor: CrmActor,
  type: ServicePackageAuditEventType,
  entityId: string,
): ServicePackageAuditEntry {
  return {
    type,
    adminId: actor.adminId,
    entityType: 'service_package',
    entityId,
  };
}
