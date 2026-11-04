-- CreateEnum
CREATE TYPE "OrganizationCalendarEventType" AS ENUM (
  'PUBLIC_HOLIDAY',
  'COMPANY_HOLIDAY',
  'FESTIVAL_REGIONAL',
  'WEEKLY_OFF',
  'SPECIAL_WORKING_DAY',
  'HALF_WORKING_DAY',
  'OFFICE_CLOSURE',
  'COMPANY_EVENT',
  'OPTIONAL_HOLIDAY',
  'CUSTOM'
);

CREATE TYPE "OrganizationCalendarRecurrence" AS ENUM ('NONE', 'ANNUAL');

-- CreateTable
CREATE TABLE "organization_calendar_events" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "description" VARCHAR(2000) NOT NULL DEFAULT '',
  "event_type" "OrganizationCalendarEventType" NOT NULL,
  "start_date" DATE NOT NULL,
  "end_date" DATE NOT NULL,
  "is_full_day" BOOLEAN NOT NULL DEFAULT true,
  "start_time_minutes" INTEGER,
  "end_time_minutes" INTEGER,
  "color" VARCHAR(7) NOT NULL DEFAULT '#64748b',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "applies_to_all_employees" BOOLEAN NOT NULL DEFAULT true,
  "employee_ids" JSONB NOT NULL DEFAULT '[]',
  "recurrence" "OrganizationCalendarRecurrence" NOT NULL DEFAULT 'NONE',
  "created_by_admin_id" UUID NOT NULL,
  "updated_by_admin_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "organization_calendar_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "org_cal_evt_org_range_idx" ON "organization_calendar_events"("organization_id", "start_date", "end_date");
CREATE INDEX "org_cal_evt_org_type_date_idx" ON "organization_calendar_events"("organization_id", "event_type", "start_date");

ALTER TABLE "organization_calendar_events"
  ADD CONSTRAINT "organization_calendar_events_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
