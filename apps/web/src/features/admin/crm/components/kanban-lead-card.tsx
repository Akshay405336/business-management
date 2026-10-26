'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PointerEvent } from 'react';
import { ArrowRightLeft, Eye, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PriorityBadge } from '@/features/admin/components/priority-badge';
import {
  LeadEmailIconButton,
  LeadEmailTextRow,
  LeadPhoneTextRow,
  LeadWhatsAppIconButton,
  stopLeadCardPointer,
} from './lead-contact-quick-actions';
import { PipelineStageMenuRadioItem } from './pipeline-stage-menu-items';
import type { CrmLead, CrmPipelineStage } from '../types';

function stopCardPointer(event: PointerEvent) {
  stopLeadCardPointer(event);
}

function KanbanCardActions({
  lead,
  onView,
  onEdit,
  onDelete,
}: {
  lead: CrmLead;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="flex shrink-0 items-center gap-0"
      onPointerDown={stopCardPointer}
      onClick={(event) => event.stopPropagation()}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="size-6"
        aria-label={`View ${lead.fullName}`}
        title={`View ${lead.fullName}`}
        onClick={onView}
      >
        <Eye className="size-3.5" aria-hidden="true" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-6"
            aria-label={`Actions for ${lead.fullName}`}
            title="Lead actions"
          >
            <MoreVertical className="size-3.5" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[8rem]">
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil className="size-3.5" aria-hidden="true" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={onDelete}>
            <Trash2 className="size-3.5" aria-hidden="true" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function KanbanStageChangeButton({
  lead,
  stages,
  onStageChange,
}: {
  lead: CrmLead;
  stages: readonly CrmPipelineStage[];
  onStageChange: (stageId: string) => void;
}) {
  return (
    <div onPointerDown={stopCardPointer} onClick={(event) => event.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground size-6 shrink-0"
            aria-label="Change stage"
            title="Change stage"
          >
            <ArrowRightLeft className="size-3.5" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom" className="max-h-60 min-w-[10rem]">
          <DropdownMenuLabel className="text-muted-foreground text-xs">Move to stage</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={lead.stageId}
            onValueChange={(stageId) => {
              if (stageId && stageId !== lead.stageId) onStageChange(stageId);
            }}
          >
            {stages.map((stage) => (
              <PipelineStageMenuRadioItem key={stage.id} stage={stage} />
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function KanbanLeadCard({
  lead,
  stages,
  className,
  onView,
  onEdit,
  onDelete,
  onStageChange,
}: {
  lead: CrmLead;
  stages: readonly CrmPipelineStage[];
  className?: string;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStageChange: (stageId: string) => void;
}) {
  const company = lead.companyName?.trim();

  return (
    <div
      className={cn(
        'group bg-card hover:border-border/80 flex flex-col gap-1 rounded-md border border-black/8 p-2 shadow-sm transition-shadow hover:shadow-md',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <p className="min-w-0 flex-1 truncate text-base leading-tight font-medium">{lead.fullName}</p>
        <KanbanCardActions lead={lead} onView={onView} onEdit={onEdit} onDelete={onDelete} />
      </div>

      {company ? (
        <p className="text-muted-foreground truncate text-[13px] leading-tight">{company}</p>
      ) : null}

      <LeadPhoneTextRow phone={lead.phone} />
      <LeadEmailTextRow email={lead.email} />

      <div className="flex items-center justify-between gap-1">
        <PriorityBadge priority={lead.priority} className="px-1.5 py-0.5 leading-none" />
        <div className="flex shrink-0 items-center gap-0">
          <LeadWhatsAppIconButton phone={lead.phone} />
          <LeadEmailIconButton email={lead.email} />
          <KanbanStageChangeButton lead={lead} stages={stages} onStageChange={onStageChange} />
        </div>
      </div>
    </div>
  );
}

export function SortableKanbanLeadCard({
  lead,
  stages,
  disabled,
  onView,
  onEdit,
  onDelete,
  onStageChange,
}: {
  lead: CrmLead;
  stages: readonly CrmPipelineStage[];
  disabled?: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStageChange: (stageId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id: lead.id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('relative touch-none', isDragging && 'z-20')}
      {...attributes}
      {...listeners}
    >
      {isOver && !isDragging ? (
        <div
          className="bg-primary/70 pointer-events-none absolute -top-1 right-0 left-0 z-10 h-0.5 rounded-full"
          aria-hidden="true"
        />
      ) : null}
      <KanbanLeadCard
        lead={lead}
        stages={stages}
        className={cn(
          'cursor-grab active:cursor-grabbing',
          isDragging && 'opacity-40 shadow-none',
          isOver && !isDragging && 'border-primary/35',
        )}
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
        onStageChange={onStageChange}
      />
    </div>
  );
}
