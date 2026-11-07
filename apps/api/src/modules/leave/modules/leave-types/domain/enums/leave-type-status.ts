export const LEAVE_TYPE_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type LeaveTypeStatus = (typeof LEAVE_TYPE_STATUSES)[number];
