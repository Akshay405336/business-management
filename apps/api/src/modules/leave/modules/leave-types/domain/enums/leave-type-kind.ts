export const LEAVE_TYPE_KINDS = ['PAID', 'UNPAID'] as const;
export type LeaveTypeKind = (typeof LEAVE_TYPE_KINDS)[number];
