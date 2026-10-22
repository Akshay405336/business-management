-- DropIndex
DROP INDEX "project_phases_project_id_phase_key";

-- AlterTable
ALTER TABLE "project_phases" ALTER COLUMN "phase" SET DEFAULT 'PLANNING';
