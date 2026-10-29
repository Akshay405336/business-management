'use client';

import { FolderKanban, SquarePen, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DataTable,
  deriveDataTablePhase,
  isDataTableRefreshing,
} from '@/features/admin/components/data-table';
import {
  CRM_PROJECTS_TABLE_COLUMN_CLASS,
  CRM_PROJECTS_TABLE_SKELETON,
} from '@/features/admin/components/data-table-presets';
import { TableIconButton } from '@/features/admin/components/table-icon-button';
import { TablePagination } from '@/features/admin/components/table-pagination';
import { formatProjectDateOnly } from '../utils/format-project-date';
import { ProjectPriorityBadge } from '@/features/admin/projects/components/project-priority-badge';
import { ProjectProgressBar } from '@/features/admin/projects/components/project-progress-bar';
import { isProjectPlanLocked } from '@/features/admin/projects/constants/plan-lock';
import { ProjectStatusBadge } from '@/features/admin/projects/components/project-status-badge';
import type { ProjectActionTarget } from '@/features/admin/projects/hooks/use-project-list-actions';
import { cn } from '@/shared/lib/utils';
import type { ProjectTaskSummaryItem } from '../types';

export function ProjectListView({
  items,
  loading,
  error,
  filtersActive,
  actionsDisabled,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  onToggleActive,
  onEdit,
  onDelete,
  onClearFilters,
  onRetry,
}: {
  items: readonly ProjectTaskSummaryItem[];
  loading: boolean;
  error: string | null;
  filtersActive: boolean;
  actionsDisabled?: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onToggleActive: (project: ProjectActionTarget) => void;
  onEdit: (id: string) => void;
  onDelete: (project: ProjectActionTarget) => void;
  onClearFilters: () => void;
  onRetry: () => void;
}) {
  const tablePhase = deriveDataTablePhase({
    loading,
    error,
    rowCount: items.length,
  });
  const tableRefreshing = isDataTableRefreshing({ loading, rowCount: items.length });

  const toActionTarget = (project: ProjectTaskSummaryItem): ProjectActionTarget => ({
    id: project.id,
    name: project.name,
    projectNumber: project.projectNumber,
    status: project.status,
  });

  return (
    <DataTable
      frame="flush"
      headerVariant="plain"
      className="min-w-0 max-w-full gap-0"
      tableClassName="table-fixed [&_[data-slot=table-head]]:h-auto [&_[data-slot=table-head]]:py-3 [&_[data-slot=table-cell]]:py-3"
      tableBodyClassName="[&_[data-slot=table-row]]:border-0 [&_[data-slot=table-row]:hover]:bg-[#f5f5f5]"
      phase={tablePhase}
      colSpan={8}
      skeletonColumns={CRM_PROJECTS_TABLE_SKELETON}
      header={
        <TableRow className="hover:bg-transparent">
          <TableHead className={CRM_PROJECTS_TABLE_COLUMN_CLASS.project}>Project</TableHead>
          <TableHead className={CRM_PROJECTS_TABLE_COLUMN_CLASS.client}>Client</TableHead>
          <TableHead className={CRM_PROJECTS_TABLE_COLUMN_CLASS.phases}>Phases</TableHead>
          <TableHead className={CRM_PROJECTS_TABLE_COLUMN_CLASS.priority}>Priority</TableHead>
          <TableHead className={CRM_PROJECTS_TABLE_COLUMN_CLASS.progress}>Progress</TableHead>
          <TableHead className={cn(CRM_PROJECTS_TABLE_COLUMN_CLASS.startDate, 'whitespace-nowrap')}>
            Start date
          </TableHead>
          <TableHead className={cn(CRM_PROJECTS_TABLE_COLUMN_CLASS.status, 'whitespace-nowrap')}>
            Status
          </TableHead>
          <TableHead
            className={cn(CRM_PROJECTS_TABLE_COLUMN_CLASS.actions, 'text-right')}
          >
            Actions
          </TableHead>
        </TableRow>
      }
      empty={{
        title: filtersActive ? 'No results match your filters' : 'No projects yet',
        description: filtersActive
          ? 'Try different search terms, another tab, or clear filters.'
          : 'Create your first project to start managing delivery.',
        secondaryAction: filtersActive
          ? { label: 'Clear filters', onClick: onClearFilters }
          : undefined,
      }}
      errorMessage={error}
      onRetry={onRetry}
      refreshing={tableRefreshing}
      footer={
        <TablePagination
          className="border-border border-t px-4 py-3 sm:px-5"
          page={page}
          pageSize={pageSize}
          total={total}
          loading={tablePhase === 'initial-loading'}
          hideWhenEmpty={false}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      }
    >
      {items.map((project) => {
        const target = toActionTarget(project);
        const boardHref =
          project.executionLifecycle === 'NOT_PLANNED' || project.executionLifecycle === 'PLANNED'
            ? `/admin/project-tasks/${project.id}/plan`
            : `/admin/project-tasks/${project.id}`;
        const editLocked = isProjectPlanLocked(project.executionLifecycle);
        return (
          <TableRow key={project.id} className="border-0">
            <TableCell className={cn(CRM_PROJECTS_TABLE_COLUMN_CLASS.project, 'min-w-0')}>
              <div className="grid min-w-0 gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-foreground block truncate text-[13px] font-semibold">
                      {project.name}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">{project.name}</TooltipContent>
                </Tooltip>
                <span className="text-muted-foreground truncate font-mono text-xs tabular-nums">
                  {project.projectNumber}
                </span>
              </div>
            </TableCell>
            <TableCell className={cn(CRM_PROJECTS_TABLE_COLUMN_CLASS.client, 'min-w-0 align-middle')}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="block truncate text-sm">{project.clientName}</span>
                </TooltipTrigger>
                <TooltipContent side="top">{project.clientName}</TooltipContent>
              </Tooltip>
            </TableCell>
            <TableCell className={cn(CRM_PROJECTS_TABLE_COLUMN_CLASS.phases, 'align-middle')}>
              <Badge variant="secondary" className="font-normal tabular-nums">
                {project.phaseCount}
              </Badge>
            </TableCell>
            <TableCell className={cn(CRM_PROJECTS_TABLE_COLUMN_CLASS.priority, 'align-middle')}>
              <ProjectPriorityBadge priority={project.priority} />
            </TableCell>
            <TableCell className={cn(CRM_PROJECTS_TABLE_COLUMN_CLASS.progress, 'align-middle')}>
              <ProjectProgressBar percent={project.progressPercent} />
            </TableCell>
            <TableCell
              className={cn(
                CRM_PROJECTS_TABLE_COLUMN_CLASS.startDate,
                'text-muted-foreground align-middle text-sm tabular-nums whitespace-nowrap',
              )}
            >
              {project.startDate ? formatProjectDateOnly(project.startDate) : '—'}
            </TableCell>
            <TableCell className={cn(CRM_PROJECTS_TABLE_COLUMN_CLASS.status, 'align-middle')}>
              <ProjectStatusBadge status={project.status} />
            </TableCell>
            <TableCell className={cn(CRM_PROJECTS_TABLE_COLUMN_CLASS.actions, 'min-w-0 pl-4')}>
              <div className="flex w-full shrink-0 items-center justify-end gap-1">
                <TableIconButton label={`Open ${project.name}`} asChild>
                  <Link href={boardHref}>
                    <FolderKanban className="size-4 stroke-[2]" aria-hidden="true" />
                  </Link>
                </TableIconButton>
                <TableIconButton
                  label={
                    project.status === 'ACTIVE'
                      ? `Deactivate ${project.name}`
                      : `Activate ${project.name}`
                  }
                  tone="default"
                  className={
                    project.status === 'ACTIVE'
                      ? 'text-red-800 hover:bg-red-800/10 hover:text-red-900'
                      : 'text-emerald-800 hover:bg-emerald-800/10 hover:text-emerald-900'
                  }
                  disabled={actionsDisabled}
                  onClick={() => onToggleActive(target)}
                >
                  {project.status === 'ACTIVE' ? (
                    <ToggleRight className="size-4 stroke-[2]" aria-hidden="true" />
                  ) : (
                    <ToggleLeft className="size-4 stroke-[2]" aria-hidden="true" />
                  )}
                </TableIconButton>
                <TableIconButton
                  label={`Edit ${project.name}`}
                  tone="default"
                  className="text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
                  disabled={actionsDisabled || editLocked}
                  onClick={() => onEdit(project.id)}
                >
                  <SquarePen className="size-4" aria-hidden="true" />
                </TableIconButton>
                <TableIconButton
                  label={`Delete ${project.name}`}
                  tone="default"
                  className="text-neutral-900 hover:bg-neutral-900/10 hover:text-black"
                  disabled={actionsDisabled}
                  onClick={() => onDelete(target)}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </TableIconButton>
              </div>
            </TableCell>
          </TableRow>
        );
      })}
    </DataTable>
  );
}
