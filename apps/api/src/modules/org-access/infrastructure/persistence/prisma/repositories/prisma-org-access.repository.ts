import { Injectable } from '@nestjs/common';
import type { PermissionKey } from '@techwin/contracts';
import { RedisService } from '../../../../../../infrastructure/cache/redis.service.js';
import { PrismaService } from '../../../../../../infrastructure/database/prisma.service.js';
import type {
  OrgAccessRepository,
  OrgAccessSummary,
  OrgMemberListFilters,
  OrgMemberRecord,
  OrgMembershipRef,
  OrgRoleRecord,
  PaginatedOrgMembers,
  PreparedMemberAccount,
} from '../../../../domain/repositories/org-access.repository.js';
import type {
  OrganizationMembershipStatus,
  OrganizationRoleStatus,
  SystemRoleKey,
} from '../../../../domain/types/org-access.types.js';
import { OrgAccessInvitationsPersistence } from './org-access-invitations.persistence.js';
import { OrgAccessMembersPersistence } from './org-access-members.persistence.js';
import { OrgAccessPermissionsPersistence } from './org-access-permissions.persistence.js';
import { OrgAccessRolesPersistence } from './org-access-roles.persistence.js';

@Injectable()
export class PrismaOrgAccessRepository implements OrgAccessRepository {
  private readonly permissions: OrgAccessPermissionsPersistence;
  private readonly members: OrgAccessMembersPersistence;
  private readonly roles: OrgAccessRolesPersistence;
  private readonly invitations: OrgAccessInvitationsPersistence;

  constructor(prisma: PrismaService, redis: RedisService) {
    this.permissions = new OrgAccessPermissionsPersistence(prisma, redis);
    this.members = new OrgAccessMembersPersistence(prisma, this.permissions);
    this.roles = new OrgAccessRolesPersistence(prisma, this.permissions);
    this.invitations = new OrgAccessInvitationsPersistence(prisma, this.permissions);
  }

  ensureOrganizationAccessBootstrap(organizationId: string, adminId: string): Promise<void> {
    return this.permissions.ensureOrganizationAccessBootstrap(organizationId, adminId);
  }

  assertActiveMembership(organizationId: string, adminId: string): Promise<void> {
    return this.permissions.assertActiveMembership(organizationId, adminId);
  }

  resolveEffectivePermissions(
    organizationId: string,
    adminId: string,
    isPlatformSuperAdmin: boolean,
  ): Promise<readonly PermissionKey[]> {
    return this.permissions.resolveEffectivePermissions(
      organizationId,
      adminId,
      isPlatformSuperAdmin,
    );
  }

  invalidatePermissionCache(organizationId: string, adminId?: string): Promise<void> {
    return this.permissions.invalidatePermissionCache(organizationId, adminId);
  }

  listMembers(organizationId: string, filters: OrgMemberListFilters): Promise<PaginatedOrgMembers> {
    return this.members.listMembers(organizationId, filters);
  }

  getMember(organizationId: string, membershipId: string): Promise<OrgMemberRecord | null> {
    return this.members.getMember(organizationId, membershipId);
  }

  getSummary(organizationId: string): Promise<OrgAccessSummary> {
    return this.members.getSummary(organizationId);
  }

  listRoles(organizationId: string): Promise<readonly OrgRoleRecord[]> {
    return this.roles.listRoles(organizationId);
  }

  getRole(organizationId: string, roleId: string): Promise<OrgRoleRecord | null> {
    return this.roles.getRole(organizationId, roleId);
  }

  createRole(
    organizationId: string,
    input: {
      key: string;
      name: string;
      description: string;
      permissionKeys: readonly PermissionKey[];
    },
    actorAdminId: string,
  ): Promise<OrgRoleRecord> {
    return this.roles.createRole(organizationId, input, actorAdminId);
  }

  updateRole(
    organizationId: string,
    roleId: string,
    input: { name?: string; description?: string; status?: OrganizationRoleStatus },
    actorAdminId: string,
  ): Promise<OrgRoleRecord> {
    return this.roles.updateRole(organizationId, roleId, input, actorAdminId);
  }

  setRolePermissions(
    organizationId: string,
    roleId: string,
    permissionKeys: readonly PermissionKey[],
    actorAdminId: string,
  ): Promise<OrgRoleRecord> {
    return this.roles.setRolePermissions(organizationId, roleId, permissionKeys, actorAdminId);
  }

  deleteRole(organizationId: string, roleId: string, actorAdminId: string): Promise<void> {
    return this.roles.deleteRole(organizationId, roleId, actorAdminId);
  }

  getRoleDeletionImpact(organizationId: string, roleId: string) {
    return this.roles.getRoleDeletionImpact(organizationId, roleId);
  }

  assignMemberRoles(
    organizationId: string,
    membershipId: string,
    roleIds: readonly string[],
    actorAdminId: string,
  ): Promise<OrgMemberRecord> {
    return this.members.assignMemberRoles(organizationId, membershipId, roleIds, actorAdminId);
  }

  changeMemberStatus(
    organizationId: string,
    membershipId: string,
    status: OrganizationMembershipStatus,
    actorAdminId: string,
  ): Promise<OrgMemberRecord> {
    return this.members.changeMemberStatus(organizationId, membershipId, status, actorAdminId);
  }

  updateMemberProfile(
    organizationId: string,
    membershipId: string,
    input: { displayName?: string; phone?: string | null },
    actorAdminId: string,
  ): Promise<OrgMemberRecord> {
    return this.members.updateMemberProfile(organizationId, membershipId, input, actorAdminId);
  }

  resetMemberPassword(
    organizationId: string,
    membershipId: string,
    passwordHash: string,
    actorAdminId: string,
  ): Promise<void> {
    return this.members.resetMemberPassword(organizationId, membershipId, passwordHash, actorAdminId);
  }

  assertMemberAccountAvailable(
    organizationId: string,
    input: { email: string; roleIds: readonly string[] },
    actorAdminId: string,
  ): Promise<{ isOwner: boolean }> {
    return this.members.assertMemberAccountAvailable(organizationId, input, actorAdminId);
  }

  assertActorCanRemoveMemberAccount(
    organizationId: string,
    actorAdminId: string,
    targetAdminId: string,
  ): Promise<void> {
    return this.members.assertActorCanRemoveMemberAccount(organizationId, actorAdminId, targetAdminId);
  }

  resolveSystemRoleId(organizationId: string, key: SystemRoleKey): Promise<string> {
    return this.members.resolveSystemRoleId(organizationId, key);
  }

  deleteMember(organizationId: string, membershipId: string, actorAdminId: string): Promise<void> {
    return this.members.deleteMember(organizationId, membershipId, actorAdminId);
  }

  findLinkableMemberAdminId(organizationId: string, email: string): Promise<string | null> {
    return this.members.findLinkableMemberAdminId(organizationId, email);
  }

  findMembershipByAdmin(organizationId: string, adminId: string): Promise<OrgMembershipRef | null> {
    return this.members.findMembershipByAdmin(organizationId, adminId);
  }

  provisionMember(
    organizationId: string,
    input: {
      displayName: string;
      phone?: string | null;
      account: PreparedMemberAccount;
      employeeId?: string;
    },
    actorAdminId: string,
  ): Promise<OrgMemberRecord> {
    return this.members.provisionMember(organizationId, input, actorAdminId);
  }

  createInvitation(
    organizationId: string,
    input: { email: string; roleIds: readonly string[] },
    actorAdminId: string,
  ): Promise<{ invitationId: string; email: string; expiresAt: string; acceptToken: string }> {
    return this.invitations.createInvitation(organizationId, input, actorAdminId);
  }

  revokeInvitation(organizationId: string, invitationId: string, actorAdminId: string): Promise<void> {
    return this.invitations.revokeInvitation(organizationId, invitationId, actorAdminId);
  }

  resendInvitation(
    organizationId: string,
    invitationId: string,
    actorAdminId: string,
  ): Promise<{ invitationId: string; email: string; expiresAt: string; acceptToken: string }> {
    return this.invitations.resendInvitation(organizationId, invitationId, actorAdminId);
  }

  acceptInvitation(input: {
    acceptToken: string;
    displayName: string;
    passwordHash: string;
    totpSecretCiphertext: string;
    newAdminId: string;
  }): Promise<{ organizationId: string; adminId: string }> {
    return this.invitations.acceptInvitation(input);
  }
}
