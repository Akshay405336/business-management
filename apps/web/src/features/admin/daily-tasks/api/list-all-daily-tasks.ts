import { listDailyTasks } from './daily-tasks';
import type { DailyTaskListItem, DailyTaskListResponse } from '../types';
import type { DailyTaskListQuery } from '@techwin/validation';

/** Fetches every page for org-wide calendar and summary views (pageSize capped at 100). */
export async function listAllDailyTasksInRange(
  query: Partial<DailyTaskListQuery> & { clientToday?: string },
  signal?: AbortSignal,
): Promise<{ items: readonly DailyTaskListItem[]; total: number }> {
  const pageSize = 100;
  let page = 1;
  const items: DailyTaskListItem[] = [];
  let total = 0;
  while (true) {
    const response: DailyTaskListResponse = await listDailyTasks(
      { ...query, page, pageSize },
      signal,
    );
    total = response.total;
    items.push(...response.items);
    if (items.length >= total || response.items.length === 0) break;
    page += 1;
  }
  return { items, total };
}
