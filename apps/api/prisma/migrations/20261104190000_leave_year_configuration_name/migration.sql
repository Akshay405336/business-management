-- Display name for leave balance / year configurations
ALTER TABLE "leave_year_configurations" ADD COLUMN "name" TEXT NOT NULL DEFAULT '';

UPDATE "leave_year_configurations"
SET "name" = 'Leave policy ' || "calendar_year"::text
WHERE "name" = '';
