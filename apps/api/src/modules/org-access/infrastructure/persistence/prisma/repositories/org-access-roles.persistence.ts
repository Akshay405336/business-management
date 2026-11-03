import { type PermissionKey } from '@techwin/contracts';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../../../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../../../infrastructure/database/prisma.service.js';
import {
  OrgAccessConflictError,
  OrgAccessValidationError,
} from '../../../../domain/errors/org-access.errors.js';
import type { OrgRoleRecord } from '../../../../domain/repositories/org-access.repository.js';
import type { OrganizationRoleStatus } from '../../../../domain/types/org-access.types.js';
import type { OrgAccessPermissionsPersistence } from './org-access-permissions.persistence.js';
import {
  assertActorHoldsPermissions,
  assertOrgRoleMutable,
  loadRoleOrThrow,
  roleInclude,
  toRoleRecord,
  uniquePermissionKeys,
  writeAudit,
} from './org-access-persistence.shared.js';

export class OrgAccessRolesPersistence {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: OrgAccessPermissionsPersistence,
  ) {}

  async listRoles(organizationId: string): Promise<readonly OrgRoleRecord[]> {
    const rows = await this.prisma.organizationRole.findMany({
      where: { organizationId },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      include: roleInclude(),
    });
    if (rows.length === 0) return [];
    const roleIds = rows.map((row) => row.id);
    const pendingByRole = await this.prisma.organizationInvitationRole.groupBy({
      by: ['roleId'],
      where: {
        roleId: { in: roleIds },
        invitation: { organizationId, status: 'PENDING' },
      },
      _count: { _all: true },
    });
    const pendingMap = new Map(
      pendingByRole.map((entry) => [entry.roleId, entry._count._all]),
    );
    return rows.map((row) => toRoleRecord(row, pendingMap.get(row.id) ?? 0));
  }

  async getRole(organizationId: string, roleId: string): Promise<OrgRoleRecord | null> {
    const row = await this.prisma.organizationRole.findFirst({
      where: { id: roleId, organizationId },
      include: roleInclude(),
    });
    if (!row) return null;
    const pendingInvitationCount = await this.prisma.organizationInvitationRole.count({
      where: {
        roleId,
        invitation: { organizationId, status: 'PENDING' },
      },
    });
    return toRoleRecord(row, pendingInvitationCount);
  }

  async createRole(
    organizationId: string,
    input: {
      key: string;
      name: string;
      description: string;
      permissionKeys: readonly PermissionKey[];
    },
    actorAdminId: string,
  ): Promise<OrgRoleRecord> {
    const permissionKeys = uniquePermissionKeys(input.permissionKeys);
    if (permissionKeys.length === 0) {
      throw new OrgAccessValidationError('Select at least one permission.');
    }
    await assertActorHoldsPermissions(
      this.prisma,
      this.permissions.resolveEffectivePermissions,
      organizationId,
      actorAdminId,
      permissionKeys,
      'You cannot create a role with permissions you do not have.',
    );

    const roleId = randomUUID();
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const created = await tx.organizationRole.create({
          data: {
            id: roleId,
            organizationId,
            key: input.key.trim(),
            name: input.name.trim(),
            description: input.description.trim(),
            isSystem: false,
            status: 'ACTIVE',
            permissions: {
              create: permissionKeys.map((permissionKey) => ({ permissionKey })),
            },
          },
          include: roleInclude(),
        });
        await writeAudit(tx, organizationId, {
          adminId: actorAdminId,
          type: 'ROLE_CREATED',
          entityType: 'role',
          entityId: created.id,
          metadata: { key: created.key },
        });
        return created;
      });
      await this.permissions.invalidatePermissionCache(organizationId);
      return toRoleRecord(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new OrgAccessConflictError('A role with this key already exists.');
      }
      throw error;
    }
  }

  async updateRole(
    organizationId: string,
    roleId: string,
    input: { name?: string; description?: string; status?: OrganizationRoleStatus },
    actorAdminId: string,
  ): Promise<OrgRoleRecord> {
    const existing = await loadRoleOrThrow(this.prisma, organizationId, roleId);
    assertOrgRoleMutable(existing, 'modify');
    await assertActorHoldsPermissions(
      this.prisma,
      this.permissions.resolveEffectivePermissions,
      organizationId,
      actorAdminId,
      existing.permissions.map((permission) => permission.permissionKey),
      'You cannot modify a role that has permissions you do not have.',
    );
    const row = await this.prisma.$transaction(async (tx) => {
      if (input.status === 'INACTIVE' && existing.status === 'ACTIVE') {
        const assignmentCount = await tx.organizationMembershipRole.count({ where: { roleId } });
        if (assignmentCount > 0) {
          throw new OrgAccessConflictError(
            assignmentCount === 1
              ? 'This role cannot be deactivated because it is assigned to 1 member.'
              : `This role cannot be deactivated because it is assigned to ${assignmentCount} members.`,
          );
        }
      }
      const updated = await tx.organizationRole.update({
        where: { id: roleId },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.description !== undefined ? { description: input.description.trim() } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
        },
        include: roleInclude(),
      });
      await writeAudit(tx, organizationId, {
        adminId: actorAdminId,
        type: 'ROLE_UPDATED',
        entityType: 'role',
        entityId: updated.id,
      });
      return updated;
    });
    await this.permissions.invalidatePermissionCache(organizationId);
    return toRoleRecord(row);
  }

  async setRolePermissions(
    organizationId: string,
    roleId: string,
    permissionKeys: readonly PermissionKey[],
    actorAdminId: string,
  ): Promise<OrgRoleRecord> {
    const role = await loadRoleOrThrow(this.prisma, organizationId, roleId);
    assertOrgRoleMutable(role, 'modify');
    const normalized = uniquePermissionKeys(permissionKeys);
    await assertActorHoldsPermissions(
      this.prisma,
      this.permissions.resolveEffectivePermissions,
      organizationId,
      actorAdminId,
      [...new Set([...normalized, ...role.permissions.map((permission) => permission.permissionKey)])],
      'You cannot change permissions you do not have.',
    );

    const row = await this.prisma.$transaction(async (tx) => {
      await tx.organizationRolePermission.deleteMany({ where: { roleId } });
      if (normalized.length > 0) {
        await tx.organizationRolePermission.createMany({
          data: normalized.map((permissionKey) => ({ roleId, permissionKey })),
        });
      }
      const updated = await tx.organizationRole.update({
        where: { id: roleId },
        data: { updatedAt: new Date() },
        include: roleInclude(),
      });
      await writeAudit(tx, organizationId, {
        adminId: actorAdminId,
        type: 'ROLE_PERMISSIONS_UPDATED',
        entityType: 'role',
        entityId: role.id,
        metadata: { permissionKeys: normalized },
      });
      return updated;
    });
    await this.permissions.invalidatePermissionCache(organizationId);
    return toRoleRecord(row);
  }

  async getRoleDeletionImpact(organizationId: string, roleId: string) {
    await loadRoleOrThrow(this.prisma, organizationId, roleId);
    const [memberLinks, employeeLinks, pendingInvites] = await Promise.all([
      this.prisma.organizationMembershipRole.findMany({
        where: { roleId, membership: { organizationId } },
        select: {
          membership: { select: { status: true, admin: { select: { employeeProfile: { select: { id: true } } } } } },
        },
      }),
      this.prisma.organizationMembershipRole.count({
        where: {
          roleId,
          membership: { organizationId, admin: { employeeProfile: { isNot: null } } },
        },
      }),
      this.prisma.organizationInvitationRole.count({
        where: {
          roleId,
          invitation: { organizationId, status: 'PENDING' },
        },
      }),
    ]);
    const activeMemberAssignments = memberLinks.filter(
      (link) => link.membership.status === 'ACTIVE',
    ).length;
    const totalMemberAssignments = memberLinks.length;
    const roleRow = await this.prisma.organizationRole.findFirst({
      where: { id: roleId, organizationId },
      select: { status: true },
    });
    const canDeactivate =
      roleRow?.status === 'ACTIVE' && totalMemberAssignments === 0;
    return {
      canDelete: totalMemberAssignments === 0 && pendingInvites === 0,
      canDeactivate,
      totalMemberAssignments,
      activeMemberAssignments,
      employeeLinkedAssignments: employeeLinks,
      pendingInvitationAssignments: pendingInvites,
    };
  }

  async deleteRole(organizationId: string, roleId: string, actorAdminId: string): Promise<void> {
    const role = await loadRoleOrThrow(this.prisma, organizationId, roleId);
    assertOrgRoleMutable(role, 'delete');

    await this.prisma.$transaction(async (tx) => {
      const memberCount = await tx.organizationMembershipRole.count({
        where: { roleId, membership: { organizationId } },
      });
      if (memberCount > 0) {
        const inviteCount = await tx.organizationInvitationRole.count({
          where: { roleId, invitation: { organizationId, status: 'PENDING' } },
        });
        const parts = [
          memberCount === 1
            ? 'assigned to 1 member'
            : `assigned to ${memberCount} members`,
        ];
        if (inviteCount > 0) {
          parts.push(
            inviteCount === 1
              ? 'referenced by 1 pending invitation'
              : `referenced by ${inviteCount} pending invitations`,
          );
        }
        throw new OrgAccessConflictError(
          `This role cannot be deleted because it is ${parts.join(' and ')}.`,
        );
      }
      const inviteCount = await tx.organizationInvitationRole.count({
        where: { roleId, invitation: { organizationId, status: 'PENDING' } },
      });
      if (inviteCount > 0) {
        throw new OrgAccessConflictError(
          inviteCount === 1
            ? 'This role cannot be deleted because it is referenced by 1 pending invitation.'
            : `This role cannot be deleted because it is referenced by ${inviteCount} pending invitations.`,
        );
      }
      await tx.organizationRole.delete({ where: { id: roleId, organizationId } });
      await writeAudit(tx, organizationId, {
        adminId: actorAdminId,
        type: 'ROLE_DELETED',
        entityType: 'role',
        entityId: roleId,
        metadata: { key: role.key },
      });
    });
    await this.permissions.invalidatePermissionCache(organizationId);
  }
}
