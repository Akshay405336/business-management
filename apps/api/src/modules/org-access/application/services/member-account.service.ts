import { Inject, Injectable } from '@nestjs/common';
import { SYSTEM_ROLE_KEYS } from '@techwin/contracts';
import { randomUUID } from 'node:crypto';
import {
  PASSWORD_HASHER,
  TOTP_SECRET_GENERATOR,
  type PasswordHasher,
  type TotpSecretGenerator,
} from '../../../../infrastructure/security/security.contracts.js';
import {
  PLATFORM_TOTP_SECRET_PROTECTOR,
  type PlatformTotpSecretProtector,
  PlatformTotpSecret,
} from '../../../auth/index.js';
import {
  ORG_ACCESS_REPOSITORY,
  type OrgAccessRepository,
  type PreparedMemberAccount,
} from '../../domain/repositories/org-access.repository.js';
import type { OrgAccessActor } from '../shared/org-access-actor.js';
import { PermissionCheckerService } from './permission-checker.service.js';

/**
 * Single place that turns sign-in details into a stored account: validation of email,
 * roles and privilege escalation, plus password hashing and the encrypted TOTP secret.
 */
@Injectable()
export class MemberAccountService {
  constructor(
    @Inject(ORG_ACCESS_REPOSITORY) private readonly repository: OrgAccessRepository,
    @Inject(PermissionCheckerService) private readonly permissions: PermissionCheckerService,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(TOTP_SECRET_GENERATOR) private readonly totpSecrets: TotpSecretGenerator,
    @Inject(PLATFORM_TOTP_SECRET_PROTECTOR)
    private readonly secretProtector: PlatformTotpSecretProtector,
  ) {}

  async prepareNewAccount(input: {
    readonly organizationId: string;
    readonly actorAdminId: string;
    readonly email: string;
    readonly password: string;
    readonly roleIds: readonly string[];
  }): Promise<PreparedMemberAccount> {
    const { isOwner } = await this.repository.assertMemberAccountAvailable(
      input.organizationId,
      { email: input.email, roleIds: input.roleIds },
      input.actorAdminId,
    );
    const adminId = randomUUID();
    const passwordHash = await this.passwordHasher.hash(input.password);
    const secret = PlatformTotpSecret.create(this.totpSecrets.generateSecret());
    return {
      adminId,
      email: input.email.trim().toLowerCase(),
      passwordHash,
      totpSecretCiphertext: this.secretProtector.protect(adminId, secret),
      roleIds: [...new Set(input.roleIds)],
      isOwner,
    };
  }

  /**
   * Accounts created from Employee Management always get the system Employee role; the
   * usual grant checks still apply, so the creator must hold every permission it carries.
   */
  async prepareEmployeeAccount(input: {
    readonly organizationId: string;
    readonly actorAdminId: string;
    readonly email: string;
    readonly password: string;
  }): Promise<PreparedMemberAccount> {
    const roleId = await this.repository.resolveSystemRoleId(
      input.organizationId,
      SYSTEM_ROLE_KEYS.employee,
    );
    return this.prepareNewAccount({ ...input, roleIds: [roleId] });
  }

  /** Same permissions as the member provisioning endpoint. */
  assertCanCreateAccounts(actor: OrgAccessActor): Promise<void> {
    return this.permissions.requirePermissions(actor, ['users.create', 'memberships.manage']);
  }

  /**
   * Deleting a sign-in account is a user-administration operation: it needs the same
   * permission as deactivating members plus the usual member protections.
   */
  async assertCanDeleteAccount(actor: OrgAccessActor, adminId: string): Promise<void> {
    await this.permissions.requirePermissions(actor, ['users.deactivate', 'memberships.manage']);
    await this.repository.assertActorCanRemoveMemberAccount(
      actor.organizationId,
      actor.adminId,
      adminId,
    );
  }

  invalidateAccess(organizationId: string, adminId: string): Promise<void> {
    return this.repository.invalidatePermissionCache(organizationId, adminId);
  }

  findLinkableMemberAdminId(organizationId: string, email: string): Promise<string | null> {
    return this.repository.findLinkableMemberAdminId(organizationId, email);
  }

  /**
   * Keeps the linked sign-in account in step with employment status. Revoking access only
   * needs the caller's employee permission (plus the usual member protections); restoring
   * it requires the user-administration permission used by the members endpoint.
   */
  async syncEmployeeAccountAccess(input: {
    readonly actor: OrgAccessActor;
    readonly adminId: string;
    readonly active: boolean;
  }): Promise<void> {
    const membership = await this.repository.findMembershipByAdmin(
      input.actor.organizationId,
      input.adminId,
    );
    if (!membership) return;
    if (!input.active) {
      if (membership.status === 'DEACTIVATED') return;
      await this.repository.changeMemberStatus(
        input.actor.organizationId,
        membership.membershipId,
        'DEACTIVATED',
        input.actor.adminId,
      );
      return;
    }
    if (membership.status === 'ACTIVE') return;
    const canRestore = await this.permissions.hasAnyPermission(input.actor, [
      'users.deactivate',
      'memberships.manage',
    ]);
    if (!canRestore) return;
    await this.repository.changeMemberStatus(
      input.actor.organizationId,
      membership.membershipId,
      'ACTIVE',
      input.actor.adminId,
    );
  }
}
