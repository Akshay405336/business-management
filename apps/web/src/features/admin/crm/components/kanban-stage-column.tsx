'use client';

import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import type { CrmPipelineStage } from '../types';
import { mixStageColorWithWhite, stageKanbanColumnTheme } from '../utils/stage-color';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/components/ui/button';

export function KanbanStageColumn({
  stage,
  leadCount,
  isDropTarget = false,
  onAddLead,
  children,
}: {
  stage: CrmPipelineStage;
  leadCount: number;
  isDropTarget?: boolean;
  onAddLead?: () => void;
  children: ReactNode;
}) {
  const theme = stageKanbanColumnTheme(stage.color);
  const columnBackground = isDropTarget
    ? mixStageColorWithWhite(theme.accent, 0.11)
    : theme.column.backgroundColor!;
  const columnStyle = isDropTarget
    ? { ...theme.column, backgroundColor: columnBackground }
    : theme.column;
  const headerBackground = theme.header.backgroundColor!;

  return (
    <div
      className={cn(
        'flex h-full min-h-0 w-[18.5rem] shrink-0 flex-col overflow-hidden rounded-xl shadow-[0_2px_16px_-6px_rgb(15_23_42_/_0.12)] transition-[box-shadow,ring-color]',
        isDropTarget && 'ring-primary/30 ring-2',
      )}
      style={columnStyle}
    >
      <div className="flex items-start gap-2 px-3 pt-2.5 pb-1" style={theme.header}>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <h3 className="text-foreground truncate text-base font-semibold tracking-tight">
            {stage.name}
          </h3>
          <span className="bg-card/95 text-foreground/80 rounded-full border border-black/5 px-2 py-0.5 text-[11px] font-medium tabular-nums shadow-xs">
            {leadCount}
          </span>
        </div>
        {onAddLead ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 shrink-0 rounded-lg border-dashed border-black/15 bg-card/80 shadow-none hover:bg-card"
            aria-label={`Add lead to ${stage.name}`}
            title={`Add lead to ${stage.name}`}
            onClick={onAddLead}
          >
            <Plus className="size-4" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      <div
        aria-hidden
        className="h-2 shrink-0"
        style={{
          background: `linear-gradient(to bottom, ${headerBackground}, ${columnBackground})`,
        }}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-x-visible overflow-y-auto px-2.5 pt-1 pb-2.5">
        {children}
      </div>
    </div>
  );
}
