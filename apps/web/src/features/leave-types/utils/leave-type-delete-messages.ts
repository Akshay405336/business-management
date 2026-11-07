import { API_ERROR_CODES } from '@techwin/contracts';
import { isApiError } from '@/shared/api/api-error';

export type LeaveTypeDependencyCounts = {
  readonly requestCount: number;
  readonly balanceCount: number;
  readonly allocationCount: number;
};

function countFromDetail(error: unknown, path: string): number {
  if (!isApiError(error)) return 0;
  const detail = error.details.find((item) => item.path === path);
  if (!detail) return 0;
  const parsed = Number(detail.message);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function leaveTypeDependencyCountsFromError(
  error: unknown,
  fallback?: LeaveTypeDependencyCounts,
): LeaveTypeDependencyCounts {
  if (!isApiError(error) || error.code !== API_ERROR_CODES.LEAVE_TYPE_HAS_DEPENDENCIES) {
    return fallback ?? { requestCount: 0, balanceCount: 0, allocationCount: 0 };
  }
  return {
    requestCount: countFromDetail(error, 'requestCount'),
    balanceCount: countFromDetail(error, 'balanceCount'),
    allocationCount: countFromDetail(error, 'allocationCount'),
  };
}

export function leaveTypeDeleteBlockedMessage(counts: LeaveTypeDependencyCounts): string {
  const parts: string[] = [];
  if (counts.requestCount > 0) {
    parts.push(
      `${counts.requestCount} leave request${counts.requestCount === 1 ? '' : 's'}`,
    );
  }
  if (counts.balanceCount > 0) {
    parts.push(
      `${counts.balanceCount} employee balance${counts.balanceCount === 1 ? '' : 's'}`,
    );
  }
  if (counts.allocationCount > 0) {
    parts.push(
      `${counts.allocationCount} yearly allocation${counts.allocationCount === 1 ? '' : 's'}`,
    );
  }
  const countLine = parts.length > 0 ? `${parts.join(', ')} currently depend on this leave type. ` : '';
  return `${countLine}This leave type cannot be deleted while it is referenced. Deactivate it instead, or remove the related records first.`.trim();
}

export function isLeaveTypeDeleteBlockedError(error: unknown): boolean {
  return isApiError(error) && error.code === API_ERROR_CODES.LEAVE_TYPE_HAS_DEPENDENCIES;
}
