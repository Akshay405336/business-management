'use client';

import { MoreVertical, Pencil, Power, Trash2 } from 'lucide-react';
import type { PointerEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ProjectActionTarget } from '../hooks/use-project-list-actions';

function stopMenuPointer(event: PointerEvent) {
  event.stopPropagation();
}

export function ProjectCardActionsMenu({
  project,
  disabled,
  onToggleActive,
  onEdit,
  onDelete,
}: {
  project: ProjectActionTarget;
  disabled?: boolean;
  onToggleActive: (project: ProjectActionTarget) => void;
  onEdit: (id: string) => void;
  onDelete: (project: ProjectActionTarget) => void;
}) {
  const isActive = project.status === 'ACTIVE';

  return (
    <div onPointerDown={stopMenuPointer} onClick={(event) => event.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7 shrink-0"
            disabled={disabled}
            aria-label={`Actions for ${project.name}`}
          >
            <MoreVertical className="size-4" aria-hidden="true" />
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
          <DropdownMenuItem disabled={disabled} onSelect={() => onEdit(project.id)}>
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
