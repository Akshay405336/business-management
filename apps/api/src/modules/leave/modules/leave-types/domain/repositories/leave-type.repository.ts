import type { LeaveTypeItem, LeaveTypeListResponse, LeaveTypeStatus } from '@techwin/contracts';
import type {
  CreateLeaveTypeData,
  LeaveTypeDependencyCounts,
  LeaveTypeListFilters,
  UpdateLeaveTypeData,
} from '../types/leave-type.types.js';

export const LEAVE_TYPE_REPOSITORY = Symbol('LEAVE_TYPE_REPOSITORY');

export interface LeaveTypeRepository {
  listLeaveTypes(organizationId: string, filters: LeaveTypeListFilters): Promise<LeaveTypeListResponse>;
  getLeaveType(organizationId: string, leaveTypeId: string): Promise<LeaveTypeItem>;
  listCodes(organizationId: string): Promise<readonly string[]>;
  findIdByNameInsensitive(
    organizationId: string,
    name: string,
    excludeId?: string,
  ): Promise<string | null>;
  createLeaveType(
    organizationId: string,
    adminId: string,
    input: CreateLeaveTypeData,
    code: string,
  ): Promise<LeaveTypeItem>;
  updateLeaveType(
    organizationId: string,
    leaveTypeId: string,
    adminId: string,
    input: UpdateLeaveTypeData,
  ): Promise<LeaveTypeItem>;
  changeLeaveTypeStatus(
    organizationId: string,
    leaveTypeId: string,
    adminId: string,
    status: LeaveTypeStatus,
  ): Promise<LeaveTypeItem>;
  countDependencies(organizationId: string, leaveTypeId: string): Promise<LeaveTypeDependencyCounts>;
  deleteLeaveType(organizationId: string, leaveTypeId: string): Promise<void>;
}
