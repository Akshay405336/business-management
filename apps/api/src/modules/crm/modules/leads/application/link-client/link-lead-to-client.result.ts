import type { ClientRecord } from '../../../../shared/domain/repositories/crm.repository.js';
import type { LeadReadModel } from '../../domain/types/lead-read-model.js';

export type LinkLeadToClientResult = {
  readonly lead: LeadReadModel;
  readonly client: ClientRecord;
};
