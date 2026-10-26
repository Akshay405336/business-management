'use client';

import { cn } from '@/shared/lib/utils';
import type { ProjectActionTarget } from '@/features/admin/projects/hooks/use-project-list-actions';
import type { ProjectTaskSummaryItem } from '../types';
import { ProjectTaskSummaryCard } from './project-task-summary-card';

export function ProjectGridView({
  items,
  actionsDisabled,
  onToggleActive,
  onEdit,
  onDelete,
  onLifecycleChange,
  className,
}: {
  items: readonly ProjectTaskSummaryItem[];
  actionsDisabled?: boolean;
  onToggleActive: (project: ProjectActionTarget) => void;
  onEdit: (id: string) => void;
  onDelete: (project: ProjectActionTarget) => void;
  onLifecycleChange?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid min-w-0 gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr))]',
        className,
      )}
    >
      {items.map((project) => (
        <ProjectTaskSummaryCard
          key={project.id}
          project={project}
          actionsDisabled={actionsDisabled}
          onToggleActive={onToggleActive}
          onEdit={onEdit}
          onDelete={onDelete}
          onLifecycleChange={onLifecycleChange}
        />
      ))}
    </div>
  );
}
