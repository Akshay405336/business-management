-- Attendance cutoff is removed. Office end is the absence and punch-in boundary.
ALTER TABLE "attendance_schedules" DROP COLUMN "attendance_cutoff_minutes";
