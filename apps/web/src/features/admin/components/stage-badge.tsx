import type { CrmPipelineStage } from '@/features/admin/crm/types';
import { stageColorPresentation } from '@/features/admin/crm/utils/stage-color';
import { cn } from '@/shared/lib/utils';

export function StageBadge({
  stage,
  className,
}: {
  stage: Pick<CrmPipelineStage, 'name' | 'color'> | null | undefined;
  className?: string;
}) {
  if (!stage) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  const palette = stageColorPresentation(stage.color);

  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center rounded-md border px-1.5 py-0.5 text-xs font-medium',
        className,
      )}
      style={{
        color: palette.accent,
        backgroundColor: palette.optionSelectedBackground,
        borderColor: palette.border,
      }}
    >
      <span className="truncate">{stage.name}</span>
    </span>
  );
}
