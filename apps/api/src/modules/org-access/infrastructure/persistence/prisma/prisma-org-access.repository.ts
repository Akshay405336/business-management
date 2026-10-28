import { Injectable } from '@nestjs/common';
import {
  isPermissionKey,
  PERMISSION_KEYS,
  PROTECTED_SYSTEM_ROLE_KEYS,
  SYSTEM_ROLE_KEYS,
  type PermissionKey,
} from '@techwin/contracts';
import { normalizedLeadPhoneOrNull } from '@techwin/validation';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Prisma, type CrmAuditEventType } from '../../../../../generated/prisma/client.js';
import { RedisService } from '../../../../../infrastructure/cache/redis.service.js';
import { PrismaService } from '../../../../../infrastructure/database/prisma.service.js';
import { DEFAULT_SYSTEM_ROLES } from '../../../domain/constants/default-role-permissions.js';
import {
  OrgAccessConflictError,
  OrgAccessForbiddenError,
  OrgAccessNotFoundError,
  OrgAccessValidationError,
  OrgMembershipDeniedError,
} from '../../../domain/errors/org-access.errors.js';
import type {
  OrgAccessRepository,
  OrgAccessSummary,
  OrgMemberListFilters,
  OrgMemberRecord,
  OrgRoleRecord,
  PaginatedOrgMembers,
} from '../../../domain/repositories/org-access.repository.js';

const PERMISSION_CACHE_TTL_SECONDS = 300;
const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const memberInclude = {
  admin: {
    select: {
      id: true,
      email: true,
      displayName: true,
      phone: true,
      lastLoginAt: true,
      role: true,
      employeeProfile: { select: { id: true, displayName: true, phone: true } },
    },
  },
  roleLinks: {
    include: {
      role: {
        select: { id: true, key: true, name: true, isSystem: true, status: true },
      },
    },
  },
} as const;

type MembershipRow = Prisma.OrganizationMembershipGetPayload<{ include: typeof memberInclude }>;

type RoleWithPermissions = Prisma.OrganizationRoleGetPayload<{
  include: { permissions: true; _count: { select: { memberships: true } } };
}>;

@Injectable()
export class PrismaOrgAccessRepository implements OrgAccessRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private permissionCacheKey(organizationId: string, adminId: string): string {
    return `org-access:perm:${organizationId}:${adminId}`;
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  private uniquePermissionKeys(keys: readonly string[]): PermissionKey[] {
    const seen = new Set<PermissionKey>();
    for (const key of keys) {
      if (isPermissionKey(key)) seen.add(key);
    }
    return [...seen].sort();
  }

  private async writeAudit(
    tx: Pick<PrismaService, 'crmAuditEvent'>,
    organizationId: string,
    audit: {
      adminId: string;
      type: CrmAuditEventType;
      entityType: string;
      entityId: string;
      metadata?: Prisma.InputJsonValue;
    },
  ): Promise<void> {
    await tx.crmAuditEvent.create({
      data: {
        organizationId,
        adminId: audit.adminId,
        type: audit.type,
        entityType: audit.entityType,
        entityId: audit.entityId,
        metadata: audit.metadata,
      },
    });
  }

  private toMemberRecord(row: MembershipRow): OrgMemberRecord {
    const roles = row.roleLinks
      .map((link) => link.role)
      .filter((role) => role.status === 'ACTIVE')
      .map((role) => ({
        id: role.id,
        key: role.key,
        name: role.name,
        isSystem: role.isSystem,
      }));

    return {
      membershipId: row.id,
      adminId: row.admin.id,
      email: row.admin.email,
      displayName: row.admin.displayName,
      status: row.status,
      isOwner: row.isOwner,
      roles,
      employeeId: row.admin.employeeProfile?.id ?? null,
      employeeDisplayName: row.admin.employeeProfile?.displayName ?? null,
      phoneNumber:
        row.admin.phone?.trim() ||
        row.admin.employeeProfile?.phone?.trim() ||
        null,
      joinedAt: (row.acceptedAt ?? row.createdAt).toISOString(),
      invitedAt: row.invitedAt?.toISOString() ?? null,
      acceptedAt: row.acceptedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
      lastLoginAt: row.admin.lastLoginAt?.toISOString() ?? null,
    };
  }

  private toRoleRecord(row: RoleWithPermissions): OrgRoleRecord {
    return {
      id: row.id,
      key: row.key,
      name: row.name,
      description: row.description,
      isSystem: row.isSystem,
      status: row.status,
      memberCount: row._count.memberships,
      permissionKeys: this.uniquePermissionKeys(row.permissions.map((p) => p.permissionKey)),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private roleInclude() {
    return {
      permissions: true,
      _count: { select: { memberships: true } },
    } as const;
  }

  private async syncSystemRolePermissions(
    tx: Pick<PrismaService, 'organizationRolePermission'>,
    roleId: string,
    permissionKeys: readonly PermissionKey[],
  ): Promise<void> {
    await tx.organizationRolePermission.deleteMany({ where: { roleId } });
    if (permissionKeys.length === 0) return;
    await tx.organizationRolePermission.createMany({
      data: permissionKeys.map((permissionKey) => ({ roleId, permissionKey })),
    });
  }

  private async ensureSystemRoles(
    tx: Pick<PrismaService, 'organizationRole' | 'organizationRolePermission'>,
    organizationId: string,
  ): Promise<Map<string, string>> {
    const existing = await tx.organizationRole.findMany({
      where: { organizationId },
      select: { id: true, key: true },
    });
    const keyToId = new Map(existing.map((row) => [row.key, row.id]));

    for (const template of DEFAULT_SYSTEM_ROLES) {
      let roleId = keyToId.get(template.key);
      if (!roleId) {
        roleId = randomUUID();
        await tx.organizationRole.create({
          data: {
            id: roleId,
            organizationId,
            key: template.key,
            name: template.name,
            description: template.description,
            isSystem: true,
            status: 'ACTIVE',
          },
        });
        keyToId.set(template.key, roleId);
      } else {
        await tx.organizationRole.update({
          where: { id: roleId },
          data: {
            name: template.name,
            description: template.description,
            isSystem: true,
          },
        });
      }
      await this.syncSystemRolePermissions(tx, roleId, template.permissions);
    }

    return keyToId;
  }

  private async assertActorCanGrantRoles(
    organizationId: string,
    actorAdminId: string,
    roles: readonly RoleWithPermissions[],
  ): Promise<void> {
    const actor = await this.prisma.platformAdmin.findUnique({
      where: { id: actorAdminId },
      select: { role: true },
    });
    if (actor?.role === 'SUPER_ADMIN') return;

    if (this.rolesIncludeOwner(roles)) {
      await this.assertActorIsOwner(organizationId, actorAdminId);
    }

    const actorPermissions = new Set(
      await this.resolveEffectivePermissions(organizationId, actorAdminId, false),
    );

    for (const role of roles) {
      if (PROTECTED_SYSTEM_ROLE_KEYS.has(role.key) && role.key === SYSTEM_ROLE_KEYS.owner) {
        await this.assertActorIsOwner(organizationId, actorAdminId);
      }
      for (const assignment of role.permissions) {
        if (!actorPermissions.has(assignment.permissionKey as PermissionKey)) {
          throw new OrgAccessForbiddenError(
            'You cannot assign a role that includes permissions you do not have.',
          );
        }
      }
    }
  }

  private async findRoleIdByKey(
    tx: Pick<PrismaService, 'organizationRole'>,
    organizationId: string,
    key: string,
  ): Promise<string | null> {
    const row = await tx.organizationRole.findFirst({
      where: { organizationId, key },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  private async countActiveOwners(
    tx: Pick<PrismaService, 'organizationMembership'>,
    organizationId: string,
  ): Promise<number> {
    return tx.organizationMembership.count({
      where: { organizationId, isOwner: true, status: 'ACTIVE' },
    });
  }

  private async loadMembershipOrThrow(
    organizationId: string,
    membershipId: string,
  ): Promise<MembershipRow> {
    const row = await this.prisma.organizationMembership.findFirst({
      where: { id: membershipId, organizationId },
      include: memberInclude,
    });
    if (!row) throw new OrgAccessNotFoundError('Member');
    return row;
  }

  private async loadRoleOrThrow(organizationId: string, roleId: string): Promise<RoleWithPermissions> {
    const row = await this.prisma.organizationRole.findFirst({
      where: { id: roleId, organizationId },
      include: this.roleInclude(),
    });
    if (!row) throw new OrgAccessNotFoundError('Role');
    return row;
  }

  private async assertActorIsOwner(
    organizationId: string,
    actorAdminId: string,
  ): Promise<void> {
    const actor = await this.prisma.organizationMembership.findFirst({
      where: { organizationId, adminId: actorAdminId, status: 'ACTIVE' },
      select: { isOwner: true },
    });
    if (!actor?.isOwner) {
      throw new OrgAccessForbiddenError('Only organization owners can manage the owner role.');
    }
  }

  private async assertRolesBelongToOrg(
    organizationId: string,
    roleIds: readonly string[],
  ): Promise<RoleWithPermissions[]> {
    if (roleIds.length === 0) return [];
    const uniqueIds = [...new Set(roleIds)];
    const rows = await this.prisma.organizationRole.findMany({
      where: { id: { in: uniqueIds }, organizationId },
      include: this.roleInclude(),
    });
    if (rows.length !== uniqueIds.length) {
      throw new OrgAccessValidationError('One or more roles are invalid for this organization.');
    }
    return rows;
  }

  private rolesIncludeOwner(roles: readonly { key: string }[]): boolean {
    return roles.some((role) => role.key === SYSTEM_ROLE_KEYS.owner);
  }

  private async resolvePermissionsFromDb(
    organizationId: string,
    adminId: string,
  ): Promise<PermissionKey[]> {
    const membership = await this.prisma.organizationMembership.findFirst({
      where: { organizationId, adminId, status: 'ACTIVE' },
      include: {
        roleLinks: {
          include: {
            role: { include: { permissions: true } },
          },
        },
      },
    });
    if (!membership) return [];

    const keys: string[] = [];
    for (const link of membership.roleLinks) {
      if (link.role.status !== 'ACTIVE') continue;
      for (const permission of link.role.permissions) {
        keys.push(permission.permissionKey);
      }
    }
    return this.uniquePermissionKeys(keys);
  }

  async ensureOrganizationAccessBootstrap(organizationId: string, adminId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const roleIdsByKey = await this.ensureSystemRoles(tx, organizationId);
      const admin = await tx.platformAdmin.findUnique({
        where: { id: adminId },
        select: { role: true },
      });
      if (!admin) throw new OrgAccessNotFoundError('Administrator');

      const now = new Date();
      const existing = await tx.organizationMembership.findUnique({
        where: { organizationId_adminId: { organizationId, adminId } },
        include: { roleLinks: true },
      });

      if (existing) {
        if (!existing.acceptedAt) {
          await tx.organizationMembership.update({
            where: { id: existing.id },
            data: { acceptedAt: now, status: 'ACTIVE' },
          });
        }
        if (admin.role === 'SUPER_ADMIN' && !existing.isOwner) {
          const ownerRoleId =
            roleIdsByKey.get(SYSTEM_ROLE_KEYS.owner) ??
            (await this.findRoleIdByKey(tx, organizationId, SYSTEM_ROLE_KEYS.owner));
          if (!ownerRoleId) throw new OrgAccessConflictError('Owner role is not configured.');
          await tx.organizationMembership.update({
            where: { id: existing.id },
            data: { isOwner: true },
          });
          await tx.organizationMembershipRole.upsert({
            where: {
              membershipId_roleId: { membershipId: existing.id, roleId: ownerRoleId },
            },
            create: { membershipId: existing.id, roleId: ownerRoleId },
            update: {},
          });
        }
        return;
      }

      const membershipId = randomUUID();
      const isSuperAdmin = admin.role === 'SUPER_ADMIN';
      const ownerRoleId = roleIdsByKey.get(SYSTEM_ROLE_KEYS.owner);
      const memberRoleId = roleIdsByKey.get(SYSTEM_ROLE_KEYS.member);
      const assignedRoleId = isSuperAdmin ? ownerRoleId : memberRoleId;
      if (!assignedRoleId) {
        throw new OrgAccessConflictError('Default organization roles are not configured.');
      }

      await tx.organizationMembership.create({
        data: {
          id: membershipId,
          organizationId,
          adminId,
          status: 'ACTIVE',
          isOwner: isSuperAdmin,
          acceptedAt: now,
          roleLinks: { create: { roleId: assignedRoleId } },
        },
      });
    });
  }

  async assertActiveMembership(organizationId: string, adminId: string): Promise<void> {
    const admin = await this.prisma.platformAdmin.findUnique({
      where: { id: adminId },
      select: { role: true, status: true },
    });
    if (!admin) throw new OrgAccessNotFoundError('Administrator');
    if (admin.role === 'SUPER_ADMIN' && admin.status === 'ACTIVE') return;

    const membership = await this.prisma.organizationMembership.findUnique({
      where: { organizationId_adminId: { organizationId, adminId } },
      select: { status: true },
    });
    if (!membership || membership.status !== 'ACTIVE') {
      throw new OrgMembershipDeniedError();
    }
  }

  async resolveEffectivePermissions(
    organizationId: string,
    adminId: string,
    isPlatformSuperAdmin: boolean,
  ): Promise<readonly PermissionKey[]> {
    if (isPlatformSuperAdmin) return PERMISSION_KEYS;

    const cacheKey = this.permissionCacheKey(organizationId, adminId);
    let cached: PermissionKey[] | null = null;
    try {
      const raw = await this.redis.client.get(cacheKey);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          cached = this.uniquePermissionKeys(parsed.filter((v) => typeof v === 'string'));
        }
      }
    } catch {
      cached = null;
    }

    const fromDb = await this.resolvePermissionsFromDb(organizationId, adminId);
    if (fromDb.length === 0 && cached !== null && cached.length > 0) {
      return [];
    }

    if (
      cached !== null &&
      cached.length === fromDb.length &&
      cached.every((key, index) => key === fromDb[index])
    ) {
      return cached;
    }

    try {
      await this.redis.client.set(
        cacheKey,
        JSON.stringify(fromDb),
        'EX',
        PERMISSION_CACHE_TTL_SECONDS,
      );
    } catch {
      // Redis failures must not block permission resolution from the database.
    }

    return fromDb;
  }

  async invalidatePermissionCache(organizationId: string, adminId?: string): Promise<void> {
    try {
      if (adminId) {
        await this.redis.client.del(this.permissionCacheKey(organizationId, adminId));
        return;
      }
      const pattern = `org-access:perm:${organizationId}:*`;
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.redis.client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = nextCursor;
        if (keys.length > 0) await this.redis.client.del(...keys);
      } while (cursor !== '0');
    } catch {
      // Best-effort cache invalidation.
    }
  }

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
      items: rows.map((row) => this.toMemberRecord(row)),
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
    return row ? this.toMemberRecord(row) : null;
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

  async listRoles(organizationId: string): Promise<readonly OrgRoleRecord[]> {
    const rows = await this.prisma.organizationRole.findMany({
      where: { organizationId },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      include: this.roleInclude(),
    });
    return rows.map((row) => this.toRoleRecord(row));
  }

  async getRole(organizationId: string, roleId: string): Promise<OrgRoleRecord | null> {
    const row = await this.prisma.organizationRole.findFirst({
      where: { id: roleId, organizationId },
      include: this.roleInclude(),
    });
    return row ? this.toRoleRecord(row) : null;
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
    const permissionKeys = this.uniquePermissionKeys(input.permissionKeys);
    if (permissionKeys.length === 0) {
      throw new OrgAccessValidationError('Select at least one permission.');
    }

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
          include: this.roleInclude(),
        });
        await this.writeAudit(tx, organizationId, {
          adminId: actorAdminId,
          type: 'ROLE_CREATED',
          entityType: 'role',
          entityId: created.id,
          metadata: { key: created.key },
        });
        return created;
      });
      await this.invalidatePermissionCache(organizationId);
      return this.toRoleRecord(row);
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
    input: { name?: string; description?: string; status?: 'ACTIVE' | 'INACTIVE' },
    actorAdminId: string,
  ): Promise<OrgRoleRecord> {
    const existing = await this.loadRoleOrThrow(organizationId, roleId);
    if (existing.isSystem) {
      throw new OrgAccessForbiddenError('System roles cannot be modified.');
    }
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.organizationRole.update({
        where: { id: roleId },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.description !== undefined ? { description: input.description.trim() } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
        },
        include: this.roleInclude(),
      });
      await this.writeAudit(tx, organizationId, {
        adminId: actorAdminId,
        type: 'ROLE_UPDATED',
        entityType: 'role',
        entityId: updated.id,
      });
      return updated;
    });
    await this.invalidatePermissionCache(organizationId);
    return this.toRoleRecord(row);
  }

  async setRolePermissions(
    organizationId: string,
    roleId: string,
    permissionKeys: readonly PermissionKey[],
    actorAdminId: string,
  ): Promise<OrgRoleRecord> {
    const role = await this.loadRoleOrThrow(organizationId, roleId);
    if (role.isSystem) {
      throw new OrgAccessForbiddenError('System role permissions cannot be changed.');
    }
    const normalized = this.uniquePermissionKeys(permissionKeys);

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
        include: this.roleInclude(),
      });
      await this.writeAudit(tx, organizationId, {
        adminId: actorAdminId,
        type: 'ROLE_PERMISSIONS_UPDATED',
        entityType: 'role',
        entityId: role.id,
        metadata: { permissionKeys: normalized },
      });
      return updated;
    });
    await this.invalidatePermissionCache(organizationId);
    return this.toRoleRecord(row);
  }

  async deleteRole(organizationId: string, roleId: string, actorAdminId: string): Promise<void> {
    const role = await this.loadRoleOrThrow(organizationId, roleId);
    if (role.isSystem) {
      throw new OrgAccessForbiddenError('System roles cannot be deleted.');
    }
    if (role._count.memberships > 0) {
      throw new OrgAccessConflictError('Remove this role from all members before deleting it.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.organizationRole.delete({ where: { id: roleId } });
      await this.writeAudit(tx, organizationId, {
        adminId: actorAdminId,
        type: 'ROLE_DELETED',
        entityType: 'role',
        entityId: roleId,
        metadata: { key: role.key },
      });
    });
    await this.invalidatePermissionCache(organizationId);
  }

  async assignMemberRoles(
    organizationId: string,
    membershipId: string,
    roleIds: readonly string[],
    actorAdminId: string,
  ): Promise<OrgMemberRecord> {
    const membership = await this.loadMembershipOrThrow(organizationId, membershipId);
    const roles = await this.assertRolesBelongToOrg(organizationId, roleIds);
    await this.assertActorCanGrantRoles(organizationId, actorAdminId, roles);
    const assigningOwner = this.rolesIncludeOwner(roles);
    const hadOwnerRole = this.rolesIncludeOwner(
      membership.roleLinks.map((link) => link.role),
    );

    if (membership.isOwner && hadOwnerRole && !assigningOwner) {
      const owners = await this.countActiveOwners(this.prisma, organizationId);
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
      await this.writeAudit(tx, organizationId, {
        adminId: actorAdminId,
        type: 'MEMBER_ROLES_CHANGED',
        entityType: 'membership',
        entityId: membershipId,
        metadata: { roleIds: roles.map((role) => role.id) },
      });
      return updated;
    });

    await this.invalidatePermissionCache(organizationId, membership.adminId);
    return this.toMemberRecord(row);
  }

  async changeMemberStatus(
    organizationId: string,
    membershipId: string,
    status: 'ACTIVE' | 'INVITED' | 'SUSPENDED' | 'DEACTIVATED',
    actorAdminId: string,
  ): Promise<OrgMemberRecord> {
    const membership = await this.loadMembershipOrThrow(organizationId, membershipId);
    if (
      membership.isOwner &&
      membership.status === 'ACTIVE' &&
      (status === 'SUSPENDED' || status === 'DEACTIVATED')
    ) {
      const owners = await this.countActiveOwners(this.prisma, organizationId);
      if (owners <= 1) {
        throw new OrgAccessConflictError('The organization must have at least one active owner.');
      }
    }

    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.organizationMembership.update({
        where: { id: membershipId },
        data: { status },
        include: memberInclude,
      });
      await this.writeAudit(tx, organizationId, {
        adminId: actorAdminId,
        type: 'MEMBER_STATUS_CHANGED',
        entityType: 'membership',
        entityId: membershipId,
        metadata: { status },
      });
      return updated;
    });

    await this.invalidatePermissionCache(organizationId, membership.adminId);
    return this.toMemberRecord(row);
  }

  async updateMemberProfile(
    organizationId: string,
    membershipId: string,
    input: { displayName?: string; phone?: string | null },
    actorAdminId: string,
  ): Promise<OrgMemberRecord> {
    const membership = await this.loadMembershipOrThrow(organizationId, membershipId);
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
      await this.writeAudit(tx, organizationId, {
        adminId: actorAdminId,
        type: 'MEMBER_UPDATED',
        entityType: 'membership',
        entityId: membershipId,
      });
      return updated;
    });

    return this.toMemberRecord(row);
  }

  async resetMemberPassword(
    organizationId: string,
    membershipId: string,
    passwordHash: string,
    actorAdminId: string,
  ): Promise<void> {
    const membership = await this.loadMembershipOrThrow(organizationId, membershipId);
    if (membership.adminId === actorAdminId) {
      throw new OrgAccessForbiddenError('You cannot reset your own password from user management.');
    }

    const [targetAdmin, actorAdmin] = await Promise.all([
      this.prisma.platformAdmin.findUnique({
        where: { id: membership.adminId },
        select: { id: true, role: true, status: true },
      }),
      this.prisma.platformAdmin.findUnique({
        where: { id: actorAdminId },
        select: { role: true },
      }),
    ]);
    if (!targetAdmin || targetAdmin.status !== 'ACTIVE') {
      throw new OrgAccessNotFoundError('Member');
    }
    if (targetAdmin.role === 'SUPER_ADMIN' && actorAdmin?.role !== 'SUPER_ADMIN') {
      throw new OrgAccessForbiddenError('You cannot reset credentials for this account.');
    }

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
      await this.writeAudit(tx, organizationId, {
        adminId: actorAdminId,
        type: 'MEMBER_UPDATED',
        entityType: 'membership',
        entityId: membershipId,
        metadata: { passwordReset: true, targetAdminId: membership.adminId },
      });
    });
  }

  async provisionMember(
    organizationId: string,
    input: {
      email: string;
      displayName: string;
      phone?: string | null;
      passwordHash: string;
      totpSecretCiphertext: string;
      newAdminId: string;
      roleIds: readonly string[];
    },
    actorAdminId: string,
  ): Promise<OrgMemberRecord> {
    const email = this.normalizeEmail(input.email);
    const displayName = input.displayName.trim();
    if (!displayName) throw new OrgAccessValidationError('Display name is required.');
    const phone = normalizedLeadPhoneOrNull(input.phone ?? null);

    const roles = await this.assertRolesBelongToOrg(organizationId, input.roleIds);
    await this.assertActorCanGrantRoles(organizationId, actorAdminId, roles);

    const existingAdmin = await this.prisma.platformAdmin.findUnique({
      where: { email },
      select: { id: true, organizationId: true },
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
      if (existingAdmin.organizationId && existingAdmin.organizationId !== organizationId) {
        throw new OrgAccessConflictError('This email is already registered to another organization.');
      }
    }

    const isOwner = this.rolesIncludeOwner(roles);
    const now = new Date();
    const adminId = existingAdmin?.id ?? input.newAdminId;

    const row = await this.prisma.$transaction(async (tx) => {
      if (!existingAdmin) {
        await tx.platformAdmin.create({
          data: {
            id: adminId,
            email,
            displayName,
            phone,
            role: 'ORGANIZATION_MEMBER',
            status: 'ACTIVE',
            passwordHash: input.passwordHash,
            totpSecretCiphertext: input.totpSecretCiphertext,
            organizationId,
          },
        });
      } else {
        await tx.platformAdmin.update({
          where: { id: adminId },
          data: {
            displayName,
            phone,
            passwordHash: input.passwordHash,
            totpSecretCiphertext: input.totpSecretCiphertext,
            organizationId: existingAdmin.organizationId ?? organizationId,
            role: 'ORGANIZATION_MEMBER',
            status: 'ACTIVE',
          },
        });
      }

      const membershipId = randomUUID();
      const created = await tx.organizationMembership.create({
        data: {
          id: membershipId,
          organizationId,
          adminId,
          status: 'ACTIVE',
          isOwner,
          invitedByAdminId: actorAdminId,
          invitedAt: now,
          acceptedAt: now,
          roleLinks: { create: roles.map((role) => ({ roleId: role.id })) },
        },
        include: memberInclude,
      });

      await this.writeAudit(tx, organizationId, {
        adminId: actorAdminId,
        type: 'MEMBER_UPDATED',
        entityType: 'membership',
        entityId: membershipId,
        metadata: { email, roleIds: roles.map((role) => role.id) },
      });

      return created;
    });

    await this.invalidatePermissionCache(organizationId, adminId);
    return this.toMemberRecord(row);
  }

  async createInvitation(
    organizationId: string,
    input: { email: string; roleIds: readonly string[] },
    actorAdminId: string,
  ): Promise<{ invitationId: string; email: string; expiresAt: string; acceptToken: string }> {
    const email = this.normalizeEmail(input.email);
    const roles = await this.assertRolesBelongToOrg(organizationId, input.roleIds);
    await this.assertActorCanGrantRoles(organizationId, actorAdminId, roles);

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
    const tokenHash = this.hashToken(acceptToken);
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
      await this.writeAudit(tx, organizationId, {
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
    const tokenHash = this.hashToken(acceptToken);
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

    await this.prisma.$transaction(async (tx) => {
      await tx.organizationInvitation.update({
        where: { id: invitationId },
        data: { tokenHash, expiresAt, revokedAt: null },
      });
      await this.writeAudit(tx, organizationId, {
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
      await this.writeAudit(tx, organizationId, {
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
    const tokenHash = this.hashToken(input.acceptToken.trim());
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

      await this.writeAudit(tx, invitation.organizationId, {
        adminId: admin.id,
        type: 'MEMBER_INVITATION_ACCEPTED',
        entityType: 'invitation',
        entityId: invitation.id,
        metadata: { membershipId },
      });

      await this.invalidatePermissionCache(invitation.organizationId, admin.id);

      return { organizationId: invitation.organizationId, adminId: admin.id };
    });
  }
}
