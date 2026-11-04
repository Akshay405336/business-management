-- CreateEnum
CREATE TYPE "DailyTaskNoteAckStatus" AS ENUM ('UNREAD', 'ACKNOWLEDGED');

-- CreateTable
CREATE TABLE "daily_task_notes" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "daily_task_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "author_admin_id" UUID NOT NULL,
    "text" VARCHAR(2000) NOT NULL,
    "acknowledgement_status" "DailyTaskNoteAckStatus" NOT NULL DEFAULT 'UNREAD',
    "acknowledged_by_admin_id" UUID,
    "acknowledged_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_task_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_task_notes_organization_id_daily_task_id_created_at_idx" ON "daily_task_notes"("organization_id", "daily_task_id", "created_at");

-- CreateIndex
CREATE INDEX "daily_task_notes_organization_id_daily_task_id_acknowledgem_idx" ON "daily_task_notes"("organization_id", "daily_task_id", "acknowledgement_status");

-- CreateIndex
CREATE INDEX "daily_task_notes_organization_id_employee_id_created_at_idx" ON "daily_task_notes"("organization_id", "employee_id", "created_at");

-- AddForeignKey
ALTER TABLE "daily_task_notes" ADD CONSTRAINT "daily_task_notes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_task_notes" ADD CONSTRAINT "daily_task_notes_daily_task_id_fkey" FOREIGN KEY ("daily_task_id") REFERENCES "daily_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_task_notes" ADD CONSTRAINT "daily_task_notes_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_task_notes" ADD CONSTRAINT "daily_task_notes_author_admin_id_fkey" FOREIGN KEY ("author_admin_id") REFERENCES "platform_admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_task_notes" ADD CONSTRAINT "daily_task_notes_acknowledged_by_admin_id_fkey" FOREIGN KEY ("acknowledged_by_admin_id") REFERENCES "platform_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Grant note permissions to system roles (additive)
INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT r."id", 'daily_tasks.notes.create'
FROM "organization_roles" r
WHERE r."key" = 'employee' AND r."is_system" = true
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT r."id", 'daily_tasks.notes.view_own'
FROM "organization_roles" r
WHERE r."key" = 'employee' AND r."is_system" = true
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT r."id", 'daily_tasks.notes.view_all'
FROM "organization_roles" r
WHERE r."key" IN ('owner', 'admin') AND r."is_system" = true
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT r."id", 'daily_tasks.notes.acknowledge'
FROM "organization_roles" r
WHERE r."key" IN ('owner', 'admin') AND r."is_system" = true
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'daily_tasks.notes.create'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'daily_tasks.comment'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'daily_tasks.notes.view_own'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'daily_tasks.comment'
ON CONFLICT DO NOTHING;
