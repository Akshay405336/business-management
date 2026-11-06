-- Forward-only: extend CRM audit enum for service package deletion.
ALTER TYPE "CrmAuditEventType" ADD VALUE IF NOT EXISTS 'SERVICE_PACKAGE_DELETED';
