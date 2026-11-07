import type { LeaveTypeKind } from '../enums/leave-type-kind.js';
import type { LeaveTypeStatus } from '../enums/leave-type-status.js';

export type LeaveTypeRecord = {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly code: string;
  readonly description: string | null;
  readonly kind: LeaveTypeKind;
  readonly status: LeaveTypeStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CreateLeaveTypeData = {
  readonly name: string;
  readonly description: string | null;
  readonly kind: LeaveTypeKind;
};

export type UpdateLeaveTypeData = {
  readonly name?: string;
  readonly description?: string | null;
  readonly kind?: LeaveTypeKind;
};

export type LeaveTypeListFilters = {
  readonly search?: string;
  readonly status?: LeaveTypeStatus;
  readonly kind?: LeaveTypeKind;
  readonly page: number;
  readonly pageSize: number;
};

export type LeaveTypeDependencyCounts = {
  readonly requestCount: number;
  readonly balanceCount: number;
  readonly allocationCount: number;
};
