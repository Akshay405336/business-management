-- AlterEnum
ALTER TYPE "CrmAuditEventType" ADD VALUE 'EMPLOYEE_CREATED';
ALTER TYPE "CrmAuditEventType" ADD VALUE 'EMPLOYEE_STATUS_CHANGED';

-- AlterTable
ALTER TABLE "employees" ADD COLUMN "department" VARCHAR(120);

-- Preserve existing access: custom roles that could create or edit tasks keep
-- the ability to choose assignees now that assignment is its own permission.
INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT DISTINCT p."role_id", 'tasks.assign'
FROM "organization_role_permissions" p
JOIN "organization_roles" r ON r."id" = p."role_id"
WHERE r."is_system" = false
  AND p."permission_key" IN ('tasks.create', 'tasks.update')
ON CONFLICT DO NOTHING;
