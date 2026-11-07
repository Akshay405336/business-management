import { LeaveBalanceHasDependenciesError } from '../../../../domain/errors/leave.errors.js';
import type { LeaveBalanceDependencySnapshot } from '../types/leave-balance-dependencies.js';

function formatDeletionMessage(snapshot: LeaveBalanceDependencySnapshot): string {
  const parts: string[] = [];
  if (snapshot.approvedRequestCount > 0) {
    parts.push(
      `${snapshot.approvedRequestCount} approved leave request${snapshot.approvedRequestCount === 1 ? '' : 's'} reference this configuration`,
    );
  }
  if (snapshot.pendingRequestCount > 0) {
    parts.push(
      `${snapshot.pendingRequestCount} pending leave request${snapshot.pendingRequestCount === 1 ? '' : 's'} reference this configuration`,
    );
  }
  if (snapshot.consumedBalanceCount > 0) {
    parts.push(
      `leave has already been consumed on ${snapshot.consumedBalanceCount} employee balance${snapshot.consumedBalanceCount === 1 ? '' : 's'}`,
    );
  }
  if (snapshot.adjustedBalanceCount > 0) {
    parts.push(
      `historical balance adjustments exist on ${snapshot.adjustedBalanceCount} employee balance${snapshot.adjustedBalanceCount === 1 ? '' : 's'}`,
    );
  }
  if (snapshot.protectedTransactionCount > 0) {
    parts.push('protected leave balance transactions exist');
  }
  if (parts.length === 0) {
    return 'This leave balance configuration cannot be deleted.';
  }
  return `Cannot delete: ${parts.join('; ')}.`;
}

export class LeaveBalanceDeletionPolicy {
  static assertCanDelete(snapshot: LeaveBalanceDependencySnapshot): void {
    const blocked =
      snapshot.pendingRequestCount > 0 ||
      snapshot.approvedRequestCount > 0 ||
      snapshot.consumedBalanceCount > 0 ||
      snapshot.adjustedBalanceCount > 0 ||
      snapshot.protectedTransactionCount > 0;
    if (!blocked) return;
    throw new LeaveBalanceHasDependenciesError(
      formatDeletionMessage(snapshot),
      snapshot.pendingRequestCount,
      snapshot.approvedRequestCount,
      snapshot.consumedBalanceCount,
      snapshot.adjustedBalanceCount,
      snapshot.protectedTransactionCount,
    );
  }
}
