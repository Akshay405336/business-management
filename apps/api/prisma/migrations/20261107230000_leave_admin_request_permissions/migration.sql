-- Grant organization leave review permissions to system Admin and Owner roles that predate catalog keys.
INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT r."id", p.key
FROM "organization_roles" r
CROSS JOIN (
  VALUES
    ('leave.requests.read_all'),
    ('leave.requests.approve'),
    ('leave.requests.reject'),
    ('leave.balances.read'),
    ('leave.config.read'),
    ('leave.types.read')
) AS p(key)
WHERE r."is_system" = true AND r."key" IN ('admin', 'owner')
ON CONFLICT DO NOTHING;
