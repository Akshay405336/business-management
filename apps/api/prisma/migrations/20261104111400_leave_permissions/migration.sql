INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT r."id", p.key
FROM "organization_roles" r
CROSS JOIN (
  VALUES
    ('leave.requests.create'),
    ('leave.requests.read_own'),
    ('leave.requests.cancel'),
    ('leave.balances.read_own')
) AS p(key)
WHERE r."key" = 'employee' AND r."is_system" = true
ON CONFLICT DO NOTHING;
