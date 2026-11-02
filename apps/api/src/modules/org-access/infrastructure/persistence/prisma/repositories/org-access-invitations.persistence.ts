import { SYSTEM_ROLE_KEYS } from '@techwin/contracts';
import { randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../../../../../../infrastructure/database/prisma.service.js';
import {
  OrgAccessConflictError,
  OrgAccessNotFoundError,
  OrgAccessValidationError,
} from '../../../../domain/errors/org-access.errors.js';
import type { OrgAccessPermissionsPersistence } from './org-access-permissions.persistence.js';
import {
  INVITATION_TTL_MS,
  assertActorCanGrantRoles,
  assertRolesBelongToOrg,
  hashToken,
  normalizeEmail,
  writeAudit,
} from './org-access-persistence.shared.js';

export class OrgAccessInvitationsPersistence {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: OrgAccessPermissionsPersistence,
  ) {}

  async createInvitation(
    organizationId: string,
    input: { email: string; roleIds: readonly string[] },
    actorAdminId: string,
  ): Promise<{ invitationId: string; email: string; expiresAt: string; acceptToken: string }> {
    const email = normalizeEmail(input.email);
    const roles = await assertRolesBelongToOrg(this.prisma, organizationId, input.roleIds);
    await assertActorCanGrantRoles(
      this.prisma,
      this.permissions.resolveEffectivePermissions,
      organizationId,
      actorAdminId,
      roles,
    );

    const existingAdmin = await this.prisma.platformAdmin.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingAdmin) {
      const membership = await this.prisma.organizationMembership.findUnique({
        where: {
          organizationId_adminId: { organizationId, adminId: existingAdmin.id },
        },
        select: { id: true },
      });
      if (membership) {
        throw new OrgAccessConflictError('This email already belongs to an organization member.');
      }
    }

    const pendingInvite = await this.prisma.organizationInvitation.findFirst({
      where: { organizationId, email, status: 'PENDING', expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    if (pendingInvite) {
      throw new OrgAccessConflictError('A pending invitation already exists for this email.');
    }

    const acceptToken = randomBytes(32).toString('hex');
    const tokenHash = hashToken(acceptToken);
    const invitationId = randomUUID();
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

    await this.prisma.$transaction(async (tx) => {
      await tx.organizationInvitation.create({
        data: {
          id: invitationId,
          organizationId,
          email,
          tokenHash,
          status: 'PENDING',
          expiresAt,
          invitedByAdminId: actorAdminId,
          roleLinks: {
            create: roles.map((role) => ({ roleId: role.id })),
          },
        },
      });
      await writeAudit(tx, organizationId, {
        adminId: actorAdminId,
        type: 'MEMBER_INVITED',
        entityType: 'invitation',
        entityId: invitationId,
        metadata: { email, roleIds: roles.map((role) => role.id) },
      });
    });

    return {
      invitationId,
      email,
      expiresAt: expiresAt.toISOString(),
      acceptToken,
    };
  }

  async resendInvitation(
    organizationId: string,
    invitationId: string,
    actorAdminId: string,
  ): Promise<{ invitationId: string; email: string; expiresAt: string; acceptToken: string }> {
    const invitation = await this.prisma.organizationInvitation.findFirst({
      where: { id: invitationId, organizationId },
      select: { id: true, email: true, status: true },
    });
    if (!invitation) throw new OrgAccessNotFoundError('Invitation');
    if (invitation.status !== 'PENDING') {
      throw new OrgAccessConflictError('Only pending invitations can be resent.');
    }

    const acceptToken = randomBytes(32).toString('hex');
    const tokenHash = hashToken(acceptToken);
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

    await this.prisma.$transaction(async (tx) => {
      await tx.organizationInvitation.update({
        where: { id: invitationId },
        data: { tokenHash, expiresAt, revokedAt: null },
      });
      await writeAudit(tx, organizationId, {
        adminId: actorAdminId,
        type: 'MEMBER_INVITED',
        entityType: 'invitation',
        entityId: invitationId,
        metadata: { email: invitation.email, resent: true },
      });
    });

    return {
      invitationId,
      email: invitation.email,
      expiresAt: expiresAt.toISOString(),
      acceptToken,
    };
  }

  async revokeInvitation(
    organizationId: string,
    invitationId: string,
    actorAdminId: string,
  ): Promise<void> {
    const invitation = await this.prisma.organizationInvitation.findFirst({
      where: { id: invitationId, organizationId },
      select: { id: true, status: true },
    });
    if (!invitation) throw new OrgAccessNotFoundError('Invitation');
    if (invitation.status !== 'PENDING') {
      throw new OrgAccessConflictError('Only pending invitations can be revoked.');
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.organizationInvitation.update({
        where: { id: invitationId },
        data: { status: 'REVOKED', revokedAt: now },
      });
      await writeAudit(tx, organizationId, {
        adminId: actorAdminId,
        type: 'MEMBER_INVITATION_REVOKED',
        entityType: 'invitation',
        entityId: invitationId,
      });
    });
  }

  async acceptInvitation(input: {
    acceptToken: string;
    displayName: string;
    passwordHash: string;
    totpSecretCiphertext: string;
    newAdminId: string;
  }): Promise<{ organizationId: string; adminId: string }> {
    const tokenHash = hashToken(input.acceptToken.trim());
    const displayName = input.displayName.trim();
    if (!displayName) throw new OrgAccessValidationError('Display name is required.');

    const invitation = await this.prisma.organizationInvitation.findUnique({
      where: { tokenHash },
      include: { roleLinks: { select: { roleId: true } } },
    });
    if (!invitation || invitation.status !== 'PENDING') {
      throw new OrgAccessNotFoundError('Invitation');
    }
    if (invitation.expiresAt.getTime() <= Date.now()) {
      await this.prisma.organizationInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      throw new OrgAccessValidationError('This invitation has expired.');
    }

    const email = invitation.email;
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      let admin = await tx.platformAdmin.findUnique({
        where: { email },
        select: { id: true, organizationId: true },
      });

      if (!admin) {
        const adminId = input.newAdminId;
        admin = await tx.platformAdmin.create({
          data: {
            id: adminId,
            email,
            displayName,
            role: 'ORGANIZATION_MEMBER',
            status: 'ACTIVE',
            passwordHash: input.passwordHash,
            totpSecretCiphertext: input.totpSecretCiphertext,
            organizationId: invitation.organizationId,
          },
          select: { id: true, organizationId: true },
        });
      } else {
        if (
          admin.organizationId &&
          admin.organizationId !== invitation.organizationId
        ) {
          throw new OrgAccessConflictError(
            'This account is already linked to another organization.',
          );
        }
        await tx.platformAdmin.update({
          where: { id: admin.id },
          data: {
            displayName,
            passwordHash: input.passwordHash,
            totpSecretCiphertext: input.totpSecretCiphertext,
            organizationId: admin.organizationId ?? invitation.organizationId,
            role: 'ORGANIZATION_MEMBER',
            status: 'ACTIVE',
          },
        });
      }

      const existingMembership = await tx.organizationMembership.findUnique({
        where: {
          organizationId_adminId: {
            organizationId: invitation.organizationId,
            adminId: admin.id,
          },
        },
        select: { id: true },
      });
      if (existingMembership) {
        throw new OrgAccessConflictError('This account is already a member of the organization.');
      }

      const roleIds = invitation.roleLinks.map((link) => link.roleId);
      const roles =
        roleIds.length > 0
          ? await tx.organizationRole.findMany({
              where: { id: { in: roleIds }, organizationId: invitation.organizationId },
              select: { id: true, key: true },
            })
          : [];
      const isOwner = roles.some((role) => role.key === SYSTEM_ROLE_KEYS.owner);
      const membershipId = randomUUID();

      await tx.organizationMembership.create({
        data: {
          id: membershipId,
          organizationId: invitation.organizationId,
          adminId: admin.id,
          status: 'ACTIVE',
          isOwner,
          invitedByAdminId: invitation.invitedByAdminId,
          invitedAt: invitation.createdAt,
          acceptedAt: now,
          roleLinks:
            roles.length > 0
              ? { create: roles.map((role) => ({ roleId: role.id })) }
              : undefined,
        },
      });

      await tx.organizationInvitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED', acceptedAt: now },
      });

      await writeAudit(tx, invitation.organizationId, {
        adminId: admin.id,
        type: 'MEMBER_INVITATION_ACCEPTED',
        entityType: 'invitation',
        entityId: invitation.id,
        metadata: { membershipId },
      });

      await this.permissions.invalidatePermissionCache(invitation.organizationId, admin.id);

      return { organizationId: invitation.organizationId, adminId: admin.id };
    });
  }
}
