import type { Prisma } from '../../../../../generated/prisma/client.js';

export async function assignActiveStageOrders(
  tx: Prisma.TransactionClient,
  orderedIds: readonly string[],
): Promise<void> {
  for (let index = 0; index < orderedIds.length; index++) {
    await tx.pipelineStage.update({
      where: { id: orderedIds[index] },
      data: { sortOrder: -(index + 1) },
    });
  }
  for (let index = 0; index < orderedIds.length; index++) {
    await tx.pipelineStage.update({
      where: { id: orderedIds[index] },
      data: { sortOrder: index + 1 },
    });
  }
}

export async function compactActiveStageOrders(
  tx: Prisma.TransactionClient,
  organizationId: string,
  pipelineId: string,
): Promise<void> {
  const active = await tx.pipelineStage.findMany({
    where: { organizationId, pipelineId, status: 'ACTIVE' },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: { id: true },
  });
  await assignActiveStageOrders(
    tx,
    active.map((stage) => stage.id),
  );
}

export async function nextActiveStageSortOrder(
  tx: Prisma.TransactionClient,
  organizationId: string,
  pipelineId: string,
): Promise<number> {
  const max = await tx.pipelineStage.aggregate({
    where: { organizationId, pipelineId, status: 'ACTIVE' },
    _max: { sortOrder: true },
  });
  return (max._max.sortOrder ?? 0) + 1;
}
