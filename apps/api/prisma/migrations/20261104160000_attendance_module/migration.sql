-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'HOLIDAY', 'WEEKLY_OFF', 'PENDING');

-- CreateEnum
CREATE TYPE "AttendanceDeviceStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "AttendanceSecurityEventType" AS ENUM ('PUNCH_REJECTED_DEVICE', 'PUNCH_REJECTED_MOBILE', 'PUNCH_REJECTED_UNREGISTERED', 'PUNCH_REJECTED_IP', 'PUNCH_REJECTED_DUPLICATE', 'PUNCH_REJECTED_POLICY');

-- CreateTable
CREATE TABLE "attendance_schedules" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "effective_from" DATE NOT NULL,
    "time_zone" VARCHAR(64) NOT NULL,
    "office_start_minutes" INTEGER NOT NULL,
    "office_end_minutes" INTEGER NOT NULL,
    "late_grace_minutes" INTEGER NOT NULL DEFAULT 0,
    "attendance_cutoff_minutes" INTEGER NOT NULL,
    "min_full_day_minutes" INTEGER NOT NULL,
    "min_half_day_minutes" INTEGER NOT NULL,
    "weekly_off_days" JSONB NOT NULL DEFAULT '[]',
    "working_days" JSONB NOT NULL DEFAULT '[1,2,3,4,5]',
    "early_punch_in_allowance_minutes" INTEGER NOT NULL DEFAULT 0,
    "require_registered_device" BOOLEAN NOT NULL DEFAULT false,
    "ip_allowlist" JSONB,
    "allow_punch_out_after_office_end" BOOLEAN NOT NULL DEFAULT true,
    "created_by_admin_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "attendance_date" DATE NOT NULL,
    "schedule_id" UUID NOT NULL,
    "schedule_snapshot" JSONB NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PENDING',
    "punch_in_at" TIMESTAMPTZ(3),
    "punch_out_at" TIMESTAMPTZ(3),
    "late_minutes" INTEGER NOT NULL DEFAULT 0,
    "working_minutes" INTEGER,
    "finalized_at" TIMESTAMPTZ(3),
    "finalization_note" VARCHAR(500),
    "punch_in_device_id" UUID,
    "punch_out_device_id" UUID,
    "punch_in_user_agent" VARCHAR(512),
    "punch_in_ip" VARCHAR(64),
    "punch_out_user_agent" VARCHAR(512),
    "punch_out_ip" VARCHAR(64),
    "punch_in_idempotency_key" VARCHAR(64),
    "punch_out_idempotency_key" VARCHAR(64),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_devices" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "platform_admin_id" UUID NOT NULL,
    "device_key_hash" VARCHAR(128) NOT NULL,
    "label" VARCHAR(120) NOT NULL DEFAULT '',
    "user_agent_hint" VARCHAR(512) NOT NULL DEFAULT '',
    "status" "AttendanceDeviceStatus" NOT NULL DEFAULT 'ACTIVE',
    "registered_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(3),
    "last_used_at" TIMESTAMPTZ(3),

    CONSTRAINT "attendance_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_corrections" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "attendance_record_id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "reason" VARCHAR(2000) NOT NULL,
    "previous_values" JSONB NOT NULL,
    "new_values" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_corrections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_security_events" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "employee_id" UUID,
    "admin_id" UUID,
    "event_type" "AttendanceSecurityEventType" NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "user_agent" VARCHAR(512),
    "ip_address" VARCHAR(64),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_security_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "att_sched_org_eff_from_idx" ON "attendance_schedules"("organization_id", "effective_from" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "att_rec_org_emp_date_key" ON "attendance_records"("organization_id", "employee_id", "attendance_date");

-- CreateIndex
CREATE INDEX "att_rec_org_punch_in_idem_idx" ON "attendance_records"("organization_id", "punch_in_idempotency_key");

-- CreateIndex
CREATE INDEX "att_rec_org_date_idx" ON "attendance_records"("organization_id", "attendance_date");

-- CreateIndex
CREATE INDEX "att_rec_org_status_date_idx" ON "attendance_records"("organization_id", "status", "attendance_date");

-- CreateIndex
CREATE UNIQUE INDEX "att_dev_org_emp_hash_key" ON "attendance_devices"("organization_id", "employee_id", "device_key_hash");

-- CreateIndex
CREATE INDEX "att_dev_org_emp_status_idx" ON "attendance_devices"("organization_id", "employee_id", "status");

-- CreateIndex
CREATE INDEX "att_corr_org_record_idx" ON "attendance_corrections"("organization_id", "attendance_record_id");

-- CreateIndex
CREATE INDEX "att_sec_org_created_idx" ON "attendance_security_events"("organization_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "attendance_schedules" ADD CONSTRAINT "attendance_schedules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "attendance_schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_punch_in_device_id_fkey" FOREIGN KEY ("punch_in_device_id") REFERENCES "attendance_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_punch_out_device_id_fkey" FOREIGN KEY ("punch_out_device_id") REFERENCES "attendance_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_devices" ADD CONSTRAINT "attendance_devices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_devices" ADD CONSTRAINT "attendance_devices_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_attendance_record_id_fkey" FOREIGN KEY ("attendance_record_id") REFERENCES "attendance_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_security_events" ADD CONSTRAINT "attendance_security_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
