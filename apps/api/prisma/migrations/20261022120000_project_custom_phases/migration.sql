-- Custom project phases: display name, description, drop unique lifecycle slot per project.

ALTER TABLE "project_phases" ADD COLUMN "name" VARCHAR(200);
ALTER TABLE "project_phases" ADD COLUMN "description" VARCHAR(4000) NOT NULL DEFAULT '';

UPDATE "project_phases"
SET "name" = CASE "phase"::text
  WHEN 'PLANNING' THEN 'Planning'
  WHEN 'PRODUCTION' THEN 'Production'
  WHEN 'QA' THEN 'QA'
  WHEN 'DEPLOYMENT' THEN 'Deployment'
  WHEN 'HANDOVER' THEN 'Handover'
  WHEN 'COMPLETED' THEN 'Completed'
  ELSE "phase"::text
END
WHERE "name" IS NULL;

ALTER TABLE "project_phases" ALTER COLUMN "name" SET NOT NULL;

UPDATE "project_phases" AS pp
SET "start_date" = p."start_date"
FROM "projects" AS p
WHERE pp."project_id" = p."id" AND pp."start_date" IS NULL;

UPDATE "project_phases" AS pp
SET "expected_end_date" = p."expected_end_date"
FROM "projects" AS p
WHERE pp."project_id" = p."id" AND pp."expected_end_date" IS NULL;

ALTER TABLE "project_phases" ALTER COLUMN "start_date" SET NOT NULL;
ALTER TABLE "project_phases" ALTER COLUMN "expected_end_date" SET NOT NULL;

ALTER TABLE "project_phases" DROP CONSTRAINT IF EXISTS "project_phases_project_id_phase_key";

ALTER TABLE "project_phases" ALTER COLUMN "status" SET DEFAULT 'NOT_STARTED';
