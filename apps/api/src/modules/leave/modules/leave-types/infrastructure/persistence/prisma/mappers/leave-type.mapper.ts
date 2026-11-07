import type { LeaveType } from '../../../../../../../../generated/prisma/client.js';
import type { LeaveTypeItem } from '@techwin/contracts';

export function toLeaveTypeItem(row: LeaveType): LeaveTypeItem {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description,
    kind: row.kind,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
