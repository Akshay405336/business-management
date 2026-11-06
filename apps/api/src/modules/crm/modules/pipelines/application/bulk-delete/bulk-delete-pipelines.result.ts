export type BulkDeletePipelinesResult = {
  readonly succeededIds: readonly string[];
  readonly failures: readonly { pipelineId: string; message: string }[];
};
