-- Restore the application's system role definitions (not temporary test roles)
-- and re-apply membership assignments recorded during the Owner-only cleanup.
-- Owner is left unchanged. Nobody is promoted to Owner.

INSERT INTO "organization_roles" (
  "id",
  "organization_id",
  "key",
  "name",
  "description",
  "is_system",
  "status",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  o."id",
  v."key",
  v."name",
  v."description",
  true,
  'ACTIVE',
  NOW(),
  NOW()
FROM "organizations" o
CROSS JOIN (
  VALUES
    ('admin', 'Admin', 'Full business module access without user or role administration.'),
    ('employee', 'Employee', 'Assigned automatically to employees given sign-in from Employee Management.'),
    ('financial', 'Financial', 'Finance and expense operations.'),
    ('member', 'Member', 'Read-only access to common modules.'),
    ('project_management', 'Project Management', 'Project management module only: projects, project tasks and daily tasks.'),
    ('project_manager', 'Project Manager', 'Leads and human resources operations.'),
    ('sales', 'Sales', 'Leads and client-facing sales operations.')
) AS v("key", "name", "description")
WHERE NOT EXISTS (
  SELECT 1
  FROM "organization_roles" r
  WHERE r."organization_id" = o."id"
    AND r."key" = v."key"
);

INSERT INTO "organization_membership_roles" ("membership_id", "role_id")
SELECT DISTINCT m."id", r."id"
FROM "crm_audit_events" e
JOIN "organization_memberships" m
  ON m."id" = e."entity_id"
 AND m."organization_id" = e."organization_id"
JOIN "organization_roles" r
  ON r."organization_id" = m."organization_id"
 AND r."key" IN (
   SELECT jsonb_array_elements_text(e."metadata"->'removedRoleKeys')
 )
WHERE e."type" = 'MEMBER_ROLES_CHANGED'
  AND e."metadata"->>'reason' = 'org_roles_owner_only_cleanup'
  AND r."key" <> 'owner'
ON CONFLICT DO NOTHING;

INSERT INTO "crm_audit_events" (
  "id",
  "organization_id",
  "admin_id",
  "type",
  "entity_type",
  "entity_id",
  "metadata",
  "created_at"
)
SELECT
  gen_random_uuid(),
  m."organization_id",
  NULL,
  'MEMBER_ROLES_CHANGED',
  'membership',
  m."id",
  jsonb_build_object(
    'reason', 'restore_recorded_role_assignments',
    'restoredRoleKeys', COALESCE(jsonb_agg(r."key"), '[]'::jsonb)
  ),
  NOW()
FROM "organization_memberships" m
JOIN "organization_membership_roles" mr ON mr."membership_id" = m."id"
JOIN "organization_roles" r ON r."id" = mr."role_id"
WHERE r."key" <> 'owner'
GROUP BY m."id", m."organization_id";
