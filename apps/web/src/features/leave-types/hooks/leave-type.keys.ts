import type { LeaveTypeListQuery } from '../api/leave-type.api';

export const leaveTypeKeys = {
  all: ['leave', 'types'] as const,
  lists: () => [...leaveTypeKeys.all, 'list'] as const,
  list: (query: LeaveTypeListQuery) => [...leaveTypeKeys.lists(), query] as const,
  details: () => [...leaveTypeKeys.all, 'detail'] as const,
  detail: (id: string) => [...leaveTypeKeys.details(), id] as const,
};
