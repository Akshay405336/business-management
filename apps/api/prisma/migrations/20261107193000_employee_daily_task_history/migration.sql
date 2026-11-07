-- Keep completed daily-task assignments and notes after an employee is deleted.
-- Unfinished assignments still block deletion in application code.

ALTER TABLE "daily_task_assignees"
  ADD COLUMN "historical_display_name" VARCHAR(160) NOT NULL DEFAULT '',
  ADD COLUMN "historical_employee_code" VARCHAR(32) NOT NULL DEFAULT '';

UPDATE "daily_task_assignees" AS assignee
SET
  "historical_display_name" = employee."display_name",
  "historical_employee_code" = employee."employee_code"
FROM "employees" AS employee
WHERE assignee."employee_id" = employee."id";

ALTER TABLE "daily_task_assignees" DROP CONSTRAINT "daily_task_assignees_employee_id_fkey";
ALTER TABLE "daily_task_assignees" ALTER COLUMN "employee_id" DROP NOT NULL;
ALTER TABLE "daily_task_assignees"
  ADD CONSTRAINT "daily_task_assignees_employee_id_fkey"
  FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "daily_task_notes"
  ADD COLUMN "historical_display_name" VARCHAR(160) NOT NULL DEFAULT '';

UPDATE "daily_task_notes" AS note
SET "historical_display_name" = employee."display_name"
FROM "employees" AS employee
WHERE note."employee_id" = employee."id";

ALTER TABLE "daily_task_notes" DROP CONSTRAINT "daily_task_notes_employee_id_fkey";
ALTER TABLE "daily_task_notes" ALTER COLUMN "employee_id" DROP NOT NULL;
ALTER TABLE "daily_task_notes"
  ADD CONSTRAINT "daily_task_notes_employee_id_fkey"
  FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
