ALTER TABLE "daily_tasks" ADD COLUMN "kanban_sort_order" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "daily_tasks_organization_id_workflow_stage_id_assign_date_k_idx"
  ON "daily_tasks" ("organization_id", "workflow_stage_id", "assign_date", "kanban_sort_order");

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id, workflow_stage_id, assign_date
      ORDER BY priority DESC, updated_at DESC
    ) - 1 AS rn
  FROM "daily_tasks"
  WHERE workflow_stage_id IS NOT NULL
)
UPDATE "daily_tasks"
SET "kanban_sort_order" = ranked.rn
FROM ranked
WHERE "daily_tasks".id = ranked.id;
