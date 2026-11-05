export {
  CrmNotFoundError as PipelineNotFoundError,
  CrmPipelineHasDependentLeadsError as PipelineHasDependentLeadsError,
  CrmPipelineInUseError as PipelineInUseError,
  CrmStageDeleteBlockedError as PipelineStageDeleteBlockedError,
  CrmValidationError as PipelineValidationError,
} from '../../../domain/errors/crm.errors.js';
