-- CreateEnum
CREATE TYPE "DailyTaskType" AS ENUM ('GENERAL', 'PROJECT');
CREATE TYPE "DailyTaskCategory" AS ENUM ('DEVELOPMENT', 'DESIGN', 'TESTING', 'DOCUMENTATION', 'MEETING', 'SUPPORT', 'ADMINISTRATION', 'RESEARCH', 'OTHER');
CREATE TYPE "DailyTaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "DailyTaskActivityType" AS ENUM ('CREATED', 'UPDATED', 'STAGE_CHANGED', 'PRIORITY_CHANGED', 'ASSIGNEES_CHANGED', 'RESCHEDULED', 'COMPLETED', 'REOPENED', 'COMMENT_ADDED');

CREATE TABLE "daily_task_workflow_stages" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "stage_key" VARCHAR(64) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "color_token" VARCHAR(32) NOT NULL DEFAULT 'slate',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_completed_stage" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "daily_task_workflow_stages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "daily_tasks" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "type" "DailyTaskType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(4000) NOT NULL DEFAULT '',
    "category" "DailyTaskCategory",
    "workflow_stage_id" UUID NOT NULL,
    "priority" "DailyTaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "assign_date" DATE NOT NULL,
    "due_date" DATE,
    "start_time_minutes" INTEGER,
    "due_time_minutes" INTEGER,
    "estimated_hours" DECIMAL(6,2),
    "project_id" UUID,
    "linked_project_task_id" UUID,
    "instructions" VARCHAR(4000) NOT NULL DEFAULT '',
    "reference_url" VARCHAR(512),
    "completed_at" TIMESTAMPTZ(3),
    "completed_by_admin_id" UUID,
    "created_by_admin_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "daily_tasks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "daily_task_assignees" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "daily_task_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_task_assignees_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "daily_task_activities" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "daily_task_id" UUID NOT NULL,
    "actor_admin_id" UUID NOT NULL,
    "event_type" "DailyTaskActivityType" NOT NULL,
    "metadata" JSONB,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_task_activities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "daily_task_reschedules" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "daily_task_id" UUID NOT NULL,
    "from_assign_date" DATE NOT NULL,
    "to_assign_date" DATE NOT NULL,
    "rescheduled_by_admin_id" UUID NOT NULL,
    "note" VARCHAR(1000) NOT NULL DEFAULT '',
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_task_reschedules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "daily_task_workflow_stages_organization_id_stage_key_key" ON "daily_task_workflow_stages"("organization_id", "stage_key");
CREATE INDEX "daily_task_workflow_stages_organization_id_sort_order_idx" ON "daily_task_workflow_stages"("organization_id", "sort_order");

CREATE INDEX "daily_tasks_organization_id_assign_date_idx" ON "daily_tasks"("organization_id", "assign_date");
CREATE INDEX "daily_tasks_organization_id_workflow_stage_id_assign_date_idx" ON "daily_tasks"("organization_id", "workflow_stage_id", "assign_date");
CREATE INDEX "daily_tasks_organization_id_project_id_idx" ON "daily_tasks"("organization_id", "project_id");

CREATE UNIQUE INDEX "daily_task_assignees_daily_task_id_employee_id_key" ON "daily_task_assignees"("daily_task_id", "employee_id");
CREATE INDEX "daily_task_assignees_organization_id_employee_id_idx" ON "daily_task_assignees"("organization_id", "employee_id");

CREATE INDEX "daily_task_activities_organization_id_daily_task_id_occurred_at_idx" ON "daily_task_activities"("organization_id", "daily_task_id", "occurred_at");
CREATE INDEX "daily_task_reschedules_organization_id_daily_task_id_occurred_at_idx" ON "daily_task_reschedules"("organization_id", "daily_task_id", "occurred_at");

ALTER TABLE "daily_task_workflow_stages" ADD CONSTRAINT "daily_task_workflow_stages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "daily_tasks" ADD CONSTRAINT "daily_tasks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "daily_tasks" ADD CONSTRAINT "daily_tasks_workflow_stage_id_fkey" FOREIGN KEY ("workflow_stage_id") REFERENCES "daily_task_workflow_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "daily_tasks" ADD CONSTRAINT "daily_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "daily_tasks" ADD CONSTRAINT "daily_tasks_linked_project_task_id_fkey" FOREIGN KEY ("linked_project_task_id") REFERENCES "project_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "daily_tasks" ADD CONSTRAINT "daily_tasks_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "platform_admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "daily_tasks" ADD CONSTRAINT "daily_tasks_completed_by_admin_id_fkey" FOREIGN KEY ("completed_by_admin_id") REFERENCES "platform_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "daily_task_assignees" ADD CONSTRAINT "daily_task_assignees_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "daily_task_assignees" ADD CONSTRAINT "daily_task_assignees_daily_task_id_fkey" FOREIGN KEY ("daily_task_id") REFERENCES "daily_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "daily_task_assignees" ADD CONSTRAINT "daily_task_assignees_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "daily_task_activities" ADD CONSTRAINT "daily_task_activities_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "daily_task_activities" ADD CONSTRAINT "daily_task_activities_daily_task_id_fkey" FOREIGN KEY ("daily_task_id") REFERENCES "daily_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "daily_task_activities" ADD CONSTRAINT "daily_task_activities_actor_admin_id_fkey" FOREIGN KEY ("actor_admin_id") REFERENCES "platform_admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "daily_task_reschedules" ADD CONSTRAINT "daily_task_reschedules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "daily_task_reschedules" ADD CONSTRAINT "daily_task_reschedules_daily_task_id_fkey" FOREIGN KEY ("daily_task_id") REFERENCES "daily_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "daily_task_reschedules" ADD CONSTRAINT "daily_task_reschedules_rescheduled_by_admin_id_fkey" FOREIGN KEY ("rescheduled_by_admin_id") REFERENCES "platform_admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
