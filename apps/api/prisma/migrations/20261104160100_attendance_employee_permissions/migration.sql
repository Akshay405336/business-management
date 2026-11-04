INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT r."id", 'attendance.view_own'
FROM "organization_roles" r
WHERE r."key" = 'employee' AND r."is_system" = true
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT r."id", 'attendance.punch_in'
FROM "organization_roles" r
WHERE r."key" = 'employee' AND r."is_system" = true
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT r."id", 'attendance.punch_out'
FROM "organization_roles" r
WHERE r."key" = 'employee' AND r."is_system" = true
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT r."id", 'attendance.view_summary'
FROM "organization_roles" r
WHERE r."key" = 'employee' AND r."is_system" = true
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT r."id", 'attendance.manage_devices'
FROM "organization_roles" r
WHERE r."key" = 'employee' AND r."is_system" = true
ON CONFLICT DO NOTHING;
