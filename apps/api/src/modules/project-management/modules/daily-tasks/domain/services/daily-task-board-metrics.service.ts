import type { DailyTaskListItem } from '../read-models/daily-task.models.js';

/** Pure board / list metrics used by board and aggregated views. */
export function computeDailyTaskBoardMetrics(
  items: readonly Pick<
    DailyTaskListItem,
    'workflowStageKey' | 'completedAt' | 'isOverdue'
  >[],
): {
  readonly total: number;
  readonly todo: number;
  readonly inProgress: number;
  readonly review: number;
  readonly completed: number;
  readonly overdue: number;
} {
  return {
    total: items.length,
    todo: items.filter((t) => t.workflowStageKey === 'todo').length,
    inProgress: items.filter((t) => t.workflowStageKey === 'in_progress').length,
    review: items.filter((t) => t.workflowStageKey === 'review').length,
    completed: items.filter(
      (t) => t.workflowStageKey === 'completed' || Boolean(t.completedAt),
    ).length,
    overdue: items.filter((t) => t.isOverdue).length,
  };
}
