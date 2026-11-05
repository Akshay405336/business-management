/*
  Warnings:

  - You are about to alter the column `name` on the `leave_year_configurations` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(120)`.

*/
-- AlterTable
ALTER TABLE "leave_year_configurations" ALTER COLUMN "name" SET DATA TYPE VARCHAR(120);

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_leave_year_configuration_id_fkey" FOREIGN KEY ("leave_year_configuration_id") REFERENCES "leave_year_configurations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
