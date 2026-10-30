CREATE TYPE "EmployeeSalaryFrequency" AS ENUM ('MONTHLY', 'ANNUAL');

CREATE TABLE "employee_salary_structures" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "frequency" "EmployeeSalaryFrequency" NOT NULL DEFAULT 'MONTHLY',
    "basic_salary" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "house_rent_allowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "other_allowances" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "bonus" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "other_earnings" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "provident_fund" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "professional_tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "other_deductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "employee_salary_structures_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "employee_salary_structures_employee_id_key" ON "employee_salary_structures"("employee_id");

CREATE INDEX "employee_salary_structures_organization_id_employee_id_idx" ON "employee_salary_structures"("organization_id", "employee_id");

ALTER TABLE "employee_salary_structures" ADD CONSTRAINT "employee_salary_structures_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "employee_salary_structures" ADD CONSTRAINT "employee_salary_structures_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
