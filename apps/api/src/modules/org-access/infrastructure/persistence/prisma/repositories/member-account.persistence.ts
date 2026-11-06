import { randomUUID } from 'node:crypto';
import type { Prisma } from '../../../../../../generated/prisma/client.js';
import { OrgAccessConflictError } from '../../../../domain/errors/org-access.errors.js';
import type { PreparedMemberAccount } from '../../../../domain/repositories/org-access.repository.js';
import type { EmployeeLoginRemoval } from '../../../../domain/ports/member-account-transaction.port.js';

type MemberAccountWrite = {
  readonly account: PreparedMemberAccount;
  readonly displayName: string;
  readonly phone: string | null;
  /** A deactivated membership also disables sign-in for the new account. */
  readonly membershipStatus: 'ACTIVE' | 'DEACTIVATED';
  readonly auditMetadata?: Prisma.InputJsonObject;
};

/**
 * Creates the sign-in account, its organization membership and role links inside the
 * caller's transaction so employee and account records are committed together.
 */
export async function createMemberAccountInTransaction(
  tx: Prisma.TransactionClient,
  organizationId: string,
  input: MemberAccountWrite,
  actorAdminId: string,
): Promise<{ membershipId: string; adminId: string }> {
  const { account } = input;
  const now = new Date();

  await tx.platformAdmin.create({
    data: {
      id: account.adminId,
      email: account.email,
      displayName: input.displayName,
      phone: input.phone,
      role: 'ORGANIZATION_MEMBER',
      status: input.membershipStatus === 'ACTIVE' ? 'ACTIVE' : 'DISABLED',
      passwordHash: account.passwordHash,
      totpSecretCiphertext: account.totpSecretCiphertext,
      organizationId,
    },
  });

  const membershipId = randomUUID();
  await tx.organizationMembership.create({
    data: {
      id: membershipId,
      organizationId,
      adminId: account.adminId,
      status: input.membershipStatus,
      isOwner: account.isOwner,
      invitedByAdminId: actorAdminId,
      invitedAt: now,
      acceptedAt: now,
      roleLinks: { create: account.roleIds.map((roleId) => ({ roleId })) },
    },
  });

  await tx.crmAuditEvent.create({
    data: {
      organizationId,
      adminId: actorAdminId,
      type: 'MEMBER_UPDATED',
      entityType: 'membership',
      entityId: membershipId,
      metadata: {
        provisioned: true,
        email: account.email,
        roleIds: [...account.roleIds],
        ...input.auditMetadata,
      },
    },
  });

  return { membershipId, adminId: account.adminId };
}

/**
 * Records authored by an account whose foreign keys are RESTRICT: they are business
 * history, so an account that still authors any of them cannot be deleted.
 */
async function countRetainedHistory(
  tx: Prisma.TransactionClient,
  adminId: string,
): Promise<Record<string, number>> {
  const [
    leads,
    leadActivities,
    clients,
    proposals,
    servicePackages,
    projects,
    dailyTasks,
    dailyTaskActivities,
    dailyTaskReschedules,
    employees,
    invitations,
    files,
  ] = await Promise.all([
    tx.lead.count({ where: { createdByAdminId: adminId } }),
    tx.leadActivity.count({ where: { createdByAdminId: adminId } }),
    tx.client.count({ where: { createdByAdminId: adminId } }),
    tx.quotationDocument.count({ where: { createdByAdminId: adminId } }),
    tx.servicePackage.count({ where: { createdByAdminId: adminId } }),
    tx.project.count({ where: { createdByAdminId: adminId } }),
    tx.dailyTask.count({ where: { createdByAdminId: adminId } }),
    tx.dailyTaskActivity.count({ where: { actorAdminId: adminId } }),
    tx.dailyTaskReschedule.count({ where: { rescheduledByAdminId: adminId } }),
    tx.employee.count({ where: { createdByAdminId: adminId } }),
    tx.organizationInvitation.count({ where: { invitedByAdminId: adminId } }),
    tx.storedObject.count({ where: { createdByAdminId: adminId } }),
  ]);
  const counts: Record<string, number> = {
    leads,
    'lead activities': leadActivities,
    clients,
    proposals,
    'service packages': servicePackages,
    projects,
    'daily tasks': dailyTasks,
    'daily task activities': dailyTaskActivities,
    'daily task reschedules': dailyTaskReschedules,
    employees,
    invitations,
    files,
  };
  return Object.fromEntries(Object.entries(counts).filter(([, count]) => count > 0));
}

/**
 * Removes the sign-in access that belongs to a deleted employee, inside the caller's
 * transaction. Only accounts created together with the employee are touched: they are
 * deleted outright (sessions, refresh tokens and challenges cascade), or, when another
 * organization still uses them, lose only this organization's membership. Assignments
 * held by the account (lead owner, project manager, task assignee) are cleared by their
 * SET NULL foreign keys while the records themselves are kept.
 */
export async function removeEmployeeLoginInTransaction(
  tx: Prisma.TransactionClient,
  organizationId: string,
  input: { readonly adminId: string; readonly ownedByEmployee: boolean },
): Promise<EmployeeLoginRemoval> {
  if (!input.ownedByEmployee) return 'ACCOUNT_PRESERVED';
  const account = await tx.platformAdmin.findUnique({
    where: { id: input.adminId },
    select: { role: true, memberships: { select: { id: true, organizationId: true } } },
  });
  if (!account || account.role === 'SUPER_ADMIN') return 'ACCOUNT_PRESERVED';

  const otherOrganizations = account.memberships.filter(
    (membership) => membership.organizationId !== organizationId,
  );
  if (otherOrganizations.length > 0) {
    await tx.organizationMembership.deleteMany({ where: { organizationId, adminId: input.adminId } });
    return 'MEMBERSHIP_REMOVED';
  }

  const history = await countRetainedHistory(tx, input.adminId);
  const entries = Object.entries(history);
  if (entries.length > 0) {
    const summary = entries.map(([label, count]) => `${count} ${label}`).join(', ');
    throw new OrgAccessConflictError(
      `This employee's sign-in account authored records that must be kept (${summary}), so it cannot be deleted. Deactivate the employee instead.`,
    );
  }

  await tx.organizationMembership.deleteMany({ where: { adminId: input.adminId } });
  await tx.platformAdmin.delete({ where: { id: input.adminId } });
  return 'ACCOUNT_DELETED';
}

export type MemberAccountDeletion = 'ACCOUNT_DELETED' | 'MEMBERSHIP_REMOVED';

/**
 * Permanently removes one organization's membership. The sign-in account is deleted
 * only when it belongs solely to this organization and has no RESTRICT business history.
 * Employee HR records are unlinked and kept. Sessions and challenges for a deleted
 * account cascade. Owner and Super Admin must be rejected by the caller before this.
 */
export async function deleteOrganizationMemberInTransaction(
  tx: Prisma.TransactionClient,
  organizationId: string,
  input: { readonly adminId: string; readonly membershipId: string },
): Promise<MemberAccountDeletion> {
  const account = await tx.platformAdmin.findUnique({
    where: { id: input.adminId },
    select: { role: true, memberships: { select: { id: true, organizationId: true } } },
  });
  if (!account) throw new OrgAccessConflictError('This sign-in account was not found.');
  if (account.role === 'SUPER_ADMIN') {
    throw new OrgAccessConflictError('The Owner account cannot be deleted.');
  }

  const otherOrganizations = account.memberships.filter(
    (membership) => membership.organizationId !== organizationId,
  );
  const exclusive = otherOrganizations.length === 0;
  if (exclusive) {
    const history = await countRetainedHistory(tx, input.adminId);
    const entries = Object.entries(history);
    if (entries.length > 0) {
      const summary = entries.map(([label, count]) => `${count} ${label}`).join(', ');
      throw new OrgAccessConflictError(
        `This account authored records that must be kept (${summary}), so it cannot be deleted. Deactivate the member instead.`,
      );
    }
  }

  await tx.employee.updateMany({
    where: { platformAdminId: input.adminId },
    data: { platformAdminId: null, ownsLoginAccount: false },
  });

  const now = new Date();
  await tx.platformSession.updateMany({
    where: { adminId: input.adminId, revokedAt: null, expiresAt: { gt: now } },
    data: { revokedAt: now, revokedReason: 'REVOKED' },
  });

  await tx.organizationMembershipRole.deleteMany({ where: { membershipId: input.membershipId } });
  await tx.organizationMembership.deleteMany({
    where: { id: input.membershipId, organizationId },
  });

  if (!exclusive) return 'MEMBERSHIP_REMOVED';

  await tx.organizationMembership.deleteMany({ where: { adminId: input.adminId } });
  await tx.platformAuthChallenge.deleteMany({ where: { adminId: input.adminId } });
  await tx.platformAdmin.delete({ where: { id: input.adminId } });
  return 'ACCOUNT_DELETED';
}
