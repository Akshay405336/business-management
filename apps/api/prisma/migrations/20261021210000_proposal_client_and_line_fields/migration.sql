-- Proposal client snapshot, terms fields, and line-item catalog metadata
ALTER TABLE "proposal_documents"
  ADD COLUMN "scope_of_work" VARCHAR(8000) NOT NULL DEFAULT '',
  ADD COLUMN "payment_terms" VARCHAR(4000) NOT NULL DEFAULT '',
  ADD COLUMN "delivery_timeline" VARCHAR(500) NOT NULL DEFAULT '',
  ADD COLUMN "client_name" VARCHAR(160) NOT NULL DEFAULT '',
  ADD COLUMN "company_name" VARCHAR(160) NOT NULL DEFAULT '',
  ADD COLUMN "client_phone" VARCHAR(32) NOT NULL DEFAULT '',
  ADD COLUMN "client_email" VARCHAR(254) NOT NULL DEFAULT '',
  ADD COLUMN "billing_address" VARCHAR(1000) NOT NULL DEFAULT '',
  ADD COLUMN "client_gstin" VARCHAR(15) NOT NULL DEFAULT '';

ALTER TABLE "proposal_line_items"
  ADD COLUMN "category" VARCHAR(120) NOT NULL DEFAULT '',
  ADD COLUMN "source_package_id" UUID;
