import type {
  OrgMemberDetail,
  OrgMemberListItem,
  OrgRoleListItem,
  PermissionKey,
} from '@techwin/contracts';
import type { OrgMemberRecord, OrgRoleRecord } from '../../../domain/repositories/org-access.repository.js';

export function toOrgMemberListItem(record: OrgMemberRecord): OrgMemberListItem {
  return {
    membershipId: record.membershipId,
    adminId: record.adminId,
    email: record.email,
    displayName: record.displayName,
    status: record.status,
    isOwner: record.isOwner,
    roles: record.roles.map((role) => ({
      id: role.id,
      key: role.key,
      name: role.name,
      isSystem: role.isSystem,
    })),
    employeeId: record.employeeId,
    employeeDisplayName: record.employeeDisplayName,
    phoneNumber: record.phoneNumber,
    joinedAt: record.joinedAt,
    lastLoginAt: record.lastLoginAt,
  };
}

export function toOrgMemberDetail(
  record: OrgMemberRecord,
  effectivePermissions: readonly PermissionKey[],
): OrgMemberDetail {
  return {
    ...toOrgMemberListItem(record),
    effectivePermissions: [...effectivePermissions],
    invitedAt: record.invitedAt,
    acceptedAt: record.acceptedAt,
    updatedAt: record.updatedAt,
  };
}

export function toOrgRoleListItem(record: OrgRoleRecord): OrgRoleListItem {
  return {
    id: record.id,
    key: record.key,
    name: record.name,
    description: record.description,
    isSystem: record.isSystem,
    status: record.status,
    memberCount: record.memberCount,
    permissionKeys: [...record.permissionKeys],
  };
}
