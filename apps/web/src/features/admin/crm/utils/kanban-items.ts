import type { CrmLead, CrmPipelineStage } from '../types';

export type KanbanItemsByStage = Record<string, string[]>;

export function buildKanbanItems(
  stages: readonly CrmPipelineStage[],
  leads: readonly CrmLead[],
): KanbanItemsByStage {
  const map: KanbanItemsByStage = {};
  for (const stage of stages) map[stage.id] = [];

  const sorted = [...leads].sort((a, b) => {
    const orderDiff = a.kanbanSortOrder - b.kanbanSortOrder;
    if (orderDiff !== 0) return orderDiff;
    return a.createdAt.localeCompare(b.createdAt);
  });

  for (const lead of sorted) {
    const bucket = map[lead.stageId];
    if (bucket) bucket.push(lead.id);
    else map[lead.stageId] = [lead.id];
  }
  return map;
}

export function kanbanBeforeLeadId(
  orderedIds: readonly string[],
  activeId: string,
): string | null {
  const index = orderedIds.indexOf(activeId);
  if (index < 0) return null;
  return orderedIds[index + 1] ?? null;
}
