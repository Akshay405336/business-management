-- Project daily tasks use project phases; general tasks use daily workflow stages.

ALTER TABLE "daily_tasks" ADD COLUMN "project_phase_id" UUID;

ALTER TABLE "daily_tasks" ALTER COLUMN "workflow_stage_id" DROP NOT NULL;

CREATE INDEX "daily_tasks_organization_id_project_phase_id_assign_date_idx"
  ON "daily_tasks"("organization_id", "project_phase_id", "assign_date");

ALTER TABLE "daily_tasks"
  ADD CONSTRAINT "daily_tasks_project_phase_id_fkey"
  FOREIGN KEY ("project_phase_id") REFERENCES "project_phases"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
