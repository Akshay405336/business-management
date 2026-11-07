-- CreateEnum
CREATE TYPE "LeaveTypeKind" AS ENUM ('PAID', 'UNPAID');

-- AlterTable
ALTER TABLE "leave_types" ADD COLUMN "kind" "LeaveTypeKind";

UPDATE "leave_types"
SET "kind" = CASE WHEN "is_paid" THEN 'PAID'::"LeaveTypeKind" ELSE 'UNPAID'::"LeaveTypeKind" END;

ALTER TABLE "leave_types" ALTER COLUMN "kind" SET NOT NULL;

ALTER TABLE "leave_types" ALTER COLUMN "code" SET DATA TYPE VARCHAR(64);

UPDATE "leave_types" SET "name" = btrim("name");

UPDATE "leave_types" AS t
SET "name" = t.name || ' (' || left(replace(t.id::text, '-', ''), 8) || ')'
WHERE EXISTS (
  SELECT 1
  FROM "leave_types" AS o
  WHERE o.organization_id = t.organization_id
    AND lower(o.name) = lower(t.name)
    AND o.created_at < t.created_at
);

ALTER TABLE "leave_types" ALTER COLUMN "description" DROP DEFAULT;
ALTER TABLE "leave_types" ALTER COLUMN "description" DROP NOT NULL;

UPDATE "leave_types" SET "description" = NULLIF(btrim("description"), '');

ALTER TABLE "leave_types"
  DROP COLUMN "is_paid",
  DROP COLUMN "annual_allocation_eligible",
  DROP COLUMN "carry_forward_enabled",
  DROP COLUMN "max_carry_forward_days",
  DROP COLUMN "max_consecutive_days",
  DROP COLUMN "min_application_days",
  DROP COLUMN "half_day_allowed",
  DROP COLUMN "attachment_required",
  DROP COLUMN "attachment_required_after_days",
  DROP COLUMN "applies_to_all_employees",
  DROP COLUMN "applicable_employee_ids",
  DROP COLUMN "applicable_departments";

CREATE UNIQUE INDEX "leave_type_org_name_key" ON "leave_types"("organization_id", "name");
CREATE INDEX "leave_type_org_kind_idx" ON "leave_types"("organization_id", "kind");
