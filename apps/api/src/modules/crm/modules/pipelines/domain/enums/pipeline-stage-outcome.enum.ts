export const PipelineStageOutcomeValues = ['NONE', 'WON', 'LOST'] as const;
export type PipelineStageOutcome = (typeof PipelineStageOutcomeValues)[number];

export function parsePipelineStageOutcome(value: string): PipelineStageOutcome {
  if (value === 'NONE' || value === 'WON' || value === 'LOST') return value;
  throw new Error(`Invalid pipeline stage outcome: ${value}`);
}

/** Terminal outcomes (WON / LOST) used for stage-type business rules. */
export type PipelineStageType = PipelineStageOutcome;
