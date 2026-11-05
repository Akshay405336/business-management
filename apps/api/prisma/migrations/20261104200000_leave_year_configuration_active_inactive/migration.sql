-- Replace DRAFT / ACTIVE / CLOSED with ACTIVE / INACTIVE for leave year configurations
ALTER TYPE "LeaveYearConfigurationStatus" RENAME TO "LeaveYearConfigurationStatus_old";

CREATE TYPE "LeaveYearConfigurationStatus" AS ENUM ('ACTIVE', 'INACTIVE');

ALTER TABLE "leave_year_configurations" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "leave_year_configurations"
  ALTER COLUMN "status" TYPE "LeaveYearConfigurationStatus"
  USING (
    CASE "status"::text
      WHEN 'CLOSED' THEN 'INACTIVE'::"LeaveYearConfigurationStatus"
      WHEN 'DRAFT' THEN 'ACTIVE'::"LeaveYearConfigurationStatus"
      ELSE 'ACTIVE'::"LeaveYearConfigurationStatus"
    END
  );

ALTER TABLE "leave_year_configurations"
  ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

DROP TYPE "LeaveYearConfigurationStatus_old";
