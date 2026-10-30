-- Prisma truncates long PostgreSQL index identifiers; use stable shorter names.
ALTER INDEX "project_phase_production_events_organization_id_phase_id_occ_idx"
  RENAME TO "project_phase_production_events_organization_id_phase_id_oc_idx";

ALTER INDEX "project_task_status_events_organization_id_project_task_id_occ_idx"
  RENAME TO "project_task_status_events_organization_id_project_task_id__idx";
