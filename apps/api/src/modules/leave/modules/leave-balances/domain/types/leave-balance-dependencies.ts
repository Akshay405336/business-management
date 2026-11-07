export type LeaveBalanceDependencySnapshot = {
  readonly pendingRequestCount: number;
  readonly approvedRequestCount: number;
  readonly consumedBalanceCount: number;
  readonly adjustedBalanceCount: number;
  readonly protectedTransactionCount: number;
};

export type LeaveBalanceDeletionBlockReason =
  | 'PENDING_REQUESTS'
  | 'APPROVED_REQUESTS'
  | 'CONSUMED_BALANCES'
  | 'ADJUSTED_BALANCES'
  | 'PROTECTED_TRANSACTIONS';
