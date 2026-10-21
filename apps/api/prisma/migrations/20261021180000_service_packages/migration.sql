-- CreateEnum
CREATE TYPE "ServicePackageCategory" AS ENUM ('WEBSITE', 'ECOMMERCE', 'MOBILE_APP', 'CUSTOM_SOFTWARE');

-- CreateEnum
CREATE TYPE "ServicePackageStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PackageDiscountType" AS ENUM ('FIXED', 'PERCENT');

-- AlterEnum
ALTER TYPE "CrmAuditEventType" ADD VALUE 'SERVICE_PACKAGE_CREATED';
ALTER TYPE "CrmAuditEventType" ADD VALUE 'SERVICE_PACKAGE_UPDATED';

-- CreateTable
CREATE TABLE "service_packages" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "category" "ServicePackageCategory" NOT NULL,
    "short_description" VARCHAR(500) NOT NULL DEFAULT '',
    "detailed_description" VARCHAR(8000) NOT NULL DEFAULT '',
    "status" "ServicePackageStatus" NOT NULL DEFAULT 'ACTIVE',
    "technology_stack" JSONB NOT NULL DEFAULT '[]',
    "included_pages" JSONB NOT NULL DEFAULT '[]',
    "integrations" JSONB NOT NULL DEFAULT '[]',
    "admin_panel_features" JSONB NOT NULL DEFAULT '[]',
    "hosting_deployment" JSONB NOT NULL DEFAULT '[]',
    "delivery_services" JSONB NOT NULL DEFAULT '[]',
    "integration_notes" VARCHAR(4000) NOT NULL DEFAULT '',
    "page_count" INTEGER,
    "base_price" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "add_ons" JSONB NOT NULL DEFAULT '[]',
    "discount_type" "PackageDiscountType",
    "discount_value" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "gst_rate" DECIMAL(8,4) NOT NULL DEFAULT 0.18,
    "taxable_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "gst_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "final_price" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "estimated_delivery_duration" VARCHAR(120) NOT NULL DEFAULT '',
    "support_period" VARCHAR(120) NOT NULL DEFAULT '',
    "revision_allowance" VARCHAR(120) NOT NULL DEFAULT '',
    "terms_exclusions" VARCHAR(4000) NOT NULL DEFAULT '',
    "created_by_admin_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "service_packages_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "proposal_documents" ADD COLUMN "source_package_id" UUID,
ADD COLUMN "package_snapshot" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "service_packages_organization_id_code_key" ON "service_packages"("organization_id", "code");

-- CreateIndex
CREATE INDEX "service_packages_organization_id_status_category_idx" ON "service_packages"("organization_id", "status", "category");

-- AddForeignKey
ALTER TABLE "service_packages" ADD CONSTRAINT "service_packages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_packages" ADD CONSTRAINT "service_packages_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "platform_admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_documents" ADD CONSTRAINT "proposal_documents_source_package_id_fkey" FOREIGN KEY ("source_package_id") REFERENCES "service_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
