export class PipelineStageOrder {
  private constructor(readonly value: number) {}

  static create(value: number): PipelineStageOrder {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error('Stage sort order must be a non-negative integer.');
    }
    return new PipelineStageOrder(value);
  }

  static forActiveIndex(index: number): PipelineStageOrder {
    return PipelineStageOrder.create(index + 1);
  }
}
