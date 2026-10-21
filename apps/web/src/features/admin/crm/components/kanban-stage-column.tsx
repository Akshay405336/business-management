'use client';

import type { ReactNode } from 'react';
import type { CrmPipelineStage } from '../types';
import { mixStageColorWithWhite, stageKanbanColumnTheme } from '../utils/stage-color';
import { cn } from '@/shared/lib/utils';

export function KanbanStageColumn({
  stage,
  leadCount,
  isDropTarget = false,
  children,
}: {
  stage: CrmPipelineStage;
  leadCount: number;
  isDropTarget?: boolean;
  children: ReactNode;
}) {
  const theme = stageKanbanColumnTheme(stage.color);
  const columnStyle = isDropTarget
    ? { ...theme.column, backgroundColor: mixStageColorWithWhite(theme.accent, 0.11) }
    : theme.column;

  return (
    <div
      className={cn(
        'flex h-full min-h-0 w-[17.5rem] shrink-0 flex-col overflow-hidden rounded-lg border shadow-xs transition-colors',
        isDropTarget && 'ring-primary/25 ring-2',
      )}
      style={columnStyle}
    >
      <div
        className="flex items-center gap-2 border-b px-2.5 py-2"
        style={theme.header}
      >
        <span
          className="size-2 shrink-0 rounded-full ring-1 ring-black/10"
          style={{ backgroundColor: theme.accent }}
          aria-hidden="true"
        />
        <p className="text-foreground truncate text-sm font-medium">{stage.name}</p>
        <span className="text-foreground/80 bg-card/90 ml-auto rounded-md border border-black/5 px-1.5 py-0.5 text-[10px] font-medium tabular-nums shadow-xs">
          {leadCount}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-x-visible overflow-y-auto p-2">
        {children}
      </div>
    </div>
  );
}
