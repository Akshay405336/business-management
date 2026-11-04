-- One-time dev fix after removing bad migrations (safe to re-run).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND n.nspname = 'public'
      AND c.relname = 'daily_task_notes_organization_id_daily_task_id_acknowledgement_idx'
  ) THEN
    ALTER INDEX "daily_task_notes_organization_id_daily_task_id_acknowledgement_idx"
      RENAME TO "daily_task_notes_organization_id_daily_task_id_acknowledgem_idx";
  ELSIF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND n.nspname = 'public'
      AND c.relname = 'daily_task_notes_organization_id_daily_task_id_acknowledgement_'
  ) THEN
    ALTER INDEX "daily_task_notes_organization_id_daily_task_id_acknowledgement_"
      RENAME TO "daily_task_notes_organization_id_daily_task_id_acknowledgem_idx";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND n.nspname = 'public'
      AND c.relname = 'daily_tasks_organization_id_workflow_stage_id_assign_date_kanba'
  ) THEN
    ALTER INDEX "daily_tasks_organization_id_workflow_stage_id_assign_date_kanba"
      RENAME TO "daily_tasks_organization_id_workflow_stage_id_assign_date_k_idx";
  ELSIF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND n.nspname = 'public'
      AND c.relname = 'daily_tasks_organization_id_workflow_stage_id_assign_date_kanban_sort_order_idx'
  ) THEN
    ALTER INDEX "daily_tasks_organization_id_workflow_stage_id_assign_date_kanban_sort_order_idx"
      RENAME TO "daily_tasks_organization_id_workflow_stage_id_assign_date_k_idx";
  END IF;
END $$;
