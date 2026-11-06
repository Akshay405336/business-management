-- Forward-only: CRM audit enum for client deletion.
ALTER TYPE "CrmAuditEventType" ADD VALUE IF NOT EXISTS 'CLIENT_DELETED';
