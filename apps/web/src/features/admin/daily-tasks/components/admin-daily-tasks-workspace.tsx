'use client';

import { DailyTasksWorkspace } from './daily-tasks-workspace';

/** Admin `/admin/daily-tasks` page container — organization task management shell. */
export function AdminDailyTasksWorkspace() {
  return <DailyTasksWorkspace portal="admin" />;
}
