-- Forward-only: audit employee profile and compensation updates.
ALTER TYPE "CrmAuditEventType" ADD VALUE IF NOT EXISTS 'EMPLOYEE_UPDATED';
