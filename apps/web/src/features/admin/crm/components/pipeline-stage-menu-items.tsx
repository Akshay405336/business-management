'use client';

import { DropdownMenuRadioItem } from '@/components/ui/dropdown-menu';
import { cn } from '@/shared/lib/utils';
import type { CrmPipelineStage } from '../types';
import { stageSelectItemStyle } from '../utils/stage-color';
import { StageColorDot } from './pipeline-stage-select';

const stageMenuItemClassName =
  'bg-card text-foreground focus:bg-[var(--stage-option-hover)] focus:text-foreground data-[highlighted]:bg-[var(--stage-option-hover)] data-[highlighted]:text-foreground data-[state=checked]:bg-[var(--stage-option-selected)] data-[state=checked]:text-foreground';

export function PipelineStageMenuRadioItem({
  stage,
}: {
  stage: Pick<CrmPipelineStage, 'id' | 'name' | 'color'>;
}) {
  return (
    <DropdownMenuRadioItem
      value={stage.id}
      className={cn(stageMenuItemClassName)}
      style={stageSelectItemStyle(stage.color)}
    >
      <StageColorDot color={stage.color} />
      {stage.name}
    </DropdownMenuRadioItem>
  );
}
