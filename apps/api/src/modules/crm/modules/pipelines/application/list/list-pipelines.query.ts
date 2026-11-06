import type { CrmActor } from '../../../../shared/application/crm-actor.js';
import type { PipelineListFilters } from '../../domain/types/pipeline-filter.types.js';

export type ListPipelinesQuery = {
  readonly actor: CrmActor;
  readonly filters?: PipelineListFilters;
};
