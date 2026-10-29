'use client';

import { MoreHorizontal, MoreVertical, Pencil, Power, Trash2 } from 'lucide-react';
import type { PointerEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/shared/lib/utils';
import type { ProjectActionTarget } from '../hooks/use-project-list-actions';

function stopMenuPointer(event: PointerEvent) {
  event.stopPropagation();
}

export function ProjectCardActionsMenu({
  project,
  disabled,
  editDisabled,
  variant = 'default',
  onToggleActive,
  onEdit,
  onDelete,
}: {
  project: ProjectActionTarget;
  disabled?: boolean;
  editDisabled?: boolean;
  variant?: 'default' | 'kanban';
  onToggleActive: (project: ProjectActionTarget) => void;
  onEdit: (id: string) => void;
  onDelete: (project: ProjectActionTarget) => void;
}) {
  const isActive = project.status === 'ACTIVE';

  const MenuIcon = variant === 'kanban' ? MoreHorizontal : MoreVertical;

  return (
    <div
      className={cn(variant === 'kanban' && 'relative z-[2] flex shrink-0 items-center pr-1.5')}
      onPointerDown={stopMenuPointer}
      onClick={(event) => event.stopPropagation()}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={cn(
              'size-7 shrink-0',
              variant === 'kanban' &&
                'text-muted-foreground hover:text-foreground rounded-md hover:bg-black/5',
            )}
            disabled={disabled}
            aria-label={`Actions for ${project.name}`}
            title={variant === 'kanban' ? 'Project actions' : undefined}
          >
            <MenuIcon className="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[10rem]">
          <DropdownMenuItem
            disabled={disabled}
            onSelect={() => onToggleActive(project)}
          >
            <Power className="size-3.5" aria-hidden="true" />
            {isActive ? 'Deactivate' : 'Activate'}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={disabled || editDisabled}
            onSelect={() => onEdit(project.id)}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            disabled={disabled}
            onSelect={() => onDelete(project)}
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
