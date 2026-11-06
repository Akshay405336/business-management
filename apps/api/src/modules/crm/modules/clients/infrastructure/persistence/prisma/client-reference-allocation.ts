import type { Prisma } from '../../../../../../../generated/prisma/client.js';
import { nextSequence } from '../../../../../shared/infrastructure/persistence/prisma/repositories/crm-persistence.shared.js';
import { ClientNumberService } from '../../../domain/services/client-number.service.js';
import { CLIENT_SEQUENCE_KEY } from '../../../domain/types/client.types.js';

/** Allocates the next organization-scoped client reference inside an open transaction. */
export async function allocateClientReferenceNumber(
  tx: Pick<Prisma.TransactionClient, 'organizationSequence'>,
  organizationId: string,
): Promise<string> {
  const sequence = await nextSequence(tx, organizationId, CLIENT_SEQUENCE_KEY);
  return ClientNumberService.formatFromSequence(sequence);
}

/** Preview only — does not consume a sequence value. */
export function previewClientReferenceFromLastValue(lastValue: number | null | undefined): string {
  return ClientNumberService.formatFromSequence((lastValue ?? 0) + 1);
}
