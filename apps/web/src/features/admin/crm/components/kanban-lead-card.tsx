'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PointerEvent } from 'react';
import {
  ArrowRightLeft,
  Calendar,
  Eye,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Trash2,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { initialsOf } from '@/shared/lib/format';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LeadEmailIconButton,
  LeadWhatsAppIconButton,
  stopLeadCardPointer,
} from './lead-contact-quick-actions';
import {
  KANBAN_LEAD_CARD_BORDER_CLASS,
  KANBAN_LEAD_HEADER_HEIGHT_CLASS,
  KanbanLeadHeaderStepBorder,
  KanbanLeadPriorityHeader,
  KanbanLeadPriorityTab,
} from './kanban-lead-priority-badge';
import { PipelineStageMenuRadioItem } from './pipeline-stage-menu-items';
import type { CrmLead, CrmPipelineStage } from '../types';

const leadDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function formatLeadDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : leadDateFormatter.format(date);
}

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
      className="relative z-[2] flex shrink-0 items-center pr-1.5"
      onPointerDown={stopCardPointer}
      onClick={(event) => event.stopPropagation()}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground size-7 rounded-md hover:bg-black/5"
            aria-label={`Actions for ${lead.fullName}`}
            title="Lead actions"
          >
            <MoreHorizontal className="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[8rem]">
          <DropdownMenuItem onSelect={onView}>
            <Eye className="size-3.5" aria-hidden="true" />
            View
          </DropdownMenuItem>
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
            className="text-muted-foreground hover:text-foreground size-7 shrink-0 rounded-md hover:bg-black/5"
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
  const subject = lead.subject.trim();
  const phone = lead.phone?.trim() ?? '';
  const email = lead.email?.trim() ?? '';
  const displaySubject = subject || 'Untitled lead';

  return (
    <article
      className={cn(
        'group flex flex-col overflow-hidden rounded-tl-[18px] rounded-bl-[18px] rounded-br-[18px] bg-transparent shadow-[0_4px_20px_-10px_rgb(15_23_42_/_0.12)] transition-shadow hover:shadow-[0_8px_24px_-8px_rgb(15_23_42_/_0.16)]',
        KANBAN_LEAD_CARD_BORDER_CLASS,
        className,
      )}
    >
      <div className={cn('relative shrink-0 bg-transparent', KANBAN_LEAD_HEADER_HEIGHT_CLASS)}>
        <KanbanLeadPriorityTab priority={lead.priority} />
        <KanbanLeadHeaderStepBorder />
        <div className={cn('relative flex w-full', KANBAN_LEAD_HEADER_HEIGHT_CLASS)}>
          <KanbanLeadPriorityHeader priority={lead.priority} />
          <div className="relative z-[2] min-w-0 flex-1 self-stretch bg-transparent">
            <div className="flex h-full items-center justify-end bg-transparent pr-0.5">
              <KanbanCardActions
                lead={lead}
                onView={onView}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card relative z-[1] flex flex-col gap-2.5 rounded-b-[17px] px-3 pt-2 pb-3">
        <h3 className="text-foreground line-clamp-2 text-[15px] leading-snug font-bold tracking-tight">
          {displaySubject}
        </h3>

        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
              aria-hidden="true"
            >
              {initialsOf(lead.fullName)}
            </span>
            <span className="text-muted-foreground truncate text-xs font-medium">{lead.fullName}</span>
          </div>
          <div className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-xs">
            <Calendar className="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
            <time dateTime={lead.createdAt} className="whitespace-nowrap tabular-nums">
              {formatLeadDate(lead.createdAt)}
            </time>
          </div>
        </div>

        <div className="border-border/60 border-t pt-2.5">
          <div className="flex items-end justify-between gap-2">
            <div className="text-muted-foreground flex min-w-0 flex-col gap-1 text-[10px] leading-snug">
              <div className="flex min-w-0 items-center gap-1.5">
                <Phone className="size-3 shrink-0 opacity-75" aria-hidden="true" />
                <span className="truncate tabular-nums">{phone || '—'}</span>
              </div>
              <div className="flex min-w-0 items-center gap-1.5">
                <Mail className="size-3 shrink-0 opacity-75" aria-hidden="true" />
                <span className="truncate">{email || '—'}</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-0">
              <LeadWhatsAppIconButton phone={lead.phone} />
              <LeadEmailIconButton email={lead.email} />
              <KanbanStageChangeButton lead={lead} stages={stages} onStageChange={onStageChange} />
            </div>
          </div>
        </div>
      </div>
    </article>
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
          isOver && !isDragging && 'ring-primary/25 ring-2',
        )}
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
        onStageChange={onStageChange}
      />
    </div>
  );
}
