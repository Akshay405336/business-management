import type { PipelineStageOutcome } from '../crm-types.js';

export interface DefaultPipelineStageDefinition {
  readonly name: string;
  readonly color: string;
  readonly outcome: PipelineStageOutcome;
}

/** Eight default kanban columns; Won and Lost are terminal outcomes. */
export const DEFAULT_PIPELINE_STAGES: readonly DefaultPipelineStageDefinition[] = [
  { name: 'New Lead', color: '#6366f1', outcome: 'NONE' },
  { name: 'First Call', color: '#8b5cf6', outcome: 'NONE' },
  { name: 'Qualified', color: '#0ea5e9', outcome: 'NONE' },
  { name: 'Follow-up', color: '#64748b', outcome: 'NONE' },
  { name: 'Proposal Sent', color: '#14b8a6', outcome: 'NONE' },
  { name: 'Negotiation', color: '#f59e0b', outcome: 'NONE' },
  { name: 'Won', color: '#22c55e', outcome: 'WON' },
  { name: 'Lost', color: '#ef4444', outcome: 'LOST' },
] as const;
