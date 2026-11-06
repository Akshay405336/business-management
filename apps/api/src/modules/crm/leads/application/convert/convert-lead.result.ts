import type { ClientRecord } from '../../../domain/repositories/crm.repository.js';
import type { LeadReadModel } from '../../domain/types/lead-read-model.js';

export type ConvertLeadResult = {
  readonly lead: LeadReadModel;
  readonly client: ClientRecord | null;
  readonly duplicateClient: {
    readonly id: string;
    readonly name: string;
    readonly referenceNumber: string;
    readonly type: ClientRecord['type'];
    readonly phone: string | null;
  } | null;
};
