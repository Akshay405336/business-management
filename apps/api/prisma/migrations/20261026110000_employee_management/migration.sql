-- CreateEnum
CREATE TYPE "EmployeeEmploymentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "EmployeeEmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN');

-- CreateTable
CREATE TABLE "employees" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "employee_code" VARCHAR(32) NOT NULL,
    "first_name" VARCHAR(80) NOT NULL,
    "last_name" VARCHAR(80) NOT NULL,
    "display_name" VARCHAR(160) NOT NULL,
    "work_email" VARCHAR(254) NOT NULL,
    "phone" VARCHAR(32) NOT NULL,
    "alternate_phone" VARCHAR(32),
    "profile_image_url" VARCHAR(512),
    "job_title" VARCHAR(120) NOT NULL,
    "department" VARCHAR(120) NOT NULL,
    "employment_type" "EmployeeEmploymentType" NOT NULL,
    "employment_status" "EmployeeEmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "date_of_joining" DATE NOT NULL,
    "probation_end_date" DATE,
    "employment_end_date" DATE,
    "work_location" VARCHAR(160),
    "reporting_manager_id" UUID,
    "notes" VARCHAR(4000) NOT NULL DEFAULT '',
    "platform_admin_id" UUID,
    "deactivated_at" TIMESTAMPTZ(3),
    "created_by_admin_id" UUID NOT NULL,
    "updated_by_admin_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employees_platform_admin_id_key" ON "employees"("platform_admin_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_organization_id_employee_code_key" ON "employees"("organization_id", "employee_code");

-- CreateIndex
CREATE UNIQUE INDEX "employees_organization_id_work_email_key" ON "employees"("organization_id", "work_email");

-- CreateIndex
CREATE UNIQUE INDEX "employees_organization_id_phone_key" ON "employees"("organization_id", "phone");

-- CreateIndex
CREATE INDEX "employees_organization_id_employment_status_idx" ON "employees"("organization_id", "employment_status");

-- CreateIndex
CREATE INDEX "employees_organization_id_department_idx" ON "employees"("organization_id", "department");

-- CreateIndex
CREATE INDEX "employees_organization_id_date_of_joining_idx" ON "employees"("organization_id", "date_of_joining");

-- CreateIndex
CREATE INDEX "employees_organization_id_updated_at_idx" ON "employees"("organization_id", "updated_at");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_reporting_manager_id_fkey" FOREIGN KEY ("reporting_manager_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_platform_admin_id_fkey" FOREIGN KEY ("platform_admin_id") REFERENCES "platform_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "platform_admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_updated_by_admin_id_fkey" FOREIGN KEY ("updated_by_admin_id") REFERENCES "platform_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
