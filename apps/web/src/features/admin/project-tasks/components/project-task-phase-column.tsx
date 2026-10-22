'use client';

import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateOnly } from '@/features/admin/crm/utils/format';
import { stageKanbanColumnTheme } from '@/features/admin/crm/utils/stage-color';
import { labelProjectPhaseStatus } from '@/features/admin/projects/utils/labels';
import { cn } from '@/shared/lib/utils';
import type { ProjectTaskBoardPhase } from '../types';
import { projectPhaseAccentHex } from '../utils/phase-accent-color';

function PhaseAccentProgressBar({ percent, accent }: { percent: number; accent: string }) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div className="grid min-w-0 gap-1">
      <span className="text-muted-foreground text-[10px] tabular-nums">{clamped}%</span>
      <div
        className="h-1.5 w-full min-w-[4rem] overflow-hidden rounded-full bg-black/5"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${clamped}%`, backgroundColor: accent }}
        />
      </div>
    </div>
  );
}

export function ProjectTaskPhaseColumn({
  phase,
  isDropTarget = false,
  onAddTask,
  children,
}: {
  phase: ProjectTaskBoardPhase;
  isDropTarget?: boolean;
  onAddTask?: () => void;
  children: ReactNode;
}) {
  const accentHex = projectPhaseAccentHex(phase.sortOrder);
  const theme = stageKanbanColumnTheme(accentHex);
  const taskLabel = phase.taskCount === 1 ? '1 task' : `${phase.taskCount} tasks`;

  return (
    <div
      className={cn(
        'flex h-full min-h-0 w-[min(100vw-2rem,20rem)] shrink-0 flex-col overflow-hidden rounded-lg border shadow-xs transition-[box-shadow,ring-color]',
        'sm:w-[21.25rem]',
        isDropTarget && 'ring-2 ring-offset-1 ring-primary/30',
      )}
      style={{
        backgroundColor: theme.column.backgroundColor,
        borderColor: theme.column.borderColor,
      }}
    >
      <div
        className="border-b px-3 py-2.5"
        style={{
          backgroundColor: theme.header.backgroundColor,
          borderBottomColor: theme.header.borderBottomColor,
          borderTopWidth: 3,
          borderTopStyle: 'solid',
          borderTopColor: theme.accent,
        }}
      >
        <div className="flex items-start gap-2">
          <span
            className="mt-1.5 size-2 shrink-0 rounded-full"
            style={{ backgroundColor: theme.accent }}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-foreground truncate text-sm font-semibold leading-tight" title={phase.name}>
              {phase.sortOrder}. {phase.name}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-medium">
                {labelProjectPhaseStatus(phase.status)}
              </Badge>
              <span className="text-muted-foreground text-[10px] tabular-nums">
                {formatDateOnly(phase.startDate)} – {formatDateOnly(phase.expectedEndDate)}
              </span>
            </div>
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0 text-[10px]">
              <span>{taskLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="text-foreground font-medium tabular-nums">
                {phase.completedTaskCount}/{phase.taskCount} done
              </span>
            </div>
          </div>
          {onAddTask ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-7 shrink-0"
              aria-label={`Add task in ${phase.name}`}
              onClick={onAddTask}
            >
              <Plus className="size-3.5" />
            </Button>
          ) : null}
        </div>
        <div className="mt-2">
          <PhaseAccentProgressBar percent={phase.progressPercent} accent={theme.accent} />
        </div>
      </div>
      <div className="flex min-h-[12rem] min-w-0 flex-1 flex-col gap-2 overflow-y-auto p-2">{children}</div>
    </div>
  );
}
