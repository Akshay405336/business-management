INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT r."id", 'calendar.view'
FROM "organization_roles" r
WHERE r."key" = 'employee' AND r."is_system" = true
ON CONFLICT DO NOTHING;
