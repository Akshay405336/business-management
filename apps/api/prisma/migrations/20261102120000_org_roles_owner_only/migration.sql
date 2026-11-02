-- Keep the Owner role and its permissions. Remove every other organization role
-- definition, its assignments and permission rows. Do not promote remaining
-- members to Owner. Sweep leftover browser-verification accounts that are not
-- Super Admin and do not author retained business history.

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
    'reason', 'org_roles_owner_only_cleanup',
    'removedRoleIds', COALESCE(jsonb_agg(r."id"::text), '[]'::jsonb),
    'removedRoleKeys', COALESCE(jsonb_agg(r."key"), '[]'::jsonb)
  ),
  NOW()
FROM "organization_memberships" m
JOIN "organization_membership_roles" mr ON mr."membership_id" = m."id"
JOIN "organization_roles" r ON r."id" = mr."role_id"
WHERE r."key" <> 'owner'
GROUP BY m."id", m."organization_id";

DELETE FROM "organization_membership_roles" AS mr
USING "organization_roles" AS r
WHERE mr."role_id" = r."id"
  AND r."key" <> 'owner';

DELETE FROM "organization_invitation_roles" AS ir
USING "organization_roles" AS r
WHERE ir."role_id" = r."id"
  AND r."key" <> 'owner';

DELETE FROM "organization_role_permissions" AS p
USING "organization_roles" AS r
WHERE p."role_id" = r."id"
  AND r."key" <> 'owner';

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
  r."organization_id",
  NULL,
  'ROLE_DELETED',
  'role',
  r."id",
  jsonb_build_object(
    'reason', 'org_roles_owner_only_cleanup',
    'key', r."key",
    'name', r."name",
    'isSystem', r."is_system"
  ),
  NOW()
FROM "organization_roles" r
WHERE r."key" <> 'owner';

DELETE FROM "organization_roles"
WHERE "key" <> 'owner';

-- Leftover agent/browser verification accounts. Never Super Admin. Skip accounts
-- that still author RESTRICT business history or are linked as employee logins.
CREATE TEMP TABLE "tmp_unwanted_test_admins" AS
SELECT a."id"
FROM "platform_admins" a
WHERE a."role" = 'ORGANIZATION_MEMBER'
  AND (
    a."email" LIKE 'browser.admin.%'
    OR a."email" LIKE 'session.admin.%'
    OR a."email" LIKE 'session.employee.%'
    OR a."display_name" = 'Browser Admin'
  )
  AND NOT EXISTS (SELECT 1 FROM "employees" e WHERE e."platform_admin_id" = a."id")
  AND NOT EXISTS (SELECT 1 FROM "employees" e WHERE e."created_by_admin_id" = a."id")
  AND NOT EXISTS (SELECT 1 FROM "leads" l WHERE l."created_by_admin_id" = a."id")
  AND NOT EXISTS (SELECT 1 FROM "lead_activities" la WHERE la."created_by_admin_id" = a."id")
  AND NOT EXISTS (SELECT 1 FROM "clients" c WHERE c."created_by_admin_id" = a."id")
  AND NOT EXISTS (SELECT 1 FROM "proposal_documents" p WHERE p."created_by_admin_id" = a."id")
  AND NOT EXISTS (SELECT 1 FROM "service_packages" s WHERE s."created_by_admin_id" = a."id")
  AND NOT EXISTS (SELECT 1 FROM "projects" pr WHERE pr."created_by_admin_id" = a."id")
  AND NOT EXISTS (SELECT 1 FROM "daily_tasks" d WHERE d."created_by_admin_id" = a."id")
  AND NOT EXISTS (SELECT 1 FROM "daily_task_activities" da WHERE da."actor_admin_id" = a."id")
  AND NOT EXISTS (SELECT 1 FROM "daily_task_reschedules" dr WHERE dr."rescheduled_by_admin_id" = a."id")
  AND NOT EXISTS (SELECT 1 FROM "organization_invitations" i WHERE i."invited_by_admin_id" = a."id")
  AND NOT EXISTS (SELECT 1 FROM "stored_objects" so WHERE so."created_by_admin_id" = a."id");

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
  'MEMBER_REMOVED',
  'membership',
  m."id",
  jsonb_build_object(
    'reason', 'unwanted_test_account_cleanup',
    'targetAdminId', a."id",
    'email', a."email",
    'displayName', a."display_name"
  ),
  NOW()
FROM "tmp_unwanted_test_admins" t
JOIN "platform_admins" a ON a."id" = t."id"
JOIN "organization_memberships" m ON m."admin_id" = a."id";

DELETE FROM "platform_refresh_tokens" AS rt
USING "platform_sessions" AS s
WHERE rt."session_id" = s."id"
  AND s."admin_id" IN (SELECT "id" FROM "tmp_unwanted_test_admins");

DELETE FROM "platform_sessions"
WHERE "admin_id" IN (SELECT "id" FROM "tmp_unwanted_test_admins");

DELETE FROM "platform_auth_challenges"
WHERE "admin_id" IN (SELECT "id" FROM "tmp_unwanted_test_admins");

DELETE FROM "organization_membership_roles" AS mr
USING "organization_memberships" AS m
WHERE mr."membership_id" = m."id"
  AND m."admin_id" IN (SELECT "id" FROM "tmp_unwanted_test_admins");

DELETE FROM "organization_memberships"
WHERE "admin_id" IN (SELECT "id" FROM "tmp_unwanted_test_admins");

DELETE FROM "platform_admins"
WHERE "id" IN (SELECT "id" FROM "tmp_unwanted_test_admins");

DROP TABLE "tmp_unwanted_test_admins";
