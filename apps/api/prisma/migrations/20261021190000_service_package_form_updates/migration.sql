-- CreateEnum
CREATE TYPE "ServicePackageDeliveryUnit" AS ENUM ('DAYS', 'WEEKS', 'MONTHS');

-- AlterTable
ALTER TABLE "service_packages" ADD COLUMN "categories" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "service_packages" ADD COLUMN "delivery_duration_value" INTEGER;
ALTER TABLE "service_packages" ADD COLUMN "delivery_duration_unit" "ServicePackageDeliveryUnit";

-- Backfill categories from legacy single category enum
UPDATE "service_packages" SET "categories" = CASE "category"
  WHEN 'WEBSITE' THEN '[{"id":"pkg.cat.package-categories.website-development","label":"Website Development","category":"Package categories"}]'::jsonb
  WHEN 'ECOMMERCE' THEN '[{"id":"pkg.cat.package-categories.e-commerce","label":"E-commerce","category":"Package categories"}]'::jsonb
  WHEN 'MOBILE_APP' THEN '[{"id":"pkg.cat.package-categories.mobile-application","label":"Mobile Application","category":"Package categories"}]'::jsonb
  WHEN 'CUSTOM_SOFTWARE' THEN '[{"id":"pkg.cat.package-categories.custom-software","label":"Custom Software","category":"Package categories"}]'::jsonb
  ELSE '[]'::jsonb
END;

-- Store GST as percentage (18 = 18%), not decimal fraction (0.18)
UPDATE "service_packages" SET "gst_rate" = "gst_rate" * 100
WHERE "gst_rate" > 0 AND "gst_rate" <= 1;

ALTER TABLE "service_packages" ALTER COLUMN "gst_rate" SET DEFAULT 18;

DROP INDEX IF EXISTS "service_packages_organization_id_status_category_idx";

ALTER TABLE "service_packages" DROP COLUMN "category";

DROP TYPE "ServicePackageCategory";

CREATE INDEX "service_packages_organization_id_status_idx" ON "service_packages"("organization_id", "status");
