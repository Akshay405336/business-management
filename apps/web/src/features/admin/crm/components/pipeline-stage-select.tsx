'use client';

import { SelectItem, SelectValue } from '@/components/ui/select';
import { cn } from '@/shared/lib/utils';
import type { CrmPipelineStage } from '../types';
import { normalizeStageColor, stageSelectItemStyle } from '../utils/stage-color';

const stageSelectItemClassName =
  'bg-card text-foreground focus:bg-[var(--stage-option-hover)] focus:text-foreground data-[highlighted]:bg-[var(--stage-option-hover)] data-[highlighted]:text-foreground data-[state=checked]:bg-[var(--stage-option-selected)] data-[state=checked]:text-foreground';

export function StageColorDot({
  color,
  className,
}: {
  color: string | null | undefined;
  className?: string;
}) {
  return (
    <span
      className={cn('size-2 shrink-0 rounded-full ring-1 ring-black/10', className)}
      style={{ backgroundColor: normalizeStageColor(color ?? undefined) }}
      aria-hidden="true"
    />
  );
}

export function PipelineStageSelectItem({
  stage,
}: {
  stage: Pick<CrmPipelineStage, 'id' | 'name' | 'color'>;
}) {
  return (
    <SelectItem
      value={stage.id}
      textValue={stage.name}
      className={stageSelectItemClassName}
      style={stageSelectItemStyle(stage.color)}
    >
      <span className="flex items-center gap-2">
        <StageColorDot color={stage.color} />
        <span>{stage.name}</span>
      </span>
    </SelectItem>
  );
}

export function PipelineStageSelectTrigger({
  placeholder,
}: {
  stages?: readonly Pick<CrmPipelineStage, 'id' | 'name' | 'color'>[];
  stageId?: string | undefined;
  placeholder?: string;
}) {
  return (
    <span className="flex min-w-0 flex-1 items-center overflow-hidden">
      <SelectValue placeholder={placeholder} />
    </span>
  );
}

export function PipelineStageSelectItems({
  stages,
}: {
  stages: readonly Pick<CrmPipelineStage, 'id' | 'name' | 'color'>[];
}) {
  return (
    <>
      {stages.map((stage) => (
        <PipelineStageSelectItem key={stage.id} stage={stage} />
      ))}
    </>
  );
}
