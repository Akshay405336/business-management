export interface PipelineBulkActionFailure {
  readonly pipelineId: string;
  readonly message: string;
}

export interface PipelineBulkActionResult {
  readonly succeededIds: readonly string[];
  readonly failures: readonly PipelineBulkActionFailure[];
}
