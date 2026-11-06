export const PipelineStatusValues = ['ACTIVE', 'INACTIVE'] as const;
export type PipelineStatus = (typeof PipelineStatusValues)[number];

export function parsePipelineStatus(value: string): PipelineStatus {
  if (value === 'ACTIVE' || value === 'INACTIVE') return value;
  throw new Error(`Invalid pipeline status: ${value}`);
}
