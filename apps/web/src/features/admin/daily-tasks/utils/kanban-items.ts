import type { DailyTaskBoardColumn, DailyTaskBoardResponse, DailyTaskListItem } from '../types';

export type DailyTaskKanbanItemsByStage = Record<string, string[]>;

export const dailyTaskKanbanColumnStartId = (stageId: string) => `${stageId}::start`;

export function buildDailyTaskKanbanItems(
  columns: readonly DailyTaskBoardColumn[],
): DailyTaskKanbanItemsByStage {
  const map: DailyTaskKanbanItemsByStage = {};
  for (const column of columns) {
    map[column.stage.id] = column.tasks.map((task) => task.id);
  }
  return map;
}

export function buildDailyTaskMap(board: DailyTaskBoardResponse): Map<string, DailyTaskListItem> {
  const map = new Map<string, DailyTaskListItem>();
  for (const column of board.columns) {
    for (const task of column.tasks) {
      map.set(task.id, task);
    }
  }
  return map;
}

export function resolveDailyTaskDropStageId(
  id: string,
  stageIds: readonly string[],
  items: DailyTaskKanbanItemsByStage,
): string | null {
  if (id.endsWith('::start')) return id.slice(0, -'::start'.length);
  if (stageIds.includes(id)) return id;
  for (const stageId of stageIds) {
    if (items[stageId]?.includes(id)) return stageId;
  }
  return null;
}

export function insertIndexInDailyTaskColumn(
  overId: string,
  overContainer: string,
  columnIds: readonly string[],
): number {
  if (overId === dailyTaskKanbanColumnStartId(overContainer) || overId.endsWith('::start')) {
    return 0;
  }
  if (overId === overContainer) return columnIds.length;
  const overIndex = columnIds.indexOf(overId);
  return overIndex < 0 ? columnIds.length : overIndex;
}

export function kanbanBeforeTaskId(
  orderedIds: readonly string[],
  activeId: string,
): string | null {
  const index = orderedIds.indexOf(activeId);
  if (index < 0) return null;
  return orderedIds[index + 1] ?? null;
}
