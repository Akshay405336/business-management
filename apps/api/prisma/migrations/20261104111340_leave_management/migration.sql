-- CreateEnum
CREATE TYPE "LeaveTypeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "LeaveAccrualMethod" AS ENUM ('ANNUAL_FULL', 'MONTHLY', 'PRORATED_JOIN', 'NONE');

-- CreateEnum
CREATE TYPE "LeaveYearConfigurationStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "LeaveAllocationEligibility" AS ENUM ('ALL_EMPLOYEES', 'SELECTED_EMPLOYEES', 'SELECTED_DEPARTMENTS', 'SELECTED_EMPLOYMENT_TYPES');

-- CreateEnum
CREATE TYPE "LeaveRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LeaveHalfDaySession" AS ENUM ('FIRST_HALF', 'SECOND_HALF');

-- CreateEnum
CREATE TYPE "LeaveBalanceTransactionType" AS ENUM ('INITIAL_ALLOCATION', 'MONTHLY_ACCRUAL', 'PRORATED_ALLOCATION', 'CARRY_FORWARD', 'MANUAL_CREDIT', 'MANUAL_DEBIT', 'LEAVE_RESERVED', 'LEAVE_APPROVED', 'LEAVE_REJECTED_RELEASE', 'LEAVE_CANCELLED_REVERSAL', 'POLICY_ADJUSTMENT');

-- CreateTable
CREATE TABLE "leave_types" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "code" VARCHAR(16) NOT NULL,
    "description" VARCHAR(2000) NOT NULL DEFAULT '',
    "is_paid" BOOLEAN NOT NULL DEFAULT true,
    "annual_allocation_eligible" BOOLEAN NOT NULL DEFAULT true,
    "carry_forward_enabled" BOOLEAN NOT NULL DEFAULT false,
    "max_carry_forward_days" DECIMAL(6,1) NOT NULL DEFAULT 0,
    "max_consecutive_days" INTEGER,
    "min_application_days" DECIMAL(6,1) NOT NULL DEFAULT 0.5,
    "half_day_allowed" BOOLEAN NOT NULL DEFAULT true,
    "attachment_required" BOOLEAN NOT NULL DEFAULT false,
    "attachment_required_after_days" DECIMAL(6,1),
    "applies_to_all_employees" BOOLEAN NOT NULL DEFAULT true,
    "applicable_employee_ids" JSONB NOT NULL DEFAULT '[]',
    "applicable_departments" JSONB NOT NULL DEFAULT '[]',
    "status" "LeaveTypeStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by_admin_id" UUID NOT NULL,
    "updated_by_admin_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "leave_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_year_configurations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "calendar_year" INTEGER NOT NULL,
    "year_start_date" DATE NOT NULL,
    "year_end_date" DATE NOT NULL,
    "status" "LeaveYearConfigurationStatus" NOT NULL DEFAULT 'DRAFT',
    "balances_generated_at" TIMESTAMPTZ(3),
    "activated_at" TIMESTAMPTZ(3),
    "created_by_admin_id" UUID NOT NULL,
    "updated_by_admin_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "leave_year_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_year_allocations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "leave_year_configuration_id" UUID NOT NULL,
    "leave_type_id" UUID NOT NULL,
    "annual_allocation_days" DECIMAL(6,1) NOT NULL,
    "accrual_method" "LeaveAccrualMethod" NOT NULL,
    "carry_forward_enabled" BOOLEAN NOT NULL DEFAULT false,
    "max_carry_forward_days" DECIMAL(6,1) NOT NULL DEFAULT 0,
    "eligibility" "LeaveAllocationEligibility" NOT NULL DEFAULT 'ALL_EMPLOYEES',
    "eligible_employee_ids" JSONB NOT NULL DEFAULT '[]',
    "eligible_departments" JSONB NOT NULL DEFAULT '[]',
    "eligible_employment_types" JSONB NOT NULL DEFAULT '[]',
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_admin_id" UUID NOT NULL,
    "updated_by_admin_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "leave_year_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_leave_balances" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "leave_type_id" UUID NOT NULL,
    "leave_year_configuration_id" UUID NOT NULL,
    "allocated_days" DECIMAL(7,1) NOT NULL DEFAULT 0,
    "carry_forward_days" DECIMAL(7,1) NOT NULL DEFAULT 0,
    "adjustment_credit_days" DECIMAL(7,1) NOT NULL DEFAULT 0,
    "adjustment_debit_days" DECIMAL(7,1) NOT NULL DEFAULT 0,
    "used_approved_days" DECIMAL(7,1) NOT NULL DEFAULT 0,
    "reserved_pending_days" DECIMAL(7,1) NOT NULL DEFAULT 0,
    "generated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "employee_leave_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_balance_transactions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "leave_type_id" UUID NOT NULL,
    "employee_leave_balance_id" UUID NOT NULL,
    "calendar_year" INTEGER NOT NULL,
    "transaction_type" "LeaveBalanceTransactionType" NOT NULL,
    "days" DECIMAL(7,1) NOT NULL,
    "balance_before_days" DECIMAL(7,1) NOT NULL,
    "balance_after_days" DECIMAL(7,1) NOT NULL,
    "leave_request_id" UUID,
    "reason" VARCHAR(2000) NOT NULL DEFAULT '',
    "performed_by_admin_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_balance_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "leave_type_id" UUID NOT NULL,
    "leave_year_configuration_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_half_day" BOOLEAN NOT NULL DEFAULT false,
    "half_day_session" "LeaveHalfDaySession",
    "total_days" DECIMAL(6,1) NOT NULL,
    "reason" VARCHAR(4000) NOT NULL,
    "notes" VARCHAR(2000) NOT NULL DEFAULT '',
    "attachment_stored_object_id" UUID,
    "status" "LeaveRequestStatus" NOT NULL DEFAULT 'PENDING',
    "applied_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMPTZ(3),
    "decided_by_admin_id" UUID,
    "rejection_reason" VARCHAR(2000) NOT NULL DEFAULT '',
    "cancelled_at" TIMESTAMPTZ(3),
    "idempotency_key" VARCHAR(64),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_request_status_events" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "leave_request_id" UUID NOT NULL,
    "from_status" "LeaveRequestStatus",
    "to_status" "LeaveRequestStatus" NOT NULL,
    "reason" VARCHAR(2000) NOT NULL DEFAULT '',
    "performed_by_admin_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_request_status_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leave_type_org_status_idx" ON "leave_types"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "leave_type_org_code_key" ON "leave_types"("organization_id", "code");

-- CreateIndex
CREATE INDEX "leave_year_cfg_org_status_idx" ON "leave_year_configurations"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "leave_year_cfg_org_year_key" ON "leave_year_configurations"("organization_id", "calendar_year");

-- CreateIndex
CREATE INDEX "leave_year_alloc_org_cfg_idx" ON "leave_year_allocations"("organization_id", "leave_year_configuration_id");

-- CreateIndex
CREATE UNIQUE INDEX "leave_year_alloc_cfg_type_key" ON "leave_year_allocations"("leave_year_configuration_id", "leave_type_id");

-- CreateIndex
CREATE INDEX "emp_leave_bal_org_emp_idx" ON "employee_leave_balances"("organization_id", "employee_id");

-- CreateIndex
CREATE INDEX "emp_leave_bal_org_year_idx" ON "employee_leave_balances"("organization_id", "leave_year_configuration_id");

-- CreateIndex
CREATE UNIQUE INDEX "emp_leave_bal_unique_key" ON "employee_leave_balances"("organization_id", "employee_id", "leave_type_id", "leave_year_configuration_id");

-- CreateIndex
CREATE INDEX "leave_bal_tx_org_emp_year_idx" ON "leave_balance_transactions"("organization_id", "employee_id", "calendar_year");

-- CreateIndex
CREATE INDEX "leave_bal_tx_balance_created_idx" ON "leave_balance_transactions"("employee_leave_balance_id", "created_at");

-- CreateIndex
CREATE INDEX "leave_request_org_status_applied_idx" ON "leave_requests"("organization_id", "status", "applied_at");

-- CreateIndex
CREATE INDEX "leave_request_org_emp_status_idx" ON "leave_requests"("organization_id", "employee_id", "status");

-- CreateIndex
CREATE INDEX "leave_request_org_range_idx" ON "leave_requests"("organization_id", "start_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "leave_request_org_idempotency_key" ON "leave_requests"("organization_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "leave_req_status_evt_req_created_idx" ON "leave_request_status_events"("leave_request_id", "created_at");

-- AddForeignKey
ALTER TABLE "leave_types" ADD CONSTRAINT "leave_types_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_year_configurations" ADD CONSTRAINT "leave_year_configurations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_year_allocations" ADD CONSTRAINT "leave_year_allocations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_year_allocations" ADD CONSTRAINT "leave_year_allocations_leave_year_configuration_id_fkey" FOREIGN KEY ("leave_year_configuration_id") REFERENCES "leave_year_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_year_allocations" ADD CONSTRAINT "leave_year_allocations_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_leave_balances" ADD CONSTRAINT "employee_leave_balances_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_leave_balances" ADD CONSTRAINT "employee_leave_balances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_leave_balances" ADD CONSTRAINT "employee_leave_balances_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_leave_balances" ADD CONSTRAINT "employee_leave_balances_leave_year_configuration_id_fkey" FOREIGN KEY ("leave_year_configuration_id") REFERENCES "leave_year_configurations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balance_transactions" ADD CONSTRAINT "leave_balance_transactions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balance_transactions" ADD CONSTRAINT "leave_balance_transactions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balance_transactions" ADD CONSTRAINT "leave_balance_transactions_employee_leave_balance_id_fkey" FOREIGN KEY ("employee_leave_balance_id") REFERENCES "employee_leave_balances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balance_transactions" ADD CONSTRAINT "leave_balance_transactions_leave_request_id_fkey" FOREIGN KEY ("leave_request_id") REFERENCES "leave_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_request_status_events" ADD CONSTRAINT "leave_request_status_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_request_status_events" ADD CONSTRAINT "leave_request_status_events_leave_request_id_fkey" FOREIGN KEY ("leave_request_id") REFERENCES "leave_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
