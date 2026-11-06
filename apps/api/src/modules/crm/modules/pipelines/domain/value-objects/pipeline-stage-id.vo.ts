const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class PipelineStageId {
  private constructor(readonly value: string) {}

  static create(value: string): PipelineStageId {
    const trimmed = value.trim();
    if (!UUID_RE.test(trimmed)) {
      throw new Error('Pipeline stage id must be a valid UUID.');
    }
    return new PipelineStageId(trimmed);
  }

  static generate(): PipelineStageId {
    return new PipelineStageId(crypto.randomUUID());
  }

  equals(other: PipelineStageId): boolean {
    return this.value === other.value;
  }
}
