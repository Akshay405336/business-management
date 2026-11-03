import type {
  OrganizationMembershipStatus,
  OrganizationRoleStatus,
  PermissionKey,
  SystemRoleKey,
} from '../types/org-access.types.js';

export interface OrgMemberListFilters {
  readonly page: number;
  readonly pageSize: number;
  readonly search?: string;
  readonly status?: OrganizationMembershipStatus;
  readonly roleId?: string;
  readonly sortBy: 'displayName' | 'email' | 'joinedAt' | 'updatedAt';
  readonly sortDir: 'asc' | 'desc';
}

export interface OrgMemberRoleRecord {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly isSystem: boolean;
}

export interface OrgMemberRecord {
  readonly membershipId: string;
  readonly adminId: string;
  readonly email: string;
  readonly displayName: string;
  readonly status: OrganizationMembershipStatus;
  readonly isOwner: boolean;
  readonly roles: readonly OrgMemberRoleRecord[];
  readonly employeeId: string | null;
  readonly employeeDisplayName: string | null;
  readonly phoneNumber: string | null;
  readonly joinedAt: string;
  readonly invitedAt: string | null;
  readonly acceptedAt: string | null;
  readonly updatedAt: string;
  readonly lastLoginAt: string | null;
}

export interface PaginatedOrgMembers {
  readonly items: readonly OrgMemberRecord[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface OrgRoleRecord {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly description: string;
  readonly isSystem: boolean;
  readonly status: OrganizationRoleStatus;
  readonly memberCount: number;
  readonly pendingInvitationCount: number;
  readonly permissionKeys: readonly PermissionKey[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface OrgAccessSummary {
  readonly activeMembers: number;
  readonly pendingInvitations: number;
  readonly suspendedMembers: number;
  readonly customRoles: number;
}

/** Credentials and access prepared for a new sign-in account; hashes only, never plaintext. */
export interface PreparedMemberAccount {
  readonly adminId: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly totpSecretCiphertext: string;
  readonly roleIds: readonly string[];
  readonly isOwner: boolean;
}

export interface OrgMembershipRef {
  readonly membershipId: string;
  readonly status: OrganizationMembershipStatus;
}

export interface OrgAccessRepository {
  ensureOrganizationAccessBootstrap(organizationId: string, adminId: string): Promise<void>;
  assertActiveMembership(organizationId: string, adminId: string): Promise<void>;
  resolveEffectivePermissions(
    organizationId: string,
    adminId: string,
    isPlatformSuperAdmin: boolean,
  ): Promise<readonly PermissionKey[]>;
  invalidatePermissionCache(organizationId: string, adminId?: string): Promise<void>;
  listMembers(organizationId: string, filters: OrgMemberListFilters): Promise<PaginatedOrgMembers>;
  getMember(organizationId: string, membershipId: string): Promise<OrgMemberRecord | null>;
  getSummary(organizationId: string): Promise<OrgAccessSummary>;
  listRoles(organizationId: string): Promise<readonly OrgRoleRecord[]>;
  getRole(organizationId: string, roleId: string): Promise<OrgRoleRecord | null>;
  createRole(
    organizationId: string,
    input: {
      key: string;
      name: string;
      description: string;
      permissionKeys: readonly PermissionKey[];
    },
    actorAdminId: string,
  ): Promise<OrgRoleRecord>;
  updateRole(
    organizationId: string,
    roleId: string,
    input: { name?: string; description?: string; status?: OrganizationRoleStatus },
    actorAdminId: string,
  ): Promise<OrgRoleRecord>;
  setRolePermissions(
    organizationId: string,
    roleId: string,
    permissionKeys: readonly PermissionKey[],
    actorAdminId: string,
  ): Promise<OrgRoleRecord>;
  deleteRole(organizationId: string, roleId: string, actorAdminId: string): Promise<void>;
  getRoleDeletionImpact(
    organizationId: string,
    roleId: string,
  ): Promise<{
    readonly canDelete: boolean;
    readonly canDeactivate: boolean;
    readonly totalMemberAssignments: number;
    readonly activeMemberAssignments: number;
    readonly employeeLinkedAssignments: number;
    readonly pendingInvitationAssignments: number;
  }>;
  assignMemberRoles(
    organizationId: string,
    membershipId: string,
    roleIds: readonly string[],
    actorAdminId: string,
  ): Promise<OrgMemberRecord>;
  changeMemberStatus(
    organizationId: string,
    membershipId: string,
    status: OrganizationMembershipStatus,
    actorAdminId: string,
  ): Promise<OrgMemberRecord>;
  updateMemberProfile(
    organizationId: string,
    membershipId: string,
    input: { displayName?: string; phone?: string | null },
    actorAdminId: string,
  ): Promise<OrgMemberRecord>;
  resetMemberPassword(
    organizationId: string,
    membershipId: string,
    passwordHash: string,
    actorAdminId: string,
  ): Promise<void>;
  /**
   * Validates that a new sign-in account can be created for `email` with `roleIds`:
   * the email has no account yet, the roles are active roles of this organization, and
   * the actor already holds every permission those roles grant.
   */
  assertMemberAccountAvailable(
    organizationId: string,
    input: { email: string; roleIds: readonly string[] },
    actorAdminId: string,
  ): Promise<{ isOwner: boolean }>;
  /**
   * Same protections as other privileged member operations: never the actor's own account,
   * never a platform super admin, and only members whose permissions the actor fully holds.
   */
  assertActorCanRemoveMemberAccount(
    organizationId: string,
    actorAdminId: string,
    targetAdminId: string,
  ): Promise<void>;
  /** System role with `key`, configured from the role templates if the organization lacks it. */
  resolveSystemRoleId(organizationId: string, key: SystemRoleKey): Promise<string>;
  /** Permanently removes a membership and, when exclusive, its sign-in account. */
  deleteMember(
    organizationId: string,
    membershipId: string,
    actorAdminId: string,
  ): Promise<void>;
  /** Existing member of this organization with `email` and no linked employee record. */
  findLinkableMemberAdminId(organizationId: string, email: string): Promise<string | null>;
  findMembershipByAdmin(organizationId: string, adminId: string): Promise<OrgMembershipRef | null>;
  provisionMember(
    organizationId: string,
    input: {
      displayName: string;
      phone?: string | null;
      account: PreparedMemberAccount;
    },
    actorAdminId: string,
  ): Promise<OrgMemberRecord>;
  createInvitation(
    organizationId: string,
    input: { email: string; roleIds: readonly string[] },
    actorAdminId: string,
  ): Promise<{ invitationId: string; email: string; expiresAt: string; acceptToken: string }>;
  revokeInvitation(organizationId: string, invitationId: string, actorAdminId: string): Promise<void>;
  resendInvitation(
    organizationId: string,
    invitationId: string,
    actorAdminId: string,
  ): Promise<{ invitationId: string; email: string; expiresAt: string; acceptToken: string }>;
  acceptInvitation(input: {
    acceptToken: string;
    displayName: string;
    passwordHash: string;
    totpSecretCiphertext: string;
    newAdminId: string;
  }): Promise<{ organizationId: string; adminId: string }>;
}

export const ORG_ACCESS_REPOSITORY = Symbol('ORG_ACCESS_REPOSITORY');
