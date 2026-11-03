import { normalizedLeadPhoneOrNull } from '@techwin/validation';
import { Prisma } from '../../../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../../../infrastructure/database/prisma.service.js';
import {
  OrgAccessConflictError,
  OrgAccessForbiddenError,
  OrgAccessNotFoundError,
  OrgAccessValidationError,
} from '../../../../domain/errors/org-access.errors.js';
import type {
  OrgAccessSummary,
  OrgMemberListFilters,
  OrgMemberRecord,
  OrgMembershipRef,
  PaginatedOrgMembers,
  PreparedMemberAccount,
} from '../../../../domain/repositories/org-access.repository.js';
import type { OrganizationMembershipStatus, SystemRoleKey } from '../../../../domain/types/org-access.types.js';
import type { OrgAccessPermissionsPersistence } from './org-access-permissions.persistence.js';
import {
  createMemberAccountInTransaction,
  deleteOrganizationMemberInTransaction,
} from './member-account.persistence.js';
import {
  assertActorCanGrantRoles,
  assertActorCanManageMember,
  assertRolesAssignable,
  countActiveOwners,
  ensureSystemRoleByKey,
  loadMembershipOrThrow,
  memberInclude,
  normalizeEmail,
  rolesIncludeOwner,
  toMemberRecord,
  writeAudit,
} from './org-access-persistence.shared.js';

export class OrgAccessMembersPersistence {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: OrgAccessPermissionsPersistence,
  ) {}

  async listMembers(
    organizationId: string,
    filters: OrgMemberListFilters,
  ): Promise<PaginatedOrgMembers> {
    const where: Prisma.OrganizationMembershipWhereInput = {
      organizationId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.roleId
        ? { roleLinks: { some: { roleId: filters.roleId } } }
        : {}),
      ...(filters.search?.trim()
        ? {
            admin: {
              OR: [
                { displayName: { contains: filters.search.trim(), mode: 'insensitive' } },
                { email: { contains: filters.search.trim(), mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };

    const orderBy: Prisma.OrganizationMembershipOrderByWithRelationInput[] =
      filters.sortBy === 'email'
        ? [{ admin: { email: filters.sortDir } }]
        : filters.sortBy === 'joinedAt'
          ? [{ acceptedAt: filters.sortDir }, { createdAt: filters.sortDir }]
          : filters.sortBy === 'updatedAt'
            ? [{ updatedAt: filters.sortDir }]
            : [{ admin: { displayName: filters.sortDir } }];

    const skip = (filters.page - 1) * filters.pageSize;
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.organizationMembership.count({ where }),
      this.prisma.organizationMembership.findMany({
        where,
        orderBy,
        skip,
        take: filters.pageSize,
        include: memberInclude,
      }),
    ]);

    return {
      items: rows.map((row) => toMemberRecord(row)),
      total,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  }

  async getMember(organizationId: string, membershipId: string): Promise<OrgMemberRecord | null> {
    const row = await this.prisma.organizationMembership.findFirst({
      where: { id: membershipId, organizationId },
      include: memberInclude,
    });
    return row ? toMemberRecord(row) : null;
  }

  async getSummary(organizationId: string): Promise<OrgAccessSummary> {
    const [activeMembers, pendingInvitations, suspendedMembers, customRoles] =
      await this.prisma.$transaction([
        this.prisma.organizationMembership.count({
          where: { organizationId, status: 'ACTIVE' },
        }),
        this.prisma.organizationInvitation.count({
          where: { organizationId, status: 'PENDING', expiresAt: { gt: new Date() } },
        }),
        this.prisma.organizationMembership.count({
          where: { organizationId, status: 'SUSPENDED' },
        }),
        this.prisma.organizationRole.count({
          where: { organizationId, isSystem: false },
        }),
      ]);

    return { activeMembers, pendingInvitations, suspendedMembers, customRoles };
  }

  async assignMemberRoles(
    organizationId: string,
    membershipId: string,
    roleIds: readonly string[],
    actorAdminId: string,
  ): Promise<OrgMemberRecord> {
    const membership = await loadMembershipOrThrow(this.prisma, organizationId, membershipId);
    if (membership.adminId === actorAdminId && membership.admin.role !== 'SUPER_ADMIN') {
      throw new OrgAccessForbiddenError('You cannot change your own roles.');
    }
    await assertActorCanManageMember(
      this.prisma,
      this.permissions.resolveEffectivePermissions,
      organizationId,
      actorAdminId,
      membership,
    );
    const roles = await assertRolesAssignable(this.prisma, organizationId, roleIds);
    await assertActorCanGrantRoles(
      this.prisma,
      this.permissions.resolveEffectivePermissions,
      organizationId,
      actorAdminId,
      roles,
    );
    const assigningOwner = rolesIncludeOwner(roles);
    const hadOwnerRole = rolesIncludeOwner(
      membership.roleLinks.map((link) => link.role),
    );

    if (membership.isOwner && hadOwnerRole && !assigningOwner) {
      const owners = await countActiveOwners(this.prisma, organizationId);
      if (owners <= 1) {
        throw new OrgAccessConflictError('The organization must have at least one owner.');
      }
    }

    const row = await this.prisma.$transaction(async (tx) => {
      await tx.organizationMembershipRole.deleteMany({ where: { membershipId } });
      if (roles.length > 0) {
        await tx.organizationMembershipRole.createMany({
          data: roles.map((role) => ({ membershipId, roleId: role.id })),
        });
      }
      const updated = await tx.organizationMembership.update({
        where: { id: membershipId },
        data: { isOwner: assigningOwner },
        include: memberInclude,
      });
      await writeAudit(tx, organizationId, {
        adminId: actorAdminId,
        type: 'MEMBER_ROLES_CHANGED',
        entityType: 'membership',
        entityId: membershipId,
        metadata: { roleIds: roles.map((role) => role.id) },
      });
      return updated;
    });

    await this.permissions.invalidatePermissionCache(organizationId, membership.adminId);
    return toMemberRecord(row);
  }

  async changeMemberStatus(
    organizationId: string,
    membershipId: string,
    status: OrganizationMembershipStatus,
    actorAdminId: string,
  ): Promise<OrgMemberRecord> {
    const membership = await loadMembershipOrThrow(this.prisma, organizationId, membershipId);
    if (membership.adminId === actorAdminId) {
      throw new OrgAccessForbiddenError('You cannot change the status of your own account.');
    }
    await assertActorCanManageMember(
      this.prisma,
      this.permissions.resolveEffectivePermissions,
      organizationId,
      actorAdminId,
      membership,
    );
    const revokesAccess = status === 'SUSPENDED' || status === 'DEACTIVATED';
    if (membership.isOwner && membership.status === 'ACTIVE' && revokesAccess) {
      const owners = await countActiveOwners(this.prisma, organizationId);
      if (owners <= 1) {
        throw new OrgAccessConflictError('The organization must have at least one active owner.');
      }
    }

    const target = await this.prisma.platformAdmin.findUnique({
      where: { id: membership.adminId },
      select: { role: true, organizationId: true },
    });
    const syncAccountStatus =
      target?.role === 'ORGANIZATION_MEMBER' && target.organizationId === organizationId;

    const now = new Date();
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.organizationMembership.update({
        where: { id: membershipId },
        data: { status },
        include: memberInclude,
      });
      if (syncAccountStatus && (revokesAccess || status === 'ACTIVE')) {
        await tx.platformAdmin.update({
          where: { id: membership.adminId },
          data: { status: revokesAccess ? 'DISABLED' : 'ACTIVE' },
        });
      }
      if (revokesAccess && target?.role !== 'SUPER_ADMIN') {
        await tx.platformSession.updateMany({
          where: { adminId: membership.adminId, revokedAt: null, expiresAt: { gt: now } },
          data: { revokedAt: now, revokedReason: 'REVOKED' },
        });
      }
      await writeAudit(tx, organizationId, {
        adminId: actorAdminId,
        type: 'MEMBER_STATUS_CHANGED',
        entityType: 'membership',
        entityId: membershipId,
        metadata: { status },
      });
      return updated;
    });

    await this.permissions.invalidatePermissionCache(organizationId, membership.adminId);
    return toMemberRecord(row);
  }

  async deleteMember(
    organizationId: string,
    membershipId: string,
    actorAdminId: string,
  ): Promise<void> {
    const membership = await loadMembershipOrThrow(this.prisma, organizationId, membershipId);
    if (membership.adminId === actorAdminId) {
      throw new OrgAccessForbiddenError('You cannot delete your own sign-in account.');
    }
    if (membership.admin.role === 'SUPER_ADMIN' || membership.isOwner) {
      throw new OrgAccessForbiddenError('The Owner account cannot be deleted.');
    }
    await assertActorCanManageMember(
      this.prisma,
      this.permissions.resolveEffectivePermissions,
      organizationId,
      actorAdminId,
      membership,
    );

    await this.prisma.$transaction(async (tx) => {
      const outcome = await deleteOrganizationMemberInTransaction(tx, organizationId, {
        adminId: membership.adminId,
        membershipId,
      });
      await writeAudit(tx, organizationId, {
        adminId: actorAdminId,
        type: 'MEMBER_REMOVED',
        entityType: 'membership',
        entityId: membershipId,
        metadata: {
          targetAdminId: membership.adminId,
          email: membership.admin.email,
          displayName: membership.admin.displayName,
          outcome,
        },
      });
    });

    await this.permissions.invalidatePermissionCache(organizationId, membership.adminId);
  }

  async updateMemberProfile(
    organizationId: string,
    membershipId: string,
    input: { displayName?: string; phone?: string | null },
    actorAdminId: string,
  ): Promise<OrgMemberRecord> {
    const membership = await loadMembershipOrThrow(this.prisma, organizationId, membershipId);
    if (input.displayName === undefined && input.phone === undefined) {
      throw new OrgAccessValidationError('Provide at least one field to update.');
    }
    const displayName =
      input.displayName === undefined ? undefined : input.displayName.trim() || null;
    if (displayName !== undefined && !displayName) {
      throw new OrgAccessValidationError('Display name is required.');
    }
    const phone =
      input.phone === undefined ? undefined : normalizedLeadPhoneOrNull(input.phone);

    const row = await this.prisma.$transaction(async (tx) => {
      await tx.platformAdmin.update({
        where: { id: membership.adminId },
        data: {
          ...(displayName !== undefined ? { displayName } : {}),
          ...(phone !== undefined ? { phone } : {}),
        },
      });
      const updated = await tx.organizationMembership.findFirstOrThrow({
        where: { id: membershipId },
        include: memberInclude,
      });
      await writeAudit(tx, organizationId, {
        adminId: actorAdminId,
        type: 'MEMBER_UPDATED',
        entityType: 'membership',
        entityId: membershipId,
      });
      return updated;
    });

    return toMemberRecord(row);
  }

  async resetMemberPassword(
    organizationId: string,
    membershipId: string,
    passwordHash: string,
    actorAdminId: string,
  ): Promise<void> {
    const membership = await loadMembershipOrThrow(this.prisma, organizationId, membershipId);
    if (membership.adminId === actorAdminId) {
      throw new OrgAccessForbiddenError('You cannot reset your own password from user management.');
    }

    const targetAdmin = await this.prisma.platformAdmin.findUnique({
      where: { id: membership.adminId },
      select: { id: true, status: true },
    });
    if (!targetAdmin || targetAdmin.status !== 'ACTIVE') {
      throw new OrgAccessNotFoundError('Member');
    }
    await assertActorCanManageMember(
      this.prisma,
      this.permissions.resolveEffectivePermissions,
      organizationId,
      actorAdminId,
      membership,
    );

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.platformAdmin.update({
        where: { id: membership.adminId },
        data: { passwordHash },
      });
      await tx.platformSession.updateMany({
        where: { adminId: membership.adminId, revokedAt: null, expiresAt: { gt: now } },
        data: { revokedAt: now, revokedReason: 'CREDENTIALS_RESET' },
      });
      await writeAudit(tx, organizationId, {
        adminId: actorAdminId,
        type: 'MEMBER_UPDATED',
        entityType: 'membership',
        entityId: membershipId,
        metadata: { passwordReset: true, targetAdminId: membership.adminId },
      });
    });
  }

  async assertMemberAccountAvailable(
    organizationId: string,
    input: { email: string; roleIds: readonly string[] },
    actorAdminId: string,
  ): Promise<{ isOwner: boolean }> {
    const email = normalizeEmail(input.email);
    const roles = await assertRolesAssignable(this.prisma, organizationId, input.roleIds);
    await assertActorCanGrantRoles(
      this.prisma,
      this.permissions.resolveEffectivePermissions,
      organizationId,
      actorAdminId,
      roles,
    );

    const existingAdmin = await this.prisma.platformAdmin.findUnique({
      where: { email },
      select: { role: true, memberships: { select: { organizationId: true } } },
    });
    if (existingAdmin) {
      const inThisOrganization = existingAdmin.memberships.some(
        (membership) => membership.organizationId === organizationId,
      );
      const withoutAccess =
        existingAdmin.role !== 'SUPER_ADMIN' && existingAdmin.memberships.length === 0;
      throw new OrgAccessConflictError(
        inThisOrganization
          ? 'A sign-in account already exists for this email in this organization.'
          : withoutAccess
            ? 'This email belongs to a sign-in account without organization access. A platform administrator must review and remove it before the email can be reused.'
            : 'This email is already used by a sign-in account outside this organization. Use a different email.',
      );
    }
    return { isOwner: rolesIncludeOwner(roles) };
  }

  async assertActorCanRemoveMemberAccount(
    organizationId: string,
    actorAdminId: string,
    targetAdminId: string,
  ): Promise<void> {
    if (actorAdminId === targetAdminId) {
      throw new OrgAccessForbiddenError('You cannot delete your own sign-in account.');
    }
    const membership = await this.prisma.organizationMembership.findUnique({
      where: { organizationId_adminId: { organizationId, adminId: targetAdminId } },
      include: memberInclude,
    });
    if (membership) {
      await assertActorCanManageMember(
        this.prisma,
        this.permissions.resolveEffectivePermissions,
        organizationId,
        actorAdminId,
        membership,
      );
      return;
    }
    const [actor, target] = await Promise.all([
      this.prisma.platformAdmin.findUnique({ where: { id: actorAdminId }, select: { role: true } }),
      this.prisma.platformAdmin.findUnique({ where: { id: targetAdminId }, select: { role: true } }),
    ]);
    if (target?.role === 'SUPER_ADMIN' && actor?.role !== 'SUPER_ADMIN') {
      throw new OrgAccessForbiddenError('You cannot manage this account.');
    }
  }

  async resolveSystemRoleId(organizationId: string, key: SystemRoleKey): Promise<string> {
    const findSystemRole = () =>
      this.prisma.organizationRole.findFirst({
        where: { organizationId, key, isSystem: true },
        select: { id: true },
      });
    const existing = await findSystemRole();
    if (existing) return existing.id;
    await this.prisma.$transaction((tx) => ensureSystemRoleByKey(tx, organizationId, key));
    const configured = await findSystemRole();
    if (!configured) {
      throw new OrgAccessConflictError(
        `The ${key} system role cannot be configured because a custom role already uses its key.`,
      );
    }
    return configured.id;
  }

  async findLinkableMemberAdminId(organizationId: string, email: string): Promise<string | null> {
    const row = await this.prisma.platformAdmin.findFirst({
      where: {
        email: normalizeEmail(email),
        employeeProfile: { is: null },
        memberships: { some: { organizationId } },
      },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  async findMembershipByAdmin(
    organizationId: string,
    adminId: string,
  ): Promise<OrgMembershipRef | null> {
    const row = await this.prisma.organizationMembership.findUnique({
      where: { organizationId_adminId: { organizationId, adminId } },
      select: { id: true, status: true },
    });
    return row ? { membershipId: row.id, status: row.status } : null;
  }

  async provisionMember(
    organizationId: string,
    input: {
      displayName: string;
      phone?: string | null;
      account: PreparedMemberAccount;
    },
    actorAdminId: string,
  ): Promise<OrgMemberRecord> {
    const displayName = input.displayName.trim();
    if (!displayName) throw new OrgAccessValidationError('Display name is required.');
    const phone = normalizedLeadPhoneOrNull(input.phone ?? null);
    const { account } = input;

    let membershipId: string;
    try {
      membershipId = await this.prisma.$transaction(async (tx) => {
        const created = await createMemberAccountInTransaction(
          tx,
          organizationId,
          { account, displayName, phone, membershipStatus: 'ACTIVE' },
          actorAdminId,
        );
        await tx.employee.updateMany({
          where: { organizationId, workEmail: account.email, platformAdminId: null },
          data: { platformAdminId: created.adminId },
        });
        return created.membershipId;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new OrgAccessConflictError('A sign-in account already exists for this email.');
      }
      throw error;
    }

    await this.permissions.invalidatePermissionCache(organizationId, account.adminId);
    return toMemberRecord(await loadMembershipOrThrow(this.prisma, organizationId, membershipId));
  }
}
