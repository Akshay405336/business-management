import type { CrmAuditEventType } from '../../../domain/crm-types.js';

export type ServicePackageAuditEventType = Extract<
  CrmAuditEventType,
  'SERVICE_PACKAGE_CREATED' | 'SERVICE_PACKAGE_UPDATED' | 'SERVICE_PACKAGE_DELETED'
>;

/** Domain-only events (not all are persisted as CRM audit rows). */
export type ServicePackageDomainEventType =
  | ServicePackageAuditEventType
  | 'SERVICE_PACKAGE_STATUS_CHANGED';

/** @deprecated Use {@link ServicePackageAuditEventType}. */
export type ServicePackageEventType = ServicePackageAuditEventType;
