-- Re-link Employee system role for sign-in accounts tied to an employee profile (portal access).
INSERT INTO "organization_membership_roles" ("membership_id", "role_id")
SELECT m."id", r."id"
FROM "organization_memberships" m
INNER JOIN "employees" e
  ON e."organization_id" = m."organization_id"
  AND e."platform_admin_id" = m."admin_id"
INNER JOIN "organization_roles" r
  ON r."organization_id" = m."organization_id"
  AND r."key" = 'employee'
  AND r."is_system" = true
LEFT JOIN "organization_membership_roles" existing
  ON existing."membership_id" = m."id"
  AND existing."role_id" = r."id"
WHERE existing."membership_id" IS NULL
ON CONFLICT DO NOTHING;
