-- Additive grants for daily task employee permissions on system Employee roles.
INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT r."id", 'daily_tasks.update_status'
FROM "organization_roles" r
WHERE r."key" = 'employee' AND r."is_system" = true
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT r."id", 'daily_tasks.comment'
FROM "organization_roles" r
WHERE r."key" = 'employee' AND r."is_system" = true
ON CONFLICT DO NOTHING;

-- Mirror legacy grants where administrators already assigned tasks.progress / tasks.comment.
INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'daily_tasks.update_status'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'tasks.progress'
ON CONFLICT DO NOTHING;

INSERT INTO "organization_role_permissions" ("role_id", "permission_key")
SELECT p."role_id", 'daily_tasks.comment'
FROM "organization_role_permissions" p
WHERE p."permission_key" = 'tasks.comment'
ON CONFLICT DO NOTHING;
