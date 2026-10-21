-- Default currency for new leads (does not change existing rows)
ALTER TABLE "leads" ALTER COLUMN "currency" SET DEFAULT 'INR';
