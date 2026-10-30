-- DropForeignKey
ALTER TABLE "employees" DROP CONSTRAINT IF EXISTS "employees_reporting_manager_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "employees_organization_id_department_idx";

-- AlterTable
ALTER TABLE "employees" DROP COLUMN IF EXISTS "reporting_manager_id";
ALTER TABLE "employees" DROP COLUMN IF EXISTS "department";
