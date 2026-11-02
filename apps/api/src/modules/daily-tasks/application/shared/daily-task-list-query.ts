import type { DailyTaskListQuery as ParsedDailyTaskListQuery } from '@techwin/validation';
import { normalizeListPage, normalizeListPageSize } from '../../../../shared/pagination/index.js';
import type { DailyTaskListQuery } from '../../domain/types/daily-task-inputs.js';

export function toDailyTaskListQuery(query: ParsedDailyTaskListQuery): DailyTaskListQuery {
  return {
    ...query,
    page: normalizeListPage(query.page),
    pageSize: normalizeListPageSize(query.pageSize, 20),
  };
}
