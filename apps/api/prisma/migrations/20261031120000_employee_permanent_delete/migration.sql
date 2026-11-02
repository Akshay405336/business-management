-- AlterEnum
ALTER TYPE "CrmAuditEventType" ADD VALUE 'EMPLOYEE_DELETED';

-- AlterTable
ALTER TABLE "employees" ADD COLUMN "owns_login_account" BOOLEAN NOT NULL DEFAULT false;

-- Employees whose sign-in account was created together with them (recorded in the
-- EMPLOYEE_CREATED audit event) own that account; email-linked accounts stay unowned.
UPDATE "employees" e
SET "owns_login_account" = true
WHERE e."platform_admin_id" IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM "crm_audit_events" a
    WHERE a."type" = 'EMPLOYEE_CREATED'
      AND a."entity_id" = e."id"
      AND a."metadata" ->> 'loginAccountCreated' = 'true'
  );
