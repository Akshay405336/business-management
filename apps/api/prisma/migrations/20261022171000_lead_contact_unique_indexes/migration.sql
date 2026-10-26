-- Requires no duplicate phone/email values per organization (see remediation before deploy).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "leads"
    WHERE "phone" IS NOT NULL AND trim("phone") <> ''
    GROUP BY "organization_id", "phone"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'lead_contact_duplicate_phone';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "leads"
    WHERE "email" IS NOT NULL AND trim("email") <> ''
    GROUP BY "organization_id", "email"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'lead_contact_duplicate_email';
  END IF;
END $$;

CREATE UNIQUE INDEX "leads_organization_id_phone_key"
  ON "leads" ("organization_id", "phone")
  WHERE "phone" IS NOT NULL;

CREATE UNIQUE INDEX "leads_organization_id_email_key"
  ON "leads" ("organization_id", "email")
  WHERE "email" IS NOT NULL;
