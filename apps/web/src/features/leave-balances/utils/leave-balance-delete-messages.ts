import { API_ERROR_CODES } from '@techwin/contracts';
import { isApiError } from '@/shared/api/api-error';

export type LeaveBalanceDependencyCounts = {
  readonly pendingRequestCount: number;
  readonly approvedRequestCount: number;
  readonly consumedBalanceCount: number;
  readonly adjustedBalanceCount: number;
  readonly protectedTransactionCount: number;
};

function countFromDetail(error: unknown, path: string): number {
  if (!isApiError(error)) return 0;
  const detail = error.details.find((item) => item.path === path);
  if (!detail) return 0;
  const parsed = Number(detail.message);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function leaveBalanceDependencyCountsFromError(
  error: unknown,
): LeaveBalanceDependencyCounts | null {
  if (!isApiError(error) || error.code !== API_ERROR_CODES.LEAVE_BALANCE_HAS_DEPENDENCIES) {
    return null;
  }
  return {
    pendingRequestCount: countFromDetail(error, 'pendingRequestCount'),
    approvedRequestCount: countFromDetail(error, 'approvedRequestCount'),
    consumedBalanceCount: countFromDetail(error, 'consumedBalanceCount'),
    adjustedBalanceCount: countFromDetail(error, 'adjustedBalanceCount'),
    protectedTransactionCount: countFromDetail(error, 'protectedTransactionCount'),
  };
}

export function leaveBalanceDeleteBlockedMessage(counts: LeaveBalanceDependencyCounts): string {
  const parts: string[] = [];
  if (counts.approvedRequestCount > 0) {
    parts.push(
      `${counts.approvedRequestCount} approved leave request${counts.approvedRequestCount === 1 ? '' : 's'}`,
    );
  }
  if (counts.pendingRequestCount > 0) {
    parts.push(
      `${counts.pendingRequestCount} pending leave request${counts.pendingRequestCount === 1 ? '' : 's'}`,
    );
  }
  if (counts.consumedBalanceCount > 0) {
    parts.push('consumed leave days on employee balances');
  }
  if (counts.adjustedBalanceCount > 0) {
    parts.push('historical balance adjustments');
  }
  if (counts.protectedTransactionCount > 0) {
    parts.push('protected balance transactions');
  }
  const countLine = parts.length > 0 ? `Cannot delete: ${parts.join('; ')}.` : '';
  return `${countLine} Remove or resolve these dependencies before deleting this configuration.`.trim();
}

export function isLeaveBalanceDeleteBlockedError(error: unknown): boolean {
  return isApiError(error) && error.code === API_ERROR_CODES.LEAVE_BALANCE_HAS_DEPENDENCIES;
}
