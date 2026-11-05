export type BulkUpdatePipelineStatusResult = {
  readonly succeededIds: readonly string[];
  readonly failures: readonly { pipelineId: string; message: string }[];
};
