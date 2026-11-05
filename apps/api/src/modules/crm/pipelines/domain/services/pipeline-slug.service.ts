import { PipelineSlug } from '../value-objects/pipeline-slug.vo.js';

export class PipelineSlugService {
  static normalizeNameForComparison(name: string): string {
    return name.trim().toLocaleLowerCase();
  }

  static slugFromName(name: string): PipelineSlug {
    return PipelineSlug.fromName(name);
  }
}
