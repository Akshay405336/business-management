import type { Prisma } from '../../../../../generated/prisma/client.js';

/** Two-pass sortOrder assignment avoids unique-index collisions during reorder. */
export async function assignProjectPhaseOrders(
  tx: Prisma.TransactionClient,
  orderedIds: readonly string[],
): Promise<void> {
  for (let index = 0; index < orderedIds.length; index += 1) {
    await tx.projectPhase.update({
      where: { id: orderedIds[index] },
      data: { sortOrder: -(index + 1) },
    });
  }
  for (let index = 0; index < orderedIds.length; index += 1) {
    await tx.projectPhase.update({
      where: { id: orderedIds[index] },
      data: { sortOrder: index + 1 },
    });
  }
}
