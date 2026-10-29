CREATE TYPE "ProjectPhaseProductionEventKind" AS ENUM ('STAGE_COMPLETED', 'STAGE_COMPLETION_WITHDRAWN');

CREATE TABLE "project_task_status_events" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "project_task_id" UUID NOT NULL,
    "from_status" "ProjectTaskStatus" NOT NULL,
    "to_status" "ProjectTaskStatus" NOT NULL,
    "actual_started_at_snapshot" TIMESTAMPTZ(3),
    "actual_completed_at_snapshot" TIMESTAMPTZ(3),
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_task_status_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_phase_production_events" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "phase_id" UUID NOT NULL,
    "kind" "ProjectPhaseProductionEventKind" NOT NULL,
    "actual_completed_at" TIMESTAMPTZ(3),
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_phase_production_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "project_task_status_events_organization_id_project_task_id_occ_idx" ON "project_task_status_events"("organization_id", "project_task_id", "occurred_at");

CREATE INDEX "project_phase_production_events_organization_id_phase_id_occ_idx" ON "project_phase_production_events"("organization_id", "phase_id", "occurred_at");

ALTER TABLE "project_task_status_events" ADD CONSTRAINT "project_task_status_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_task_status_events" ADD CONSTRAINT "project_task_status_events_project_task_id_fkey" FOREIGN KEY ("project_task_id") REFERENCES "project_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_phase_production_events" ADD CONSTRAINT "project_phase_production_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_phase_production_events" ADD CONSTRAINT "project_phase_production_events_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "project_phases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
