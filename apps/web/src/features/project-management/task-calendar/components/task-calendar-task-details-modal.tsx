'use client';

import type { TaskCalendarTaskDto } from '@techwin/contracts';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CrmFieldLabel } from '@/features/admin/crm/components/crm-feedback';
import { formatDisplayDate } from '@/features/admin/daily-tasks/utils/local-date';
import {
  LEAD_FORM_DIALOG_SHELL_CLASS,
  LEAD_FORM_PRIMARY_BTN,
  LEAD_FORM_SECONDARY_BTN,
} from '@/features/crm/leads/components/lead-form-dialog';
import {
  CRM_PIPELINE_FORM_FIELD_CLASS,
  CRM_PIPELINE_FORM_TEXTAREA_CLASS,
} from '@/features/crm/leads/utils/lead-constants';
import { cn } from '@/shared/lib/utils';
import {
  formatTaskCalendarTaskType,
  resolveTaskCalendarVisualStatus,
  taskCalendarUiStatusLabel,
  type TaskCalendarChipVisualStatus,
} from '../utils/calendar-task.utils';

const STATUS_BADGE: Record<TaskCalendarChipVisualStatus, string> = {
  OPEN: 'border-transparent bg-neutral-100 text-neutral-700',
  IN_PROGRESS: 'border-transparent bg-blue-50 text-blue-700',
  REVIEW: 'border-transparent bg-amber-50 text-amber-800',
  COMPLETED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

function ReadOnlyField({ value }: { value: string }) {
  return (
    <div className={cn(CRM_PIPELINE_FORM_FIELD_CLASS, 'text-foreground flex min-h-11 items-center px-3 text-sm')}>
      <span className="truncate">{value.trim() ? value : '—'}</span>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2">
      <CrmFieldLabel>{label}</CrmFieldLabel>
      <ReadOnlyField value={value} />
    </div>
  );
}

export function TaskCalendarTaskDetailsModal({
  task,
  open,
  onOpenChange,
}: {
  task: TaskCalendarTaskDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  if (!task) return null;

  const assignees = task.assigneeNames.join(', ');
  const taskId = task.reference?.trim() || '';
  const description = task.description.trim();
  const statusVisual = resolveTaskCalendarVisualStatus(task);
  const statusLabel = taskCalendarUiStatusLabel(task);
  const statusValue = [statusLabel, task.statusDetail?.trim(), task.statusLabel.trim()]
    .filter((part): part is string => Boolean(part))
    .filter((part, index, all) => all.indexOf(part) === index)
    .join(' · ');

  const primaryHref =
    task.navigation.kind === 'daily_task'
      ? `/admin/daily-tasks?date=${encodeURIComponent(task.assignDate)}&view=kanban&taskId=${encodeURIComponent(task.navigation.dailyTaskId)}&focus=board`
      : `/admin/project-tasks/${task.navigation.projectId}?taskId=${encodeURIComponent(task.navigation.projectTaskId)}&focus=board`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(LEAD_FORM_DIALOG_SHELL_CLASS, 'flex max-w-[640px] flex-col gap-0 p-0 sm:max-w-[640px]')}>
        <DialogHeader className="shrink-0 space-y-0 px-6 pt-6 pb-2 text-left">
          <DialogTitle className="text-foreground pr-10 text-xl font-semibold tracking-tight">
            {task.title}
          </DialogTitle>
          {task.projectName ? (
            <p className="text-muted-foreground pt-1 text-sm">
              Project <span className="text-foreground font-medium">{task.projectName}</span>
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {taskId ? <Badge variant="secondary">{taskId}</Badge> : null}
            <Badge className={STATUS_BADGE[statusVisual]}>{statusLabel}</Badge>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2">
          <div className="grid gap-4 pb-2">
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              <Field label="Source" value={task.source === 'DAILY_TASK' ? 'Daily task' : 'Project task'} />
              <Field label="Assignees" value={assignees} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              <Field label="Type" value={formatTaskCalendarTaskType(task.taskType)} />
              <Field
                label="Priority"
                value={task.priority
                  .replace(/_/g, ' ')
                  .toLowerCase()
                  .replace(/\b\w/g, (letter) => letter.toUpperCase())}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              <Field label="Status" value={statusValue} />
              <Field label="Assigned date" value={formatDisplayDate(task.assignDate)} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              <Field label="Due date" value={task.dueDate ? formatDisplayDate(task.dueDate) : ''} />
            </div>

            {description ? (
              <div className="grid gap-2">
                <CrmFieldLabel>Description</CrmFieldLabel>
                <div
                  className={cn(
                    CRM_PIPELINE_FORM_TEXTAREA_CLASS,
                    'text-foreground min-h-[5rem] px-3 py-2 text-sm whitespace-pre-wrap',
                  )}
                >
                  {description}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter className="shrink-0 flex-wrap gap-2 border-t border-border/60 px-6 py-4 sm:justify-end">
          <Button type="button" variant="outline" className={LEAD_FORM_SECONDARY_BTN} onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            type="button"
            className={cn('h-11 px-5', LEAD_FORM_PRIMARY_BTN)}
            onClick={() => {
              onOpenChange(false);
              router.push(primaryHref);
            }}
          >
            Open in Workspace
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
