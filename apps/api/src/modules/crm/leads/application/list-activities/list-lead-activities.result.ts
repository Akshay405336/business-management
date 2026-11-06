import type { LeadActivityReadModel } from '../../domain/types/lead-read-model.js';

export type ListLeadActivitiesResult = {
  readonly activities: readonly LeadActivityReadModel[];
};
