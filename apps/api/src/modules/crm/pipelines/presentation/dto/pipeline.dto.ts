/**
 * Pipeline HTTP request bodies — Zod schemas owned by @techwin/validation.
 * Response/OpenAPI helpers remain in crm/presentation/http/dto/crm.schemas.ts.
 */
export {
  bulkPipelineIdsRequestSchema,
  bulkPipelineStatusRequestSchema,
  createPipelineRequestSchema as createPipelineBodySchema,
  updatePipelineRequestSchema as updatePipelineBodySchema,
  createPipelineStageRequestSchema as createPipelineStageBodySchema,
  updatePipelineStageRequestSchema as updatePipelineStageBodySchema,
  deletePipelineStageRequestSchema as deletePipelineStageBodySchema,
  reorderPipelineStagesRequestSchema as reorderPipelineStagesBodySchema,
} from '@techwin/validation';
