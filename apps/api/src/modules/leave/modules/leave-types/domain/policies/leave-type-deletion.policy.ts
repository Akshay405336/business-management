import { LeaveTypeHasDependenciesError } from '../../../../domain/errors/leave.errors.js';
import type { LeaveTypeDependencyCounts } from '../types/leave-type.types.js';

export class LeaveTypeDeletionPolicy {
  static assertCanDelete(counts: LeaveTypeDependencyCounts): void {
    if (counts.requestCount === 0 && counts.balanceCount === 0 && counts.allocationCount === 0) {
      return;
    }
    throw new LeaveTypeHasDependenciesError(
      'This leave type cannot be deleted because it is referenced by leave requests, balances, or allocations.',
      counts.requestCount,
      counts.balanceCount,
      counts.allocationCount,
    );
  }
}
