-- Normalize lead contact fields for consistent duplicate detection (application-enforced).
-- Partial unique indexes are applied in a follow-up migration once duplicate rows are resolved.

UPDATE "leads"
SET "email" = lower(trim("email"))
WHERE "email" IS NOT NULL
  AND trim("email") <> ''
  AND "email" <> lower(trim("email"));

UPDATE "leads"
SET "phone" = CASE
  WHEN length(regexp_replace("phone", '[^0-9]', '', 'g')) = 12
    AND regexp_replace("phone", '[^0-9]', '', 'g') LIKE '91%'
    THEN substring(regexp_replace("phone", '[^0-9]', '', 'g') FROM 3 FOR 10)
  WHEN length(regexp_replace("phone", '[^0-9]', '', 'g')) = 11
    AND regexp_replace("phone", '[^0-9]', '', 'g') LIKE '0%'
    THEN substring(regexp_replace("phone", '[^0-9]', '', 'g') FROM 2 FOR 10)
  ELSE regexp_replace("phone", '[^0-9]', '', 'g')
END
WHERE "phone" IS NOT NULL
  AND trim("phone") <> '';
