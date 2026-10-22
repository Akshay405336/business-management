'use client';

import { FolderKanban, Pencil, Power, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import {
  DataTable,
  deriveDataTablePhase,
  isDataTableRefreshing,
} from '@/features/admin/components/data-table';
import { CRM_PROJECTS_TABLE_SKELETON } from '@/features/admin/components/data-table-presets';
import { TableIconButton } from '@/features/admin/components/table-icon-button';
import { formatDateOnly } from '@/features/admin/crm/utils/format';
import { ProjectPriorityBadge } from '@/features/admin/projects/components/project-priority-badge';
import { ProjectProgressBar } from '@/features/admin/projects/components/project-progress-bar';
import { ProjectStatusBadge } from '@/features/admin/projects/components/project-status-badge';
import type { ProjectActionTarget } from '@/features/admin/projects/hooks/use-project-list-actions';
import type { ProjectTaskSummaryItem } from '../types';

export function ProjectListView({
  items,
  loading,
  error,
  filtersActive,
  actionsDisabled,
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
      className="min-w-0 max-w-full"
      tableClassName="table-fixed min-w-[56rem]"
      phase={tablePhase}
      colSpan={8}
      skeletonColumns={CRM_PROJECTS_TABLE_SKELETON}
      header={
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-[20%]">Project</TableHead>
          <TableHead className="w-[18%]">Client</TableHead>
          <TableHead className="w-[10%]">Phases</TableHead>
          <TableHead className="w-[10%]">Priority</TableHead>
          <TableHead className="w-[14%]">Progress</TableHead>
          <TableHead className="w-[11%]">Start date</TableHead>
          <TableHead className="w-[10%]">Status</TableHead>
          <TableHead className="w-[11rem] min-w-[11rem] text-right">Actions</TableHead>
        </TableRow>
      }
      empty={{
        title: filtersActive ? 'No results match your filters' : 'No projects yet',
        description: filtersActive
          ? 'Try different search terms, another tab, or clear filters.'
          : 'Create your first project to start managing delivery phases.',
        secondaryAction: filtersActive ? { label: 'Clear filters', onClick: onClearFilters } : undefined,
      }}
      errorMessage={error}
      onRetry={onRetry}
      refreshing={tableRefreshing}
    >
      {items.map((project) => {
        const target = toActionTarget(project);
        const boardHref = `/admin/project-tasks/${project.id}`;
        return (
          <TableRow key={project.id}>
            <TableCell className="min-w-0">
              <div className="grid min-w-0">
                <span className="truncate font-medium">{project.name}</span>
                <span className="text-muted-foreground truncate text-xs tabular-nums">
                  {project.projectNumber}
                </span>
              </div>
            </TableCell>
            <TableCell className="min-w-0">
              <div className="grid min-w-0">
                <span className="truncate">{project.clientName}</span>
                {project.companyName?.trim() ? (
                  <span className="text-muted-foreground truncate text-xs">{project.companyName}</span>
                ) : null}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="secondary" className="font-normal">
                {project.phaseCount} {project.phaseCount === 1 ? 'phase' : 'phases'}
              </Badge>
            </TableCell>
            <TableCell>
              <ProjectPriorityBadge priority={project.priority} />
            </TableCell>
            <TableCell>
              <ProjectProgressBar percent={project.progressPercent} />
            </TableCell>
            <TableCell className="text-muted-foreground whitespace-nowrap text-sm tabular-nums">
              {project.startDate ? formatDateOnly(project.startDate) : '—'}
            </TableCell>
            <TableCell className="align-middle">
              <ProjectStatusBadge status={project.status} />
            </TableCell>
            <TableCell className="w-[11rem] min-w-[11rem] align-middle text-right">
              <div className="flex shrink-0 items-center justify-end gap-1">
                <TableIconButton
                  className="size-8 shrink-0"
                  label="Open project board"
                  asChild
                >
                  <Link href={boardHref}>
                    <FolderKanban className="size-4" aria-hidden="true" />
                  </Link>
                </TableIconButton>
                <TableIconButton
                  className="size-8 shrink-0"
                  label={project.status === 'ACTIVE' ? 'Deactivate project' : 'Activate project'}
                  disabled={actionsDisabled}
                  onClick={() => onToggleActive(target)}
                >
                  <Power className="size-4" aria-hidden="true" />
                </TableIconButton>
                <TableIconButton
                  className="size-8 shrink-0"
                  label="Edit project"
                  disabled={actionsDisabled}
                  onClick={() => onEdit(project.id)}
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </TableIconButton>
                <TableIconButton
                  className="size-8 shrink-0"
                  label="Delete project"
                  tone="danger"
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
