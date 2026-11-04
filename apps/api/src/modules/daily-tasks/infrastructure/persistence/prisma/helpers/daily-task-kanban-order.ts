import type { Prisma } from '../../../../../../generated/prisma/client.js';

export function resolveKanbanInsertIndex(
  orderedIds: readonly string[],
  beforeTaskId?: string | null,
): number {
  if (beforeTaskId === undefined || beforeTaskId === null) return orderedIds.length;
  const index = orderedIds.indexOf(beforeTaskId);
  return index < 0 ? orderedIds.length : index;
}

export function sameTaskIdOrder(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

export async function listDailyTaskIdsInStageForAssignDate(
  tx: Prisma.TransactionClient | Prisma.DefaultPrismaClient,
  organizationId: string,
  workflowStageId: string,
  assignDate: Date,
): Promise<string[]> {
  const rows = await tx.dailyTask.findMany({
    where: { organizationId, workflowStageId, assignDate },
    orderBy: [{ kanbanSortOrder: 'asc' }, { createdAt: 'asc' }],
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

export async function nextDailyTaskKanbanSortOrder(
  tx: Prisma.TransactionClient,
  organizationId: string,
  workflowStageId: string,
  assignDate: Date,
): Promise<number> {
  const max = await tx.dailyTask.aggregate({
    where: { organizationId, workflowStageId, assignDate },
    _max: { kanbanSortOrder: true },
  });
  return (max._max.kanbanSortOrder ?? -1) + 1;
}

export async function applyDailyTaskKanbanOrder(
  tx: Prisma.TransactionClient,
  organizationId: string,
  workflowStageId: string,
  assignDate: Date,
  orderedTaskIds: readonly string[],
): Promise<void> {
  await Promise.all(
    orderedTaskIds.map((id, index) =>
      tx.dailyTask.updateMany({
        where: { id, organizationId, workflowStageId, assignDate },
        data: { kanbanSortOrder: index },
      }),
    ),
  );
}
