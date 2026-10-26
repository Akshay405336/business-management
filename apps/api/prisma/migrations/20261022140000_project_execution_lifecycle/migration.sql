-- Project execution lifecycle (planning → production → completed), separate from admin ProjectStatus.

CREATE TYPE "ProjectExecutionLifecycle" AS ENUM (
  'NOT_PLANNED',
  'PLANNED',
  'IN_PRODUCTION',
  'COMPLETED'
);

ALTER TABLE "projects"
  ADD COLUMN "execution_lifecycle" "ProjectExecutionLifecycle" NOT NULL DEFAULT 'NOT_PLANNED',
  ADD COLUMN "actual_production_started_at" TIMESTAMPTZ(3),
  ADD COLUMN "actual_completed_at" TIMESTAMPTZ(3);

ALTER TABLE "project_phases"
  ADD COLUMN "actual_started_at" TIMESTAMPTZ(3),
  ADD COLUMN "actual_completed_at" TIMESTAMPTZ(3);

ALTER TABLE "project_tasks"
  ADD COLUMN "actual_started_at" TIMESTAMPTZ(3),
  ADD COLUMN "actual_completed_at" TIMESTAMPTZ(3);

CREATE INDEX "projects_organization_id_execution_lifecycle_idx"
  ON "projects"("organization_id", "execution_lifecycle");

-- Backfill: completed admin status → execution completed; projects with tasks → planned.
UPDATE "projects"
SET "execution_lifecycle" = 'COMPLETED'
WHERE "status" = 'COMPLETED';

UPDATE "projects" p
SET "execution_lifecycle" = 'PLANNED'
WHERE p."execution_lifecycle" = 'NOT_PLANNED'
  AND EXISTS (SELECT 1 FROM "project_tasks" t WHERE t."project_id" = p."id");
