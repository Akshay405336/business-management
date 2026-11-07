import {
  EMPLOYEE_PORTAL_PERMISSIONS,
  IMMUTABLE_ORG_ROLE_KEYS,
  isPermissionKey,
  PERMISSION_KEYS,
  PROTECTED_SYSTEM_ROLE_KEYS,
  SYSTEM_ROLE_KEYS,
  type PermissionKey,
} from '@techwin/contracts';
import { createHash, randomUUID } from 'node:crypto';
import { Prisma, type CrmAuditEventType } from '../../../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../../../infrastructure/database/prisma.service.js';
import { DEFAULT_SYSTEM_ROLES } from '../../constants/default-system-roles.js';
import {
  OrgAccessConflictError,
  OrgAccessForbiddenError,
  OrgAccessNotFoundError,
  OrgAccessValidationError,
} from '../../../../domain/errors/org-access.errors.js';
import type { OrgMemberRecord, OrgRoleRecord } from '../../../../domain/repositories/org-access.repository.js';

export const PERMISSION_CACHE_TTL_SECONDS = 300;
export const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const memberInclude = {
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

export type MembershipRow = Prisma.OrganizationMembershipGetPayload<{ include: typeof memberInclude }>;

export type RoleWithPermissions = Prisma.OrganizationRoleGetPayload<{
  include: { permissions: true; _count: { select: { memberships: true } } };
}>;

export type ResolveEffectivePermissionsFn = (
  organizationId: string,
  adminId: string,
  isPlatformSuperAdmin: boolean,
) => Promise<readonly PermissionKey[]>;

export function permissionCacheKey(organizationId: string, adminId: string): string {
  return `org-access:perm:${organizationId}:${adminId}`;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function uniquePermissionKeys(keys: readonly string[]): PermissionKey[] {
  const seen = new Set<PermissionKey>();
  for (const key of keys) {
    if (isPermissionKey(key)) seen.add(key);
  }
  return [...seen].sort();
}

export async function writeAudit(
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

export function toMemberRecord(row: MembershipRow): OrgMemberRecord {
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

export function toRoleRecord(
  row: RoleWithPermissions,
  pendingInvitationCount = 0,
): OrgRoleRecord {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    isSystem: row.isSystem,
    status: row.status,
    memberCount: row._count.memberships,
    pendingInvitationCount,
    permissionKeys: uniquePermissionKeys(row.permissions.map((p) => p.permissionKey)),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function roleInclude() {
  return {
    permissions: true,
    _count: { select: { memberships: true } },
  } as const;
}

export async function syncSystemRolePermissions(
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

async function upsertSystemRoleTemplate(
  tx: Pick<PrismaService, 'organizationRole' | 'organizationRolePermission'>,
  organizationId: string,
  template: (typeof DEFAULT_SYSTEM_ROLES)[number],
  keyToId: Map<string, string>,
  customRoleKeys: ReadonlySet<string>,
): Promise<void> {
  if (customRoleKeys.has(template.key)) return;
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
  await syncSystemRolePermissions(tx, roleId, template.permissions);
}

/** Creates every default system role when the organization has none yet (initial tenant setup). */
export async function ensureSystemRoles(
  tx: Pick<PrismaService, 'organizationRole' | 'organizationRolePermission'>,
  organizationId: string,
): Promise<Map<string, string>> {
  const existing = await tx.organizationRole.findMany({
    where: { organizationId },
    select: { id: true, key: true, isSystem: true },
  });
  const keyToId = new Map(existing.map((row) => [row.key, row.id]));
  const customRoleKeys = new Set(existing.filter((row) => !row.isSystem).map((row) => row.key));

  for (const template of DEFAULT_SYSTEM_ROLES) {
    await upsertSystemRoleTemplate(tx, organizationId, template, keyToId, customRoleKeys);
  }

  return keyToId;
}

/**
 * Ensures immutable system roles (Owner, Admin) exist. Does not recreate roles an administrator deleted.
 */
export async function ensureProtectedSystemRoles(
  tx: Pick<PrismaService, 'organizationRole' | 'organizationRolePermission'>,
  organizationId: string,
): Promise<Map<string, string>> {
  const existing = await tx.organizationRole.findMany({
    where: { organizationId },
    select: { id: true, key: true, isSystem: true },
  });
  const keyToId = new Map(existing.map((row) => [row.key, row.id]));
  const customRoleKeys = new Set(existing.filter((row) => !row.isSystem).map((row) => row.key));
  const protectedTemplates = DEFAULT_SYSTEM_ROLES.filter((template) =>
    IMMUTABLE_ORG_ROLE_KEYS.has(template.key),
  );
  for (const template of protectedTemplates) {
    await upsertSystemRoleTemplate(tx, organizationId, template, keyToId, customRoleKeys);
  }
  return keyToId;
}

/** Ensures a single system role template exists (for employee assignment and similar flows). */
export async function ensureSystemRoleByKey(
  tx: Pick<PrismaService, 'organizationRole' | 'organizationRolePermission'>,
  organizationId: string,
  key: string,
): Promise<string> {
  const existing = await tx.organizationRole.findMany({
    where: { organizationId },
    select: { id: true, key: true, isSystem: true },
  });
  const keyToId = new Map(existing.map((row) => [row.key, row.id]));
  const customRoleKeys = new Set(existing.filter((row) => !row.isSystem).map((row) => row.key));
  const template = DEFAULT_SYSTEM_ROLES.find((row) => row.key === key);
  if (!template) {
    throw new OrgAccessValidationError(`Unknown system role key: ${key}`);
  }
  await upsertSystemRoleTemplate(tx, organizationId, template, keyToId, customRoleKeys);
  const roleId = keyToId.get(key);
  if (!roleId) {
    throw new OrgAccessConflictError(
      `The ${key} system role cannot be configured because a custom role already uses its key.`,
    );
  }
  return roleId;
}

/** First org access creates all defaults; later requests only restore protected Owner/Admin roles. */
export async function ensureOrganizationRoleBootstrap(
  tx: Pick<PrismaService, 'organizationRole' | 'organizationRolePermission'>,
  organizationId: string,
): Promise<Map<string, string>> {
  const roleCount = await tx.organizationRole.count({ where: { organizationId } });
  if (roleCount === 0) {
    const map = await ensureSystemRoles(tx, organizationId);
    return map;
  }
  const map = await ensureProtectedSystemRoles(tx, organizationId);
  await ensureSystemRoleByKey(tx, organizationId, SYSTEM_ROLE_KEYS.employee);
  await mergeSystemRoleDefaultPermissions(tx, organizationId, [
    SYSTEM_ROLE_KEYS.owner,
    SYSTEM_ROLE_KEYS.admin,
    SYSTEM_ROLE_KEYS.employee,
    SYSTEM_ROLE_KEYS.member,
  ]);
  return map;
}

/**
 * Employee portal accounts must hold the Employee system role. Restores the link when the role
 * was removed or the system role was recreated after deletion.
 */
/** Restores Owner system role on memberships flagged as organization owner. */
export async function ensureOwnerMembershipRole(
  tx: Pick<
    PrismaService,
    'organizationMembership' | 'organizationMembershipRole' | 'organizationRole' | 'organizationRolePermission'
  >,
  organizationId: string,
  adminId: string,
): Promise<boolean> {
  const membership = await tx.organizationMembership.findUnique({
    where: { organizationId_adminId: { organizationId, adminId } },
    select: { id: true, isOwner: true, roleLinks: { select: { roleId: true } } },
  });
  if (!membership?.isOwner) return false;

  const ownerRoleId = await ensureSystemRoleByKey(tx, organizationId, SYSTEM_ROLE_KEYS.owner);
  const hasOwnerRole = membership.roleLinks.some((link) => link.roleId === ownerRoleId);
  if (hasOwnerRole) return false;

  await tx.organizationMembershipRole.create({
    data: { membershipId: membership.id, roleId: ownerRoleId },
  });
  return true;
}

export async function ensureLinkedEmployeeMembershipRole(
  tx: Pick<
    PrismaService,
    | 'employee'
    | 'platformAdmin'
    | 'organizationMembership'
    | 'organizationMembershipRole'
    | 'organizationRole'
    | 'organizationRolePermission'
  >,
  organizationId: string,
  adminId: string,
): Promise<boolean> {
  const admin = await tx.platformAdmin.findUnique({
    where: { id: adminId },
    select: { email: true },
  });
  const adminEmail = admin?.email.trim() ?? '';
  const employee = await tx.employee.findFirst({
    where: {
      organizationId,
      employmentStatus: 'ACTIVE',
      deactivatedAt: null,
      OR: [
        { platformAdminId: adminId },
        ...(adminEmail.length > 0
          ? [{ workEmail: { equals: adminEmail, mode: 'insensitive' as const } }]
          : []),
      ],
    },
    select: { id: true },
  });
  if (!employee) return false;

  const employeeRoleId = await ensureSystemRoleByKey(tx, organizationId, SYSTEM_ROLE_KEYS.employee);
  const membership = await tx.organizationMembership.findUnique({
    where: { organizationId_adminId: { organizationId, adminId } },
    select: { id: true, roleLinks: { select: { roleId: true } } },
  });
  if (!membership) return false;

  const hasEmployeeRole = membership.roleLinks.some((link) => link.roleId === employeeRoleId);
  if (hasEmployeeRole) return false;

  await tx.organizationMembershipRole.create({
    data: { membershipId: membership.id, roleId: employeeRoleId },
  });
  return true;
}

/** Adds missing template permissions to system roles without removing administrator changes. */
export async function mergeSystemRoleDefaultPermissions(
  tx: Pick<PrismaService, 'organizationRole' | 'organizationRolePermission'>,
  organizationId: string,
  roleKeys: readonly string[],
): Promise<void> {
  for (const roleKey of roleKeys) {
    const template = DEFAULT_SYSTEM_ROLES.find((row) => row.key === roleKey);
    if (!template) continue;
    const role = await tx.organizationRole.findFirst({
      where: { organizationId, key: roleKey, isSystem: true },
      select: { id: true },
    });
    if (!role) continue;
    const existing = await tx.organizationRolePermission.findMany({
      where: { roleId: role.id },
      select: { permissionKey: true },
    });
    const granted = new Set(existing.map((row) => row.permissionKey));
    const missing = template.permissions.filter((key) => !granted.has(key));
    if (missing.length === 0) continue;
    await tx.organizationRolePermission.createMany({
      data: missing.map((permissionKey) => ({ roleId: role.id, permissionKey })),
      skipDuplicates: true,
    });
  }
}

export async function findRoleIdByKey(
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

export async function countActiveOwners(
  tx: Pick<PrismaService, 'organizationMembership'>,
  organizationId: string,
): Promise<number> {
  return tx.organizationMembership.count({
    where: { organizationId, isOwner: true, status: 'ACTIVE' },
  });
}

export async function loadMembershipOrThrow(
  prisma: Pick<PrismaService, 'organizationMembership'>,
  organizationId: string,
  membershipId: string,
): Promise<MembershipRow> {
  const row = await prisma.organizationMembership.findFirst({
    where: { id: membershipId, organizationId },
    include: memberInclude,
  });
  if (!row) throw new OrgAccessNotFoundError('Member');
  return row;
}

export async function loadRoleOrThrow(
  prisma: Pick<PrismaService, 'organizationRole'>,
  organizationId: string,
  roleId: string,
): Promise<RoleWithPermissions> {
  const row = await prisma.organizationRole.findFirst({
    where: { id: roleId, organizationId },
    include: roleInclude(),
  });
  if (!row) throw new OrgAccessNotFoundError('Role');
  return row;
}

export async function assertActorIsOwner(
  prisma: Pick<PrismaService, 'organizationMembership'>,
  organizationId: string,
  actorAdminId: string,
): Promise<void> {
  const actor = await prisma.organizationMembership.findFirst({
    where: { organizationId, adminId: actorAdminId, status: 'ACTIVE' },
    select: { isOwner: true },
  });
  if (!actor?.isOwner) {
    throw new OrgAccessForbiddenError('Only organization owners can manage the owner role.');
  }
}

export async function assertRolesBelongToOrg(
  prisma: Pick<PrismaService, 'organizationRole'>,
  organizationId: string,
  roleIds: readonly string[],
): Promise<RoleWithPermissions[]> {
  if (roleIds.length === 0) return [];
  const uniqueIds = [...new Set(roleIds)];
  const rows = await prisma.organizationRole.findMany({
    where: { id: { in: uniqueIds }, organizationId },
    include: roleInclude(),
  });
  if (rows.length !== uniqueIds.length) {
    throw new OrgAccessValidationError('One or more roles are invalid for this organization.');
  }
  return rows;
}

export async function assertRolesAssignable(
  prisma: Pick<PrismaService, 'organizationRole'>,
  organizationId: string,
  roleIds: readonly string[],
): Promise<RoleWithPermissions[]> {
  const roles = await assertRolesBelongToOrg(prisma, organizationId, roleIds);
  if (roles.some((role) => role.status !== 'ACTIVE')) {
    throw new OrgAccessValidationError('Inactive roles cannot be assigned.', [
      { path: 'roleIds', message: 'Inactive roles cannot be assigned.' },
    ]);
  }
  return roles;
}

export function rolesIncludeOwner(roles: readonly { key: string }[]): boolean {
  return roles.some((role) => role.key === SYSTEM_ROLE_KEYS.owner);
}

export function assertOrgRoleMutable(role: { readonly key: string }, action: 'modify' | 'delete'): void {
  if (!IMMUTABLE_ORG_ROLE_KEYS.has(role.key)) return;
  if (role.key === SYSTEM_ROLE_KEYS.admin) {
    throw new OrgAccessForbiddenError(
      action === 'delete'
        ? 'The Admin role is protected and cannot be deleted.'
        : 'The Admin role is protected and cannot be modified or deactivated.',
    );
  }
  throw new OrgAccessForbiddenError(
    action === 'delete'
      ? 'The Owner role is protected and cannot be deleted.'
      : 'The Owner role is protected and cannot be modified or deactivated.',
  );
}

export type ActiveMembershipRoleSummary = {
  readonly id: string;
  readonly key: string;
  readonly name: string;
};

export async function resolveActiveMembershipRolesFromDb(
  prisma: Pick<PrismaService, 'organizationMembership'>,
  organizationId: string,
  adminId: string,
): Promise<readonly ActiveMembershipRoleSummary[]> {
  const membership = await prisma.organizationMembership.findFirst({
    where: { organizationId, adminId, status: 'ACTIVE' },
    include: {
      roleLinks: {
        include: {
          role: { select: { id: true, key: true, name: true, status: true } },
        },
      },
    },
  });
  if (!membership) return [];

  const activeRoles = membership.roleLinks
    .filter((link) => link.role.status === 'ACTIVE')
    .map((link) => ({
      id: link.role.id,
      key: link.role.key,
      name: link.role.name,
    }));

  if (activeRoles.length === 0 && membership.isOwner) {
    return [
      {
        id: SYSTEM_ROLE_KEYS.owner,
        key: SYSTEM_ROLE_KEYS.owner,
        name: 'Owner',
      },
    ];
  }

  return activeRoles;
}

export async function resolvePermissionsFromDb(
  prisma: Pick<PrismaService, 'organizationMembership' | 'employee'>,
  organizationId: string,
  adminId: string,
): Promise<PermissionKey[]> {
  const membership = await prisma.organizationMembership.findFirst({
    where: { organizationId, adminId, status: 'ACTIVE' },
    include: {
      admin: { select: { email: true } },
      roleLinks: {
        include: {
          role: { include: { permissions: true } },
        },
      },
    },
  });
  if (!membership) return [];

  if (membership.isOwner) {
    return uniquePermissionKeys([...PERMISSION_KEYS]);
  }

  const keys: string[] = [];
  let hasEmployeeSystemRole = false;
  for (const link of membership.roleLinks) {
    if (link.role.status !== 'ACTIVE') continue;
    if (link.role.key === SYSTEM_ROLE_KEYS.employee) {
      hasEmployeeSystemRole = true;
    }
    for (const permission of link.role.permissions) {
      keys.push(permission.permissionKey);
    }
  }

  const adminEmail = membership.admin.email.trim();
  const linkedEmployee = await prisma.employee.findFirst({
    where: {
      organizationId,
      employmentStatus: 'ACTIVE',
      deactivatedAt: null,
      OR: [
        { platformAdminId: adminId },
        ...(adminEmail.length > 0
          ? [{ workEmail: { equals: adminEmail, mode: 'insensitive' as const } }]
          : []),
      ],
    },
    select: { id: true },
  });

  if (hasEmployeeSystemRole || linkedEmployee) {
    keys.push(...EMPLOYEE_PORTAL_PERMISSIONS);
  }

  return uniquePermissionKeys(keys);
}

export async function assertActorCanGrantRoles(
  prisma: Pick<PrismaService, 'platformAdmin' | 'organizationMembership'>,
  resolveEffectivePermissions: ResolveEffectivePermissionsFn,
  organizationId: string,
  actorAdminId: string,
  roles: readonly RoleWithPermissions[],
): Promise<void> {
  const actor = await prisma.platformAdmin.findUnique({
    where: { id: actorAdminId },
    select: { role: true },
  });
  if (actor?.role === 'SUPER_ADMIN') return;

  if (rolesIncludeOwner(roles)) {
    await assertActorIsOwner(prisma, organizationId, actorAdminId);
  }

  const actorPermissions = new Set(
    await resolveEffectivePermissions(organizationId, actorAdminId, false),
  );

  for (const role of roles) {
    if (PROTECTED_SYSTEM_ROLE_KEYS.has(role.key) && role.key === SYSTEM_ROLE_KEYS.owner) {
      await assertActorIsOwner(prisma, organizationId, actorAdminId);
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

export async function assertActorHoldsPermissions(
  prisma: Pick<PrismaService, 'platformAdmin'>,
  resolveEffectivePermissions: ResolveEffectivePermissionsFn,
  organizationId: string,
  actorAdminId: string,
  permissionKeys: readonly string[],
  message: string,
): Promise<void> {
  if (permissionKeys.length === 0) return;
  const actor = await prisma.platformAdmin.findUnique({
    where: { id: actorAdminId },
    select: { role: true },
  });
  if (actor?.role === 'SUPER_ADMIN') return;
  const actorPermissions = new Set<string>(
    await resolveEffectivePermissions(organizationId, actorAdminId, false),
  );
  if (permissionKeys.some((key) => !actorPermissions.has(key))) {
    throw new OrgAccessForbiddenError(message);
  }
}

export async function assertActorCanManageMember(
  prisma: Pick<PrismaService, 'platformAdmin' | 'organizationMembership' | 'organizationRolePermission'>,
  resolveEffectivePermissions: ResolveEffectivePermissionsFn,
  organizationId: string,
  actorAdminId: string,
  target: MembershipRow,
): Promise<void> {
  const actor = await prisma.platformAdmin.findUnique({
    where: { id: actorAdminId },
    select: { role: true },
  });
  if (actor?.role === 'SUPER_ADMIN') return;
  if (target.admin.role === 'SUPER_ADMIN') {
    throw new OrgAccessForbiddenError('You cannot manage this account.');
  }
  if (target.isOwner) await assertActorIsOwner(prisma, organizationId, actorAdminId);

  const targetRoleIds = target.roleLinks
    .filter((link) => link.role.status === 'ACTIVE')
    .map((link) => link.role.id);
  if (targetRoleIds.length === 0) return;
  const [actorPermissions, targetPermissions] = await Promise.all([
    resolveEffectivePermissions(organizationId, actorAdminId, false),
    prisma.organizationRolePermission.findMany({
      where: { roleId: { in: targetRoleIds } },
      select: { permissionKey: true },
    }),
  ]);
  const granted = new Set<string>(actorPermissions);
  if (targetPermissions.some((row) => !granted.has(row.permissionKey))) {
    throw new OrgAccessForbiddenError(
      'You cannot manage a member who has permissions you do not have.',
    );
  }
}
