const MAX_LENGTH = 120;

export class PipelineName {
  private constructor(readonly value: string) {}

  static create(raw: string): PipelineName {
    const value = raw.trim();
    if (!value) {
      throw new Error('Pipeline name is required.');
    }
    if (value.length > MAX_LENGTH) {
      throw new Error(`Pipeline name must be at most ${MAX_LENGTH} characters.`);
    }
    return new PipelineName(value);
  }

  equalsIgnoringCase(other: PipelineName): boolean {
    return this.value.localeCompare(other.value, undefined, { sensitivity: 'accent' }) === 0;
  }
}
