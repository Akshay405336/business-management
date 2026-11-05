/** Normalized pipeline key derived from name (org-scoped uniqueness uses name in persistence). */
export class PipelineSlug {
  private constructor(readonly value: string) {}

  static fromName(name: string): PipelineSlug {
    const normalized = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!normalized) {
      throw new Error('Pipeline slug cannot be empty.');
    }
    return new PipelineSlug(normalized);
  }
}
