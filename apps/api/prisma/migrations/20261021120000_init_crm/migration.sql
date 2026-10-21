-- CRM: organizations, pipelines, leads, clients, proposals (tenant-scoped)

CREATE TYPE "PipelineStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "PipelineStageOutcome" AS ENUM ('NONE', 'WON', 'LOST');
CREATE TYPE "LeadPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "LeadSource" AS ENUM ('WEBSITE', 'REFERRAL', 'COLD_CALL', 'EMAIL', 'SOCIAL', 'EVENT', 'PARTNER', 'OTHER');
CREATE TYPE "LeadActivityType" AS ENUM (
  'FIRST_CALL', 'FOLLOW_UP_CALL', 'MEETING', 'EMAIL', 'NOTE', 'TASK',
  'STAGE_CHANGE', 'PROPOSAL_CREATED', 'PROPOSAL_STATUS_CHANGE', 'LEAD_CONVERTED'
);
CREATE TYPE "ClientType" AS ENUM ('INDIVIDUAL', 'COMPANY');
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "ProposalDocumentType" AS ENUM ('PROPOSAL', 'QUOTATION');
CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "CrmAuditEventType" AS ENUM (
  'PIPELINE_CREATED', 'PIPELINE_UPDATED', 'PIPELINE_DELETED',
  'STAGE_CREATED', 'STAGE_UPDATED', 'STAGE_DELETED', 'STAGE_REORDERED',
  'LEAD_CREATED', 'LEAD_UPDATED', 'LEAD_ARCHIVED', 'LEAD_RESTORED', 'LEAD_DELETED', 'LEAD_STAGE_CHANGED', 'LEAD_CONVERTED',
  'CLIENT_CREATED', 'CLIENT_UPDATED',
  'PROPOSAL_CREATED', 'PROPOSAL_UPDATED', 'PROPOSAL_STATUS_CHANGED'
);

ALTER TABLE "platform_admins" ADD COLUMN "organization_id" UUID;

CREATE TABLE "organizations" (
  "id" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "slug" VARCHAR(64) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

CREATE TABLE "organization_sequences" (
  "organization_id" UUID NOT NULL,
  "key" VARCHAR(32) NOT NULL,
  "last_value" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "organization_sequences_pkey" PRIMARY KEY ("organization_id","key")
);

CREATE TABLE "pipelines" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "description" VARCHAR(2000) NOT NULL DEFAULT '',
  "status" "PipelineStatus" NOT NULL DEFAULT 'ACTIVE',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "pipelines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pipelines_organization_id_name_key" ON "pipelines"("organization_id", "name");
CREATE INDEX "pipelines_organization_id_status_sort_order_idx" ON "pipelines"("organization_id", "status", "sort_order");

CREATE TABLE "pipeline_stages" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "pipeline_id" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "description" VARCHAR(2000) NOT NULL DEFAULT '',
  "color" VARCHAR(7) NOT NULL DEFAULT '#64748b',
  "status" "PipelineStatus" NOT NULL DEFAULT 'ACTIVE',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "outcome" "PipelineStageOutcome" NOT NULL DEFAULT 'NONE',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "pipeline_stages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pipeline_stages_pipeline_id_name_key" ON "pipeline_stages"("pipeline_id", "name");
CREATE INDEX "pipeline_stages_organization_id_pipeline_id_sort_order_idx" ON "pipeline_stages"("organization_id", "pipeline_id", "sort_order");

CREATE TABLE "leads" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "reference_number" VARCHAR(32) NOT NULL,
  "full_name" VARCHAR(160) NOT NULL,
  "company_name" VARCHAR(160) NOT NULL DEFAULT '',
  "email" VARCHAR(254),
  "phone" VARCHAR(32),
  "website" VARCHAR(512),
  "source" "LeadSource" NOT NULL DEFAULT 'OTHER',
  "pipeline_id" UUID NOT NULL,
  "stage_id" UUID NOT NULL,
  "assigned_admin_id" UUID,
  "priority" "LeadPriority" NOT NULL DEFAULT 'MEDIUM',
  "estimated_value" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "currency" CHAR(3) NOT NULL DEFAULT 'USD',
  "expected_close_date" DATE,
  "next_follow_up_date" TIMESTAMPTZ(3),
  "description" VARCHAR(4000) NOT NULL DEFAULT '',
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "created_by_admin_id" UUID NOT NULL,
  "converted_client_id" UUID,
  "converted_at" TIMESTAMPTZ(3),
  "converted_by_admin_id" UUID,
  "archived_at" TIMESTAMPTZ(3),
  "last_activity_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "leads_organization_id_reference_number_key" ON "leads"("organization_id", "reference_number");
CREATE UNIQUE INDEX "leads_converted_client_id_key" ON "leads"("converted_client_id");
CREATE INDEX "leads_organization_id_archived_at_created_at_idx" ON "leads"("organization_id", "archived_at", "created_at");
CREATE INDEX "leads_organization_id_pipeline_id_stage_id_idx" ON "leads"("organization_id", "pipeline_id", "stage_id");
CREATE INDEX "leads_organization_id_next_follow_up_date_idx" ON "leads"("organization_id", "next_follow_up_date");
CREATE INDEX "leads_organization_id_assigned_admin_id_idx" ON "leads"("organization_id", "assigned_admin_id");

CREATE TABLE "lead_activities" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "lead_id" UUID NOT NULL,
  "type" "LeadActivityType" NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "description" VARCHAR(4000) NOT NULL DEFAULT '',
  "occurred_at" TIMESTAMPTZ(3) NOT NULL,
  "due_at" TIMESTAMPTZ(3),
  "completed_at" TIMESTAMPTZ(3),
  "metadata" JSONB,
  "created_by_admin_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "lead_activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lead_activities_organization_id_lead_id_occurred_at_idx" ON "lead_activities"("organization_id", "lead_id", "occurred_at");

CREATE TABLE "clients" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "reference_number" VARCHAR(32) NOT NULL,
  "type" "ClientType" NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "primary_contact" VARCHAR(160) NOT NULL DEFAULT '',
  "email" VARCHAR(254),
  "phone" VARCHAR(32),
  "website" VARCHAR(512),
  "billing_address" VARCHAR(1000) NOT NULL DEFAULT '',
  "tax_registration" VARCHAR(120) NOT NULL DEFAULT '',
  "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
  "notes" VARCHAR(4000) NOT NULL DEFAULT '',
  "source_lead_id" UUID,
  "created_by_admin_id" UUID NOT NULL,
  "archived_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "clients_organization_id_reference_number_key" ON "clients"("organization_id", "reference_number");
CREATE UNIQUE INDEX "clients_source_lead_id_key" ON "clients"("source_lead_id");
CREATE INDEX "clients_organization_id_status_created_at_idx" ON "clients"("organization_id", "status", "created_at");

CREATE TABLE "proposal_documents" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "document_number" VARCHAR(32) NOT NULL,
  "type" "ProposalDocumentType" NOT NULL,
  "status" "ProposalStatus" NOT NULL DEFAULT 'DRAFT',
  "title" VARCHAR(200) NOT NULL,
  "description" VARCHAR(4000) NOT NULL DEFAULT '',
  "lead_id" UUID,
  "client_id" UUID,
  "issue_date" DATE NOT NULL,
  "expiry_date" DATE,
  "currency" CHAR(3) NOT NULL DEFAULT 'USD',
  "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "discount_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "tax_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "grand_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "notes" VARCHAR(4000) NOT NULL DEFAULT '',
  "terms" VARCHAR(4000) NOT NULL DEFAULT '',
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_by_admin_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "proposal_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "proposal_documents_organization_id_document_number_key" ON "proposal_documents"("organization_id", "document_number");
CREATE INDEX "proposal_documents_organization_id_status_created_at_idx" ON "proposal_documents"("organization_id", "status", "created_at");

CREATE TABLE "proposal_line_items" (
  "id" UUID NOT NULL,
  "proposal_id" UUID NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "description" VARCHAR(2000) NOT NULL DEFAULT '',
  "quantity" DECIMAL(18,4) NOT NULL DEFAULT 1,
  "unit" VARCHAR(32) NOT NULL DEFAULT 'item',
  "unit_price" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "discount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "tax_rate" DECIMAL(8,4) NOT NULL DEFAULT 0,
  "line_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "proposal_line_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "proposal_line_items_proposal_id_sort_order_idx" ON "proposal_line_items"("proposal_id", "sort_order");

CREATE TABLE "proposal_status_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "proposal_id" UUID NOT NULL,
  "from_status" "ProposalStatus",
  "to_status" "ProposalStatus" NOT NULL,
  "note" VARCHAR(1000) NOT NULL DEFAULT '',
  "changed_by_admin_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "proposal_status_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "proposal_status_history_proposal_id_created_at_idx" ON "proposal_status_history"("proposal_id", "created_at");

CREATE TABLE "crm_audit_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "admin_id" UUID,
  "type" "CrmAuditEventType" NOT NULL,
  "entity_type" VARCHAR(32) NOT NULL,
  "entity_id" UUID NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "crm_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "crm_audit_events_organization_id_created_at_idx" ON "crm_audit_events"("organization_id", "created_at");
CREATE INDEX "platform_admins_organization_id_idx" ON "platform_admins"("organization_id");

ALTER TABLE "platform_admins" ADD CONSTRAINT "platform_admins_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "organization_sequences" ADD CONSTRAINT "organization_sequences_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "pipelines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "pipeline_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_admin_id_fkey" FOREIGN KEY ("assigned_admin_id") REFERENCES "platform_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "platform_admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_converted_by_admin_id_fkey" FOREIGN KEY ("converted_by_admin_id") REFERENCES "platform_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "platform_admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clients" ADD CONSTRAINT "clients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clients" ADD CONSTRAINT "clients_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "platform_admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clients" ADD CONSTRAINT "clients_source_lead_id_fkey" FOREIGN KEY ("source_lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_converted_client_id_fkey" FOREIGN KEY ("converted_client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "proposal_documents" ADD CONSTRAINT "proposal_documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "proposal_documents" ADD CONSTRAINT "proposal_documents_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "proposal_documents" ADD CONSTRAINT "proposal_documents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "proposal_documents" ADD CONSTRAINT "proposal_documents_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "platform_admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "proposal_line_items" ADD CONSTRAINT "proposal_line_items_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "proposal_status_history" ADD CONSTRAINT "proposal_status_history_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_audit_events" ADD CONSTRAINT "crm_audit_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_audit_events" ADD CONSTRAINT "crm_audit_events_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "platform_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
