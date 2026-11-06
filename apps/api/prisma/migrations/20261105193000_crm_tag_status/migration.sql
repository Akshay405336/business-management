CREATE TYPE "LeadTagStatus" AS ENUM ('ACTIVE', 'INACTIVE');

ALTER TABLE "lead_tags" ADD COLUMN "description" VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE "lead_tags" ADD COLUMN "status" "LeadTagStatus" NOT NULL DEFAULT 'ACTIVE';

CREATE INDEX "lead_tags_organization_id_status_idx" ON "lead_tags"("organization_id", "status");

ALTER TABLE "lead_tag_assignments" ADD COLUMN "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
