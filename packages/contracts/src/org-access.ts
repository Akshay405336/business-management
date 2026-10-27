import { API_PREFIX } from './http.js';
import type { PermissionKey } from './permissions.js';

export const ORG_ACCESS_ROUTES = {
  summary: `${API_PREFIX}/org-access/summary`,
  members: `${API_PREFIX}/org-access/members`,
  member: (id: string) => `${API_PREFIX}/org-access/members/${id}`,
  memberRoles: (id: string) => `${API_PREFIX}/org-access/members/${id}/roles`,
  memberStatus: (id: string) => `${API_PREFIX}/org-access/members/${id}/status`,
  memberResetPassword: (id: string) => `${API_PREFIX}/org-access/members/${id}/reset-password`,
  invitations: `${API_PREFIX}/org-access/invitations`,
  invitation: (id: string) => `${API_PREFIX}/org-access/invitations/${id}`,
  invitationResend: (id: string) => `${API_PREFIX}/org-access/invitations/${id}/resend`,
  invitationRevoke: (id: string) => `${API_PREFIX}/org-access/invitations/${id}/revoke`,
  invitationAccept: `${API_PREFIX}/org-access/invitations/accept`,
  roles: `${API_PREFIX}/org-access/roles`,
  role: (id: string) => `${API_PREFIX}/org-access/roles/${id}`,
  rolePermissions: (id: string) => `${API_PREFIX}/org-access/roles/${id}/permissions`,
  permissions: `${API_PREFIX}/org-access/permissions`,
  myPermissions: `${API_PREFIX}/org-access/me/permissions`,
} as const;

export type OrganizationMembershipStatus =
  | 'ACTIVE'
  | 'INVITED'
  | 'SUSPENDED'
  | 'DEACTIVATED';

export type OrganizationInvitationStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';

export type OrganizationRoleStatus = 'ACTIVE' | 'INACTIVE';

export interface OrgMemberRoleSummary {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly isSystem: boolean;
}

export interface OrgMemberListItem {
  readonly membershipId: string;
  readonly adminId: string;
  readonly email: string;
  readonly displayName: string;
  readonly status: OrganizationMembershipStatus;
  readonly isOwner: boolean;
  readonly roles: readonly OrgMemberRoleSummary[];
  readonly employeeId: string | null;
  readonly employeeDisplayName: string | null;
  readonly phoneNumber: string | null;
  readonly joinedAt: string;
  readonly lastLoginAt: string | null;
}

export interface OrgMemberDetail extends OrgMemberListItem {
  readonly effectivePermissions: readonly PermissionKey[];
  readonly invitedAt: string | null;
  readonly acceptedAt: string | null;
  readonly updatedAt: string;
}

export interface OrgMemberListResponse {
  readonly items: readonly OrgMemberListItem[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface OrgAccessSummaryResponse {
  readonly activeMembers: number;
  readonly pendingInvitations: number;
  readonly suspendedMembers: number;
  readonly customRoles: number;
}

export interface OrgRoleListItem {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly description: string;
  readonly isSystem: boolean;
  readonly status: OrganizationRoleStatus;
  readonly memberCount: number;
  readonly permissionKeys: readonly PermissionKey[];
}

export interface OrgRoleDetail extends OrgRoleListItem {
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface OrgRoleListResponse {
  readonly items: readonly OrgRoleListItem[];
}

export interface PermissionCatalogItem {
  readonly key: PermissionKey;
  readonly module: string;
  readonly action: string;
  readonly description: string;
}

export interface PermissionCatalogResponse {
  readonly permissions: readonly PermissionCatalogItem[];
}

export interface MyPermissionsResponse {
  readonly permissions: readonly PermissionKey[];
}

export interface CreateInvitationResponse {
  readonly invitationId: string;
  readonly email: string;
  readonly expiresAt: string;
  /** Shown once; not stored in plaintext on the server. */
  readonly acceptToken: string;
}
