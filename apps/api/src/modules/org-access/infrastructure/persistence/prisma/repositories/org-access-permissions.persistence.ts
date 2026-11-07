import { PERMISSION_KEYS, SYSTEM_ROLE_KEYS, type PermissionKey } from '@techwin/contracts';
import { randomUUID } from 'node:crypto';
import { RedisService } from '../../../../../../infrastructure/cache/redis.service.js';
import { PrismaService } from '../../../../../../infrastructure/database/prisma.service.js';
import {
  OrgAccessConflictError,
  OrgAccessNotFoundError,
  OrgMembershipDeniedError,
} from '../../../../domain/errors/org-access.errors.js';
import {
  PERMISSION_CACHE_TTL_SECONDS,
  ensureOrganizationRoleBootstrap,
  ensureLinkedEmployeeMembershipRole,
  ensureOwnerMembershipRole,
  findRoleIdByKey,
  mergeSystemRoleDefaultPermissions,
  permissionCacheKey,
  resolveActiveMembershipRolesFromDb,
  resolvePermissionsFromDb,
  uniquePermissionKeys,
  type ActiveMembershipRoleSummary,
} from './org-access-persistence.shared.js';

export class OrgAccessPermissionsPersistence {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  resolveActiveMembershipRoles = async (
    organizationId: string,
    adminId: string,
  ): Promise<readonly ActiveMembershipRoleSummary[]> => {
    return resolveActiveMembershipRolesFromDb(this.prisma, organizationId, adminId);
  };

  resolveEffectivePermissions = async (
    organizationId: string,
    adminId: string,
    isPlatformSuperAdmin: boolean,
  ): Promise<readonly PermissionKey[]> => {
    if (isPlatformSuperAdmin) return PERMISSION_KEYS;

    const cacheKey = permissionCacheKey(organizationId, adminId);
    let cached: PermissionKey[] | null = null;
    try {
      const raw = await this.redis.client.get(cacheKey);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          cached = uniquePermissionKeys(parsed.filter((v) => typeof v === 'string'));
        }
      }
    } catch {
      cached = null;
    }

    const fromDb = await resolvePermissionsFromDb(this.prisma, organizationId, adminId);
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
  };

  async ensureOrganizationAccessBootstrap(organizationId: string, adminId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const roleIdsByKey = await ensureOrganizationRoleBootstrap(tx, organizationId);
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
            (await findRoleIdByKey(tx, organizationId, SYSTEM_ROLE_KEYS.owner));
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
        await mergeSystemRoleDefaultPermissions(tx, organizationId, [
          SYSTEM_ROLE_KEYS.owner,
          SYSTEM_ROLE_KEYS.admin,
          SYSTEM_ROLE_KEYS.employee,
          SYSTEM_ROLE_KEYS.member,
        ]);
        await ensureOwnerMembershipRole(tx, organizationId, adminId);
        await ensureLinkedEmployeeMembershipRole(tx, organizationId, adminId);
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
    await this.invalidatePermissionCache(organizationId);
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

  async invalidatePermissionCache(organizationId: string, adminId?: string): Promise<void> {
    try {
      if (adminId) {
        await this.redis.client.del(permissionCacheKey(organizationId, adminId));
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
}
