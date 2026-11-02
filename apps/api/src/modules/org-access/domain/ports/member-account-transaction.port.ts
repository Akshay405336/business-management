import type { PreparedMemberAccount } from '../repositories/org-access.repository.js';

export const MEMBER_ACCOUNT_TRANSACTION = Symbol('MEMBER_ACCOUNT_TRANSACTION');

/** Opaque transaction handle passed from the caller's unit of work (Prisma in infrastructure). */
export type OrganizationTransactionClient = unknown;

export type MemberAccountWrite = {
  readonly account: PreparedMemberAccount;
  readonly displayName: string;
  readonly phone: string | null;
  /** A deactivated membership also disables sign-in for the new account. */
  readonly membershipStatus: 'ACTIVE' | 'DEACTIVATED';
  readonly auditMetadata?: Record<string, unknown>;
};

export type EmployeeLoginRemoval = 'ACCOUNT_DELETED' | 'MEMBERSHIP_REMOVED' | 'ACCOUNT_PRESERVED';

/**
 * Writes organization member sign-in accounts inside a caller-owned database transaction.
 */
export interface MemberAccountTransactionPort {
  createMemberAccountInTransaction(
    tx: OrganizationTransactionClient,
    organizationId: string,
    input: MemberAccountWrite,
    actorAdminId: string,
  ): Promise<{ membershipId: string; adminId: string }>;

  removeEmployeeLoginInTransaction(
    tx: OrganizationTransactionClient,
    organizationId: string,
    input: { readonly adminId: string; readonly ownedByEmployee: boolean },
  ): Promise<EmployeeLoginRemoval>;
}
