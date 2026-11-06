const MAX_LENGTH = 120;

export class PipelineStageName {
  private constructor(readonly value: string) {}

  static create(raw: string): PipelineStageName {
    const value = raw.trim();
    if (!value) {
      throw new Error('Stage name is required.');
    }
    if (value.length > MAX_LENGTH) {
      throw new Error(`Stage name must be at most ${MAX_LENGTH} characters.`);
    }
    return new PipelineStageName(value);
  }

  equalsIgnoringCase(other: PipelineStageName): boolean {
    return this.value.localeCompare(other.value, undefined, { sensitivity: 'accent' }) === 0;
  }
}
