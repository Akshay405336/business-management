'use client';

import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';
import { GripVertical, MoreHorizontal, MoreVertical, Plus } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatProjectDateOnly } from '../utils/format-project-date';
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

function PlanPhaseTitle({
  name,
  onRenamePhase,
  renameDisabled,
}: {
  name: string;
  onRenamePhase?: (name: string) => void | Promise<void>;
  renameDisabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const canRename = Boolean(onRenamePhase) && !renameDisabled;

  useEffect(() => {
    setDraft(name);
  }, [name]);

  const cancel = () => {
    setDraft(name);
    setEditing(false);
  };

  const commit = () => {
    const trimmed = draft.trim();
    setEditing(false);
    if (!canRename || !onRenamePhase) return;
    if (!trimmed || trimmed === name) {
      setDraft(name);
      return;
    }
    void onRenamePhase(trimmed);
  };

  if (editing && canRename) {
    return (
      <div className="rounded-md py-0.5 shadow-[0_0_14px_-2px] shadow-sky-400/45 transition-shadow">
        <input
          autoFocus
          value={draft}
          aria-label="Phase name"
          className="text-foreground m-0 w-full min-w-0 border-0 bg-transparent p-0 text-sm font-semibold leading-tight outline-none ring-0 focus:ring-0 focus:outline-none"
          onChange={(event) => setDraft(event.target.value)}
          onFocus={(event) => event.target.select()}
          onBlur={() => commit()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commit();
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              cancel();
            }
          }}
        />
      </div>
    );
  }

  if (!canRename) {
    return (
      <p className="text-foreground truncate text-sm font-semibold leading-tight" title={name}>
        {name}
      </p>
    );
  }

  return (
    <button
      type="button"
      className="text-foreground m-0 w-full min-w-0 cursor-text truncate border-0 bg-transparent p-0 text-left text-sm font-semibold leading-tight shadow-none focus-visible:ring-0 focus-visible:outline-none"
      title={`Click to rename “${name}”`}
      onClick={() => {
        setDraft(name);
        setEditing(true);
      }}
    >
      {name}
    </button>
  );
}

export function ProjectTaskPhaseColumn({
  phase,
  variant = 'default',
  isDropTarget = false,
  onAddTask,
  onManagePhases,
  onDeletePhase,
  onRenamePhase,
  renameDisabled,
  displayOrder,
  columnDragHandle,
  children,
}: {
  phase: ProjectTaskBoardPhase;
  variant?: 'default' | 'plan';
  isDropTarget?: boolean;
  onAddTask?: () => void;
  onManagePhases?: () => void;
  onDeletePhase?: () => void;
  onRenamePhase?: (name: string) => void | Promise<void>;
  renameDisabled?: boolean;
  displayOrder?: number;
  columnDragHandle?: {
    attributes: DraggableAttributes;
    listeners: DraggableSyntheticListeners;
  };
  children: ReactNode;
}) {
  const accentHex = projectPhaseAccentHex(phase.sortOrder);
  const theme = stageKanbanColumnTheme(accentHex);
  const taskLabel = phase.taskCount === 1 ? '1 task' : `${phase.taskCount} tasks`;

  if (variant === 'plan') {
    return (
      <div
        className={cn(
          'flex h-full min-h-0 w-[min(100vw-2rem,18.5rem)] shrink-0 flex-col overflow-hidden rounded-xl border border-black/8 bg-white shadow-[0_1px_3px_rgb(15_23_42_/_0.06)] transition-[box-shadow,ring-color]',
          'sm:w-[19rem]',
          isDropTarget && 'ring-2 ring-primary/25 ring-offset-1',
        )}
      >
        <div className="border-border/60 border-b bg-white px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            {columnDragHandle ? (
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground shrink-0 cursor-grab touch-none rounded p-0.5 active:cursor-grabbing"
                aria-label={`Drag phase ${phase.name}`}
                {...columnDragHandle.attributes}
                {...columnDragHandle.listeners}
              >
                <GripVertical className="size-4" aria-hidden="true" />
              </button>
            ) : null}
            <div className="min-w-0 flex-1">
              <PlanPhaseTitle
                name={phase.name}
                onRenamePhase={onRenamePhase}
                renameDisabled={renameDisabled}
              />
              <p className="text-muted-foreground mt-0.5 text-[10px] tabular-nums">
                {formatProjectDateOnly(phase.startDate)} – {formatProjectDateOnly(phase.expectedEndDate)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              {onAddTask ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-7 shrink-0 rounded-md bg-neutral-950 text-white hover:bg-neutral-800 hover:text-white"
                  aria-label={`Add task in ${phase.name}`}
                  onClick={onAddTask}
                >
                  <Plus className="size-4" />
                </Button>
              ) : null}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="size-7 shrink-0 rounded-md border-black/12 bg-white text-foreground shadow-none hover:bg-white"
                    aria-label={`Phase actions for ${phase.name}`}
                  >
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[10rem]">
                  {onManagePhases ? (
                    <DropdownMenuItem onSelect={onManagePhases}>Manage phases</DropdownMenuItem>
                  ) : null}
                  {onDeletePhase ? (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      disabled={phase.taskCount > 0}
                      onSelect={onDeletePhase}
                    >
                      Delete phase
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        <div className="flex min-h-[14rem] min-w-0 flex-1 flex-col gap-2 overflow-y-auto bg-white p-2">
          {children}
        </div>
      </div>
    );
  }

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
                {formatProjectDateOnly(phase.startDate)} – {formatProjectDateOnly(phase.expectedEndDate)}
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
