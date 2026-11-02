import type { CrmActor } from '../shared/crm-actor.js';
import type { PipelineListFilters } from '../../domain/repositories/crm.repository.js';

export type ListPipelinesQuery = {
  readonly actor: CrmActor;
  readonly filters?: PipelineListFilters;
};
