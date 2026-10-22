-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');
CREATE TYPE "ProjectPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "ProjectLifecyclePhase" AS ENUM ('PLANNING', 'PRODUCTION', 'QA', 'DEPLOYMENT', 'HANDOVER', 'COMPLETED');
CREATE TYPE "ProjectPhaseStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED');

-- AlterEnum
ALTER TYPE "CrmAuditEventType" ADD VALUE 'PROJECT_CREATED';
ALTER TYPE "CrmAuditEventType" ADD VALUE 'PROJECT_UPDATED';
ALTER TYPE "CrmAuditEventType" ADD VALUE 'PROJECT_DELETED';

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "project_number" VARCHAR(32) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" VARCHAR(4000) NOT NULL DEFAULT '',
    "priority" "ProjectPriority" NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "current_phase" "ProjectLifecyclePhase" NOT NULL DEFAULT 'PLANNING',
    "client_id" UUID NOT NULL,
    "proposal_id" UUID,
    "project_manager_admin_id" UUID,
    "start_date" DATE NOT NULL,
    "expected_end_date" DATE NOT NULL,
    "client_name" VARCHAR(160) NOT NULL,
    "company_name" VARCHAR(160) NOT NULL DEFAULT '',
    "client_phone" VARCHAR(32) NOT NULL DEFAULT '',
    "client_email" VARCHAR(254) NOT NULL DEFAULT '',
    "quotation_number_snapshot" VARCHAR(32) NOT NULL DEFAULT '',
    "quotation_title_snapshot" VARCHAR(200) NOT NULL DEFAULT '',
    "accepted_commercial_value" DECIMAL(18,2),
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "scope_and_requirements" VARCHAR(8000) NOT NULL DEFAULT '',
    "main_deliverables" VARCHAR(4000) NOT NULL DEFAULT '',
    "acceptance_criteria" VARCHAR(4000) NOT NULL DEFAULT '',
    "internal_notes" VARCHAR(4000) NOT NULL DEFAULT '',
    "created_by_admin_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_phases" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "phase" "ProjectLifecyclePhase" NOT NULL,
    "status" "ProjectPhaseStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "start_date" DATE,
    "expected_end_date" DATE,
    "owner_admin_id" UUID,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "project_phases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "projects_organization_id_project_number_key" ON "projects"("organization_id", "project_number");
CREATE INDEX "projects_organization_id_status_current_phase_idx" ON "projects"("organization_id", "status", "current_phase");
CREATE INDEX "projects_organization_id_client_id_idx" ON "projects"("organization_id", "client_id");
CREATE UNIQUE INDEX "project_phases_project_id_phase_key" ON "project_phases"("project_id", "phase");
CREATE INDEX "project_phases_organization_id_project_id_idx" ON "project_phases"("organization_id", "project_id");

ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposal_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_project_manager_admin_id_fkey" FOREIGN KEY ("project_manager_admin_id") REFERENCES "platform_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "platform_admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "project_phases" ADD CONSTRAINT "project_phases_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_phases" ADD CONSTRAINT "project_phases_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_phases" ADD CONSTRAINT "project_phases_owner_admin_id_fkey" FOREIGN KEY ("owner_admin_id") REFERENCES "platform_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
