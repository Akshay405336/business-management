import type { CrmActor } from '../../../application/shared/crm-actor.js';
import type { PipelineListFilters } from '../../domain/types/pipeline-filter.types.js';

export type ListPipelinesQuery = {
  readonly actor: CrmActor;
  readonly filters?: PipelineListFilters;
};
