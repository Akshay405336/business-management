import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../../../generated/prisma/client.js';
import type {
  EmployeeLoginRemoval,
  MemberAccountTransactionPort,
  MemberAccountWrite,
  OrganizationTransactionClient,
} from '../../../../domain/ports/member-account-transaction.port.js';
import {
  createMemberAccountInTransaction,
  removeEmployeeLoginInTransaction,
} from './member-account.persistence.js';

@Injectable()
export class PrismaMemberAccountTransactionAdapter implements MemberAccountTransactionPort {
  createMemberAccountInTransaction(
    tx: OrganizationTransactionClient,
    organizationId: string,
    input: MemberAccountWrite,
    actorAdminId: string,
  ): Promise<{ membershipId: string; adminId: string }> {
    return createMemberAccountInTransaction(
      tx as Prisma.TransactionClient,
      organizationId,
      {
        ...input,
        auditMetadata: input.auditMetadata as Prisma.InputJsonObject | undefined,
      },
      actorAdminId,
    );
  }

  removeEmployeeLoginInTransaction(
    tx: OrganizationTransactionClient,
    organizationId: string,
    input: { readonly adminId: string; readonly ownedByEmployee: boolean },
  ): Promise<EmployeeLoginRemoval> {
    return removeEmployeeLoginInTransaction(
      tx as Prisma.TransactionClient,
      organizationId,
      input,
    );
  }
}
