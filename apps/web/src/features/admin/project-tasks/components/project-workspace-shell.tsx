'use client';

import {
  Calendar,
  Flag,
  PieChart,
  PlayCircle,
  SquarePen,
  ToggleLeft,
  ToggleRight,
  Trash2,
  UserRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { AdminBreadcrumb } from '@/features/admin/components/admin-page-header';
import { TableIconButton } from '@/features/admin/components/table-icon-button';
import { formatProjectDateOnly, formatProjectDateTime } from '../utils/format-project-date';
import { isProjectPlanLocked } from '@/features/admin/projects/constants/plan-lock';
import type { ProjectActionTarget } from '@/features/admin/projects/hooks/use-project-list-actions';
import type { ProjectDetail, ProjectPriority, ProjectStatus } from '@/features/admin/projects/types';
import { labelProjectPriority, labelProjectStatus } from '@/features/admin/projects/utils/labels';
import { cn } from '@/shared/lib/utils';
import {
  describeProductionStartVsPlan,
  getProjectRemainingTimeLabel,
  localDateOnlyIso,
  projectDaysLeftToneClass,
  projectProductionStartVarianceClass,
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
  LOW: {
    wrap: 'bg-slate-100',
    icon: 'text-slate-600',
    value: 'text-slate-800',
  },
  MEDIUM: {
    wrap: 'bg-orange-100',
    icon: 'text-orange-600',
    value: 'text-orange-700',
  },
  HIGH: {
    wrap: 'bg-orange-100',
    icon: 'text-orange-700',
    value: 'text-orange-800',
  },
  URGENT: {
    wrap: 'bg-red-100',
    icon: 'text-red-600',
    value: 'text-red-800',
  },
};

function ProjectStatusPill({ status }: { status: ProjectStatus }) {
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
  labelFirst = false,
}: {
  icon: LucideIcon;
  iconWrapClassName: string;
  iconClassName: string;
  label: string;
  value: string;
  valueClassName?: string;
  /** When true, caption is above the value (production dates). */
  labelFirst?: boolean;
}) {
  const caption = (
    <p className="text-muted-foreground text-[11px] leading-snug">{label}</p>
  );
  const reading = (
    <p
      className={cn(
        'text-foreground text-xs font-semibold tabular-nums',
        labelFirst ? 'mt-0.5 whitespace-nowrap' : 'truncate',
        valueClassName,
      )}
    >
      {value}
    </p>
  );

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
        {labelFirst ? (
          <>
            {caption}
            {reading}
          </>
        ) : (
          <>
            {reading}
            {caption}
          </>
        )}
      </div>
    </div>
  );
}

export function ProjectWorkspaceShell({
  project,
  breadcrumbTail,
  actionsDisabled,
  onToggleActive,
  onEditProject,
  onDeleteProject,
  children,
}: {
  project: ProjectDetail;
  /** e.g. `Plan` or `Production` — shown after the project name in breadcrumbs. */
  breadcrumbTail?: string;
  actionsDisabled?: boolean;
  onToggleActive: (target: ProjectActionTarget) => void;
  onEditProject: () => void;
  onDeleteProject: (target: ProjectActionTarget) => void;
  children: ReactNode;
}) {
  const actionTarget: ProjectActionTarget = {
    id: project.id,
    name: project.name,
    projectNumber: project.projectNumber,
    status: project.status,
  };

  const description =
    project.description.trim() || project.scopeAndRequirements.trim() || null;
  const remainingTime = getProjectRemainingTimeLabel(project.startDate, project.expectedEndDate);
  const editLocked = isProjectPlanLocked(project.executionLifecycle);
  const managerName = project.projectManagerName?.trim() || 'Unassigned';
  const priorityTone = priorityMetricTone[project.priority];
  const durationLabel = `${formatProjectDateOnly(project.startDate)} – ${formatProjectDateOnly(project.expectedEndDate)}`;
  const todayIso = localDateOnlyIso();
  const startDay = project.startDate.slice(0, 10);
  const remainingTimeCaption =
    startDay.length === 10 && todayIso < startDay ? 'Until expected start' : 'Remaining time';
  const isProductionWorkspace = breadcrumbTail === 'Production';
  const productionStartedLabel = project.actualProductionStartedAt
    ? formatProjectDateTime(project.actualProductionStartedAt).replace(', ', ' ')
    : '—';
  const productionStartVariance = isProductionWorkspace
    ? describeProductionStartVsPlan(project.startDate, project.actualProductionStartedAt)
    : null;
  const showProductionStartVariance =
    productionStartVariance !== null &&
    productionStartVariance !== 'Started on planned date';

  return (
    <div className="grid w-full min-w-0 max-w-full gap-2 pt-1">
      <AdminBreadcrumb
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Project Tasks', href: '/admin/project-tasks' },
          ...(breadcrumbTail
            ? [
                { label: project.name, href: `/admin/project-tasks/${project.id}` },
                { label: breadcrumbTail },
              ]
            : [{ label: project.name }]),
        ]}
        className="mb-0.5"
      />

      <section className="workspace-surface min-w-0">
        <div className="rounded-lg">
          <header className="border-border/70 border-b">
            <div className="relative px-4 py-3 sm:px-5">
              <div className="absolute top-2.5 right-3 flex items-center gap-0.5 sm:top-3 sm:right-4">
                <TableIconButton
                  label={
                    project.status === 'ACTIVE'
                      ? `Deactivate ${project.name}`
                      : `Activate ${project.name}`
                  }
                  className={
                    project.status === 'ACTIVE'
                      ? 'text-red-800 hover:bg-red-800/10 hover:text-red-900'
                      : 'text-emerald-800 hover:bg-emerald-800/10 hover:text-emerald-900'
                  }
                  disabled={actionsDisabled}
                  onClick={() => onToggleActive(actionTarget)}
                >
                  {project.status === 'ACTIVE' ? (
                    <ToggleRight className="size-4 stroke-[2]" aria-hidden="true" />
                  ) : (
                    <ToggleLeft className="size-4 stroke-[2]" aria-hidden="true" />
                  )}
                </TableIconButton>
                <TableIconButton
                  label={`Edit ${project.name}`}
                  className="text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
                  disabled={actionsDisabled || editLocked}
                  onClick={onEditProject}
                >
                  <SquarePen className="size-4" aria-hidden="true" />
                </TableIconButton>
                <TableIconButton
                  label={`Delete ${project.name}`}
                  className="text-neutral-900 hover:bg-neutral-900/10 hover:text-black"
                  disabled={actionsDisabled}
                  onClick={() => onDeleteProject(actionTarget)}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </TableIconButton>
              </div>

              <div className="min-w-0 space-y-2 pr-0 sm:pr-28">
                <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                  <h1 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
                    {project.name}
                  </h1>
                  <ProjectStatusPill status={project.status} />
                  {showProductionStartVariance ? (
                    <span
                      className={cn(
                        'text-xs font-semibold tabular-nums',
                        projectProductionStartVarianceClass,
                      )}
                    >
                      {productionStartVariance}
                    </span>
                  ) : null}
                </div>
                {description ? (
                  <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed">{description}</p>
                ) : null}
              </div>
            </div>

            <div className="bg-muted/20 px-4 py-2.5 sm:px-5">
              <div className="flex flex-wrap items-start justify-start gap-x-6 gap-y-3 sm:gap-x-8 lg:gap-x-10">
                {isProductionWorkspace ? (
                  <>
                    <HeaderMetric
                      icon={Calendar}
                      iconWrapClassName="bg-slate-100"
                      iconClassName="text-slate-600"
                      label="Planned date"
                      value={durationLabel}
                      labelFirst
                    />
                    <HeaderMetric
                      icon={PlayCircle}
                      iconWrapClassName="bg-blue-100"
                      iconClassName="text-blue-600"
                      label="Production started"
                      value={productionStartedLabel}
                      labelFirst
                    />
                  </>
                ) : (
                  <>
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
                  </>
                )}
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

          <div className="min-w-0 px-4 py-3 sm:px-5">{children}</div>
        </div>
      </section>
    </div>
  );
}
