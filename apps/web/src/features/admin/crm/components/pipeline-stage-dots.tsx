import type { CrmPipelineStage } from '../types';
import { normalizeStageColor } from '../utils/stage-color';

function orderedStagesForDots(stages: readonly CrmPipelineStage[]): CrmPipelineStage[] {
  return [...stages].sort((a, b) => a.sortOrder - b.sortOrder).slice(0, 3);
}

const DOT_SIZE_PX = 12;
/** ~90% of each dot visible; ~10% overlaps the previous dot. */
const DOT_OVERLAP_RATIO = 0.1;

export function PipelineStageDots({ stages }: { stages: readonly CrmPipelineStage[] }) {
  const dots = orderedStagesForDots(stages);
  const totalStages = stages.length;
  if (dots.length === 0) return null;

  const label = stages
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((stage) => stage.name)
    .join(', ');
  const countLabel = `${totalStages} ${totalStages === 1 ? 'stage' : 'stages'}`;

  return (
    <div
      className="flex min-w-0 items-center gap-2"
      role="img"
      aria-label={`${countLabel}: ${label}`}
      title={label}
    >
      <div className="flex shrink-0 items-center">
        {dots.map((stage, index) => (
          <span
            key={stage.id}
            className="relative size-3 shrink-0 rounded-full border border-white shadow-sm"
            style={{
              backgroundColor: normalizeStageColor(stage.color),
              marginLeft: index === 0 ? 0 : -DOT_SIZE_PX * DOT_OVERLAP_RATIO,
              zIndex: index + 1,
            }}
          />
        ))}
      </div>
      <span className="text-muted-foreground truncate text-xs whitespace-nowrap">{countLabel}</span>
    </div>
  );
}
