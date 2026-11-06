-- Canonical phone key for duplicate detection (same rules as TS normalizeIndianMobileInput).
ALTER TABLE "clients" ADD COLUMN "phone_normalized" VARCHAR(16);

CREATE INDEX "clients_organization_id_phone_normalized_idx" ON "clients"("organization_id", "phone_normalized");

UPDATE "clients" c
SET "phone_normalized" = sub.n
FROM (
  SELECT
    id,
    CASE
      WHEN length(d) = 12 AND left(d, 2) = '91' THEN substring(d FROM 3 FOR 10)
      WHEN length(d) = 11 AND left(d, 1) = '0' THEN substring(d FROM 2 FOR 10)
      WHEN length(d) = 10 THEN d
      ELSE NULL
    END AS n
  FROM (
    SELECT
      id,
      regexp_replace(trim(phone), '[^0-9]', '', 'g') AS d
    FROM "clients"
    WHERE phone IS NOT NULL AND trim(phone) <> ''
  ) x
) sub
WHERE c.id = sub.id;

CREATE UNIQUE INDEX "clients_organization_id_phone_normalized_key" ON "clients"("organization_id", "phone_normalized");

ALTER TYPE "LeadActivityType" ADD VALUE IF NOT EXISTS 'LEAD_LINKED_TO_CLIENT';

ALTER TYPE "CrmAuditEventType" ADD VALUE IF NOT EXISTS 'LEAD_LINKED_TO_CLIENT';
