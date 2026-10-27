-- Organization access: memberships, roles, permissions, invitations

ALTER TYPE "PlatformAdminRole" ADD VALUE IF NOT EXISTS 'ORGANIZATION_MEMBER';

CREATE TYPE "OrganizationMembershipStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED', 'DEACTIVATED');
CREATE TYPE "OrganizationRoleStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "OrganizationInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

ALTER TYPE "CrmAuditEventType" ADD VALUE IF NOT EXISTS 'MEMBER_INVITED';
ALTER TYPE "CrmAuditEventType" ADD VALUE IF NOT EXISTS 'MEMBER_INVITATION_REVOKED';
ALTER TYPE "CrmAuditEventType" ADD VALUE IF NOT EXISTS 'MEMBER_INVITATION_ACCEPTED';
ALTER TYPE "CrmAuditEventType" ADD VALUE IF NOT EXISTS 'MEMBER_UPDATED';
ALTER TYPE "CrmAuditEventType" ADD VALUE IF NOT EXISTS 'MEMBER_STATUS_CHANGED';
ALTER TYPE "CrmAuditEventType" ADD VALUE IF NOT EXISTS 'MEMBER_ROLES_CHANGED';
ALTER TYPE "CrmAuditEventType" ADD VALUE IF NOT EXISTS 'MEMBER_REMOVED';
ALTER TYPE "CrmAuditEventType" ADD VALUE IF NOT EXISTS 'ROLE_CREATED';
ALTER TYPE "CrmAuditEventType" ADD VALUE IF NOT EXISTS 'ROLE_UPDATED';
ALTER TYPE "CrmAuditEventType" ADD VALUE IF NOT EXISTS 'ROLE_DELETED';
ALTER TYPE "CrmAuditEventType" ADD VALUE IF NOT EXISTS 'ROLE_PERMISSIONS_UPDATED';

CREATE TABLE "organization_roles" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "key" VARCHAR(64) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500) NOT NULL DEFAULT '',
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "status" "OrganizationRoleStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "organization_roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "organization_role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_key" VARCHAR(64) NOT NULL,

    CONSTRAINT "organization_role_permissions_pkey" PRIMARY KEY ("role_id","permission_key")
);

CREATE TABLE "organization_memberships" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "status" "OrganizationMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_owner" BOOLEAN NOT NULL DEFAULT false,
    "invited_by_admin_id" UUID,
    "invited_at" TIMESTAMPTZ(3),
    "accepted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "organization_memberships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "organization_membership_roles" (
    "membership_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,

    CONSTRAINT "organization_membership_roles_pkey" PRIMARY KEY ("membership_id","role_id")
);

CREATE TABLE "organization_invitations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "status" "OrganizationInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "invited_by_admin_id" UUID NOT NULL,
    "accepted_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "organization_invitations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "organization_invitation_roles" (
    "invitation_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,

    CONSTRAINT "organization_invitation_roles_pkey" PRIMARY KEY ("invitation_id","role_id")
);

CREATE UNIQUE INDEX "organization_roles_organization_id_key_key" ON "organization_roles"("organization_id", "key");
CREATE INDEX "organization_roles_organization_id_status_idx" ON "organization_roles"("organization_id", "status");

CREATE UNIQUE INDEX "organization_memberships_organization_id_admin_id_key" ON "organization_memberships"("organization_id", "admin_id");
CREATE INDEX "organization_memberships_organization_id_status_idx" ON "organization_memberships"("organization_id", "status");

CREATE UNIQUE INDEX "organization_invitations_token_hash_key" ON "organization_invitations"("token_hash");
CREATE INDEX "organization_invitations_organization_id_status_idx" ON "organization_invitations"("organization_id", "status");
CREATE INDEX "organization_invitations_organization_id_email_idx" ON "organization_invitations"("organization_id", "email");

ALTER TABLE "organization_roles" ADD CONSTRAINT "organization_roles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_role_permissions" ADD CONSTRAINT "organization_role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "organization_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "platform_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_invited_by_admin_id_fkey" FOREIGN KEY ("invited_by_admin_id") REFERENCES "platform_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "organization_membership_roles" ADD CONSTRAINT "organization_membership_roles_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "organization_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_membership_roles" ADD CONSTRAINT "organization_membership_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "organization_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_invited_by_admin_id_fkey" FOREIGN KEY ("invited_by_admin_id") REFERENCES "platform_admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "organization_invitation_roles" ADD CONSTRAINT "organization_invitation_roles_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "organization_invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_invitation_roles" ADD CONSTRAINT "organization_invitation_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "organization_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
