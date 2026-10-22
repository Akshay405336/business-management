'use client';

import type { ReactNode } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Layers,
  ListTodo,
  Pencil,
  Plus,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatDateOnly } from '@/features/admin/crm/utils/format';
import { ProjectPriorityBadge } from '@/features/admin/projects/components/project-priority-badge';
import { ProjectStatusBadge } from '@/features/admin/projects/components/project-status-badge';
import { cn } from '@/shared/lib/utils';
import type { ProjectTaskBoardResponse } from '../types';
import {
  getProjectTimelineIndicator,
  projectTimelineIndicatorClass,
} from '../utils/project-timeline-indicator';

function MetricSeparator() {
  return <span className="bg-border hidden h-3.5 w-px shrink-0 sm:block" aria-hidden="true" />;
}

function InlineMetric({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof TrendingUp;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs">
      <Icon className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-foreground flex min-w-0 items-center gap-1.5 font-medium tabular-nums">
        {children}
      </span>
    </div>
  );
}

export function ProjectBoardOverview({
  board,
  onAddTask,
  addTaskDisabled,
  className,
}: {
  board: ProjectTaskBoardResponse;
  onAddTask: () => void;
  addTaskDisabled?: boolean;
  className?: string;
}) {
  const { project } = board;
  const clampedProgress = Math.min(100, Math.max(0, project.progressPercent));

  const timeline = getProjectTimelineIndicator({
    startDate: project.startDate,
    expectedEndDate: project.expectedEndDate,
    status: project.status,
  });

  return (
    <section
      className={cn(
        'border-border/60 bg-card/40 max-w-full min-w-0 rounded-lg border px-3 py-2.5 sm:px-4',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Button variant="outline" size="sm" className="h-8 shrink-0 px-2.5" asChild>
                <Link href="/admin/project-tasks">
                  <ArrowLeft className="size-3.5" aria-hidden="true" />
                  Back to projects
                </Link>
              </Button>
              <span className="text-muted-foreground text-xs font-medium tabular-nums">
                {project.projectNumber}
              </span>
            </div>
            <h1 className="text-foreground min-w-0 text-lg font-semibold tracking-tight sm:text-xl">
              {project.name}
            </h1>
            <div className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0 text-sm">
              <span className="truncate">{project.clientName}</span>
              {project.companyName?.trim() ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{project.companyName}</span>
                </>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="h-8"
              onClick={onAddTask}
              disabled={addTaskDisabled}
            >
              <Plus className="size-3.5" aria-hidden="true" />
              Add Task
            </Button>
            <Button variant="outline" size="sm" className="h-8" asChild>
            <Link href={`/admin/project-tasks?edit=${project.id}`}>
              <Pencil className="size-3.5" aria-hidden="true" />
              Edit project
            </Link>
            </Button>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <ProjectStatusBadge status={project.status} />
          <ProjectPriorityBadge priority={project.priority} />
          <span className="text-muted-foreground hidden text-xs sm:inline" aria-hidden="true">
            ·
          </span>
          <p className="text-foreground text-xs font-medium tabular-nums">
            {formatDateOnly(project.startDate)} – {formatDateOnly(project.expectedEndDate)}
          </p>
          {timeline ? (
            <span
              className={cn(
                'inline-flex max-w-full items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium leading-tight',
                projectTimelineIndicatorClass[timeline.variant],
              )}
            >
              {timeline.label}
            </span>
          ) : null}
        </div>

        <div className="border-border/60 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 border-t pt-2 sm:gap-x-4">
          <InlineMetric icon={TrendingUp} label="Progress">
            <span>{clampedProgress}%</span>
            <div
              className="bg-muted h-1 w-16 min-w-[3.5rem] overflow-hidden rounded-full sm:w-20"
              role="progressbar"
              aria-valuenow={clampedProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Overall progress ${clampedProgress} percent`}
            >
              <div
                className="bg-primary h-full rounded-full transition-[width]"
                style={{ width: `${clampedProgress}%` }}
              />
            </div>
          </InlineMetric>
          <MetricSeparator />
          <InlineMetric icon={Layers} label="Phases">
            {project.phaseCount}
          </InlineMetric>
          <MetricSeparator />
          <InlineMetric icon={ListTodo} label="Tasks">
            {project.taskCount}
          </InlineMetric>
          <MetricSeparator />
          <InlineMetric icon={CheckCircle2} label="Completed">
            {project.completedTaskCount}/{project.taskCount}
          </InlineMetric>
        </div>
      </div>
    </section>
  );
}
