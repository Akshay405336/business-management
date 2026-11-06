-- Drop Lead subject column (intentional product change; data in subject is discarded).
ALTER TABLE "leads" DROP COLUMN IF EXISTS "subject";
