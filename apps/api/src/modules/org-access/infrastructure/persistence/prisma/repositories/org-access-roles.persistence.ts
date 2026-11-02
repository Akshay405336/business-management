import { type PermissionKey } from '@techwin/contracts';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../../../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../../../infrastructure/database/prisma.service.js';
import {
  OrgAccessConflictError,
  OrgAccessForbiddenError,
  OrgAccessValidationError,
} from '../../../../domain/errors/org-access.errors.js';
import type { OrgRoleRecord } from '../../../../domain/repositories/org-access.repository.js';
import type { OrganizationRoleStatus } from '../../../../domain/types/org-access.types.js';
import type { OrgAccessPermissionsPersistence } from './org-access-permissions.persistence.js';
import {
  assertActorHoldsPermissions,
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
    return rows.map((row) => toRoleRecord(row));
  }

  async getRole(organizationId: string, roleId: string): Promise<OrgRoleRecord | null> {
    const row = await this.prisma.organizationRole.findFirst({
      where: { id: roleId, organizationId },
      include: roleInclude(),
    });
    return row ? toRoleRecord(row) : null;
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
    if (existing.isSystem) {
      throw new OrgAccessForbiddenError('System roles cannot be modified.');
    }
    await assertActorHoldsPermissions(
      this.prisma,
      this.permissions.resolveEffectivePermissions,
      organizationId,
      actorAdminId,
      existing.permissions.map((permission) => permission.permissionKey),
      'You cannot modify a role that has permissions you do not have.',
    );
    const row = await this.prisma.$transaction(async (tx) => {
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
    if (role.isSystem) {
      throw new OrgAccessForbiddenError('System role permissions cannot be changed.');
    }
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

  async deleteRole(organizationId: string, roleId: string, actorAdminId: string): Promise<void> {
    const role = await loadRoleOrThrow(this.prisma, organizationId, roleId);
    if (role.isSystem) {
      throw new OrgAccessForbiddenError('System roles cannot be deleted.');
    }
    if (role._count.memberships > 0) {
      throw new OrgAccessConflictError('Remove this role from all members before deleting it.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.organizationRole.delete({ where: { id: roleId } });
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
