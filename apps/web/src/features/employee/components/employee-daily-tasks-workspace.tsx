'use client';

import { DailyTasksWorkspace } from '@/features/admin/daily-tasks/components/daily-tasks-workspace';

/** Employee `/employee/daily-tasks` page container — self-assigned tasks only. */
export function EmployeeDailyTasksWorkspace() {
  return <DailyTasksWorkspace portal="employee" defaultView="kanban" />;
}
