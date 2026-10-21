-- Per-stage Kanban ordering for leads
ALTER TABLE "leads" ADD COLUMN "kanban_sort_order" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "leads_organization_id_stage_id_kanban_sort_order_idx"
  ON "leads" ("organization_id", "stage_id", "kanban_sort_order");

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY stage_id ORDER BY created_at ASC) - 1 AS rn
  FROM "leads"
)
UPDATE "leads"
SET "kanban_sort_order" = ranked.rn
FROM ranked
WHERE "leads".id = ranked.id;
