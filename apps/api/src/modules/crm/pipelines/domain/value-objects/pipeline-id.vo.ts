const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class PipelineId {
  private constructor(readonly value: string) {}

  static create(value: string): PipelineId {
    const trimmed = value.trim();
    if (!UUID_RE.test(trimmed)) {
      throw new Error('Pipeline id must be a valid UUID.');
    }
    return new PipelineId(trimmed);
  }

  static generate(): PipelineId {
    return new PipelineId(crypto.randomUUID());
  }

  equals(other: PipelineId): boolean {
    return this.value === other.value;
  }
}
