import type { ProjectTask } from '../types';

export type KanbanTasksByPhase = Record<string, string[]>;

export function buildKanbanTaskItems(
  phaseIds: readonly string[],
  tasks: readonly ProjectTask[],
): KanbanTasksByPhase {
  const map: KanbanTasksByPhase = {};
  for (const phaseId of phaseIds) map[phaseId] = [];

  const sorted = [...tasks].sort((a, b) => {
    const orderDiff = a.sortOrder - b.sortOrder;
    if (orderDiff !== 0) return orderDiff;
    return a.createdAt.localeCompare(b.createdAt);
  });

  for (const task of sorted) {
    const bucket = map[task.phaseId];
    if (bucket) bucket.push(task.id);
    else map[task.phaseId] = [task.id];
  }
  return map;
}

export function kanbanBeforeTaskId(
  orderedIds: readonly string[],
  activeId: string,
): string | null {
  const index = orderedIds.indexOf(activeId);
  if (index < 0) return null;
  return orderedIds[index + 1] ?? null;
}
