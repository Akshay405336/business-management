import type { LeadReadModel } from '../../domain/types/lead-read-model.js';

export type ListLeadsResult = {
  readonly items: readonly LeadReadModel[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
};
