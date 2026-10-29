'use client';

import { Calendar, Flag, PieChart, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ProjectDetail, ProjectPriority, ProjectStatus } from '@/features/admin/projects/types';
import { labelProjectPriority, labelProjectStatus } from '@/features/admin/projects/utils/labels';
import { cn } from '@/shared/lib/utils';
import { formatProjectDateOnly } from '../utils/format-project-date';
import {
  getProjectRemainingTimeLabel,
  localDateOnlyIso,
  projectDaysLeftToneClass,
} from '../utils/project-timeline-indicator';

const statusPillClass: Record<ProjectStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-800',
  INACTIVE: 'bg-zinc-100 text-zinc-700',
  ON_HOLD: 'bg-amber-50 text-amber-900',
  COMPLETED: 'bg-sky-50 text-sky-900',
  CANCELLED: 'bg-red-50 text-red-900',
};

const statusDotClass: Record<ProjectStatus, string> = {
  ACTIVE: 'bg-emerald-500',
  INACTIVE: 'bg-zinc-400',
  ON_HOLD: 'bg-amber-500',
  COMPLETED: 'bg-sky-500',
  CANCELLED: 'bg-red-500',
};

const priorityMetricTone: Record<
  ProjectPriority,
  { wrap: string; icon: string; value: string }
> = {
  LOW: { wrap: 'bg-slate-100', icon: 'text-slate-600', value: 'text-slate-800' },
  MEDIUM: { wrap: 'bg-orange-100', icon: 'text-orange-600', value: 'text-orange-700' },
  HIGH: { wrap: 'bg-orange-100', icon: 'text-orange-700', value: 'text-orange-800' },
  URGENT: { wrap: 'bg-red-100', icon: 'text-red-600', value: 'text-red-800' },
};

export function ProjectStatusPill({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        statusPillClass[status],
      )}
    >
      <span className={cn('size-1.5 shrink-0 rounded-full', statusDotClass[status])} aria-hidden="true" />
      {labelProjectStatus(status)}
    </span>
  );
}

function HeaderMetric({
  icon: Icon,
  iconWrapClassName,
  iconClassName,
  label,
  value,
  valueClassName,
}: {
  icon: LucideIcon;
  iconWrapClassName: string;
  iconClassName: string;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex min-w-0 max-w-max shrink-0 items-start gap-2">
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full',
          iconWrapClassName,
        )}
        aria-hidden="true"
      >
        <Icon className={cn('size-3.5', iconClassName)} />
      </span>
      <div className="min-w-0 leading-tight">
        <p className={cn('text-foreground truncate text-xs font-semibold tabular-nums', valueClassName)}>
          {value}
        </p>
        <p className="text-muted-foreground text-[11px]">{label}</p>
      </div>
    </div>
  );
}

/** Title + status + plan-style metrics (duration, remaining time, priority, manager). */
export function ProjectWorkspaceSummaryHeader({
  project,
  titleAs = 'h1',
  className,
}: {
  project: ProjectDetail;
  titleAs?: 'h1' | 'h2';
  className?: string;
}) {
  const description =
    project.description.trim() || project.scopeAndRequirements.trim() || null;
  const remainingTime = getProjectRemainingTimeLabel(project.startDate, project.expectedEndDate);
  const managerName = project.projectManagerName?.trim() || 'Unassigned';
  const priorityTone = priorityMetricTone[project.priority];
  const durationLabel = `${formatProjectDateOnly(project.startDate)} – ${formatProjectDateOnly(project.expectedEndDate)}`;
  const todayIso = localDateOnlyIso();
  const startDay = project.startDate.slice(0, 10);
  const remainingTimeCaption =
    startDay.length === 10 && todayIso < startDay ? 'Until expected start' : 'Remaining time';

  const TitleTag = titleAs;

  return (
    <header className={cn('border-border/70 shrink-0 border-b', className)}>
      <div className="px-4 py-3 sm:px-5">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <TitleTag className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
            {project.name}
          </TitleTag>
          <ProjectStatusPill status={project.status} />
        </div>
        {description ? (
          <p className="text-muted-foreground mt-2 max-w-3xl text-sm leading-relaxed">{description}</p>
        ) : null}
      </div>
      <div className="bg-muted/20 px-4 py-2.5 sm:px-5">
        <div className="flex flex-wrap items-start justify-start gap-x-6 gap-y-3 sm:gap-x-8 lg:gap-x-10">
          <HeaderMetric
            icon={Calendar}
            iconWrapClassName="bg-slate-100"
            iconClassName="text-slate-600"
            label="Project duration"
            value={durationLabel}
          />
          <HeaderMetric
            icon={PieChart}
            iconWrapClassName="bg-emerald-100"
            iconClassName="text-emerald-600"
            label={remainingTimeCaption}
            value={remainingTime?.label ?? '—'}
            valueClassName={
              remainingTime ? projectDaysLeftToneClass[remainingTime.tone] : undefined
            }
          />
          <HeaderMetric
            icon={Flag}
            iconWrapClassName={priorityTone.wrap}
            iconClassName={priorityTone.icon}
            label="Priority"
            value={`${labelProjectPriority(project.priority)} Priority`}
            valueClassName={priorityTone.value}
          />
          <HeaderMetric
            icon={UserRound}
            iconWrapClassName="bg-slate-100"
            iconClassName="text-slate-600"
            label="Project Manager"
            value={managerName}
          />
        </div>
      </div>
    </header>
  );
}
