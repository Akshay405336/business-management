'use client';

import {
  collectTaskPhaseDateFieldErrors,
  createProjectTaskRequestSchema,
  updateProjectTaskRequestSchema,
  type UpdateProjectTaskRequest,
} from '@techwin/validation';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  CRM_PIPELINE_FORM_FIELD_CLASS,
  CRM_PIPELINE_FORM_TEXTAREA_CLASS,
} from '@/features/admin/crm/constants';
import { CrmFieldLabel, CrmInlineFieldError } from '@/features/admin/crm/components/crm-feedback';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import { formatProjectDateOnly } from '../utils/format-project-date';
import { EmployeeAssigneeSelect } from '@/features/admin/employees/components/employee-assignee-select';
import { focusFirstInvalidField, formControlStateClass } from '@/shared/form/form-control-state';
import { zodIssuesToFieldMap } from '@/shared/form/zod-field-error';
import { cn } from '@/shared/lib/utils';
import { useAdminToast } from '@/features/admin/components/toast';
import {
  PROJECT_TASK_FORM_DIALOG_CLASS,
  PROJECT_TASK_FORM_PRIMARY_BTN,
  PROJECT_TASK_FORM_SECONDARY_BTN,
  PROJECT_TASK_PRIORITIES,
  PROJECT_TASK_STATUSES,
} from '../constants';
import type { ProjectTask, ProjectTaskBoardPhase } from '../types';
import { labelProjectTaskPriority, labelProjectTaskStatus } from '../utils/labels';

type FormState = {
  title: string;
  phaseId: string;
  priority: (typeof PROJECT_TASK_PRIORITIES)[number];
  status: (typeof PROJECT_TASK_STATUSES)[number];
  description: string;
  assigneeAdminId: string;
  startDate: string;
  dueDate: string;
  labelsText: string;
};

const emptyForm = (phaseId: string, phases: readonly ProjectTaskBoardPhase[]): FormState => {
  const phase = phases.find((entry) => entry.id === phaseId);
  return {
    title: '',
    phaseId,
    priority: 'MEDIUM',
    status: 'TODO',
    description: '',
    assigneeAdminId: '',
    startDate: phase?.startDate ?? '',
    dueDate: phase?.expectedEndDate ?? '',
    labelsText: '',
  };
};

function taskToForm(task: ProjectTask): FormState {
  return {
    title: task.title,
    phaseId: task.phaseId,
    priority: task.priority,
    status: task.status,
    description: task.description,
    assigneeAdminId: task.assigneeAdminId ?? '',
    startDate: task.startDate ?? '',
    dueDate: task.dueDate ?? '',
    labelsText: task.labels.join(', '),
  };
}

function formToPayload(form: FormState) {
  const labels = form.labelsText
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    title: form.title.trim(),
    phaseId: form.phaseId,
    priority: form.priority,
    status: form.status,
    description: form.description.trim() || undefined,
    assigneeAdminId: form.assigneeAdminId.trim() ? form.assigneeAdminId : null,
    startDate: form.startDate.trim() || null,
    dueDate: form.dueDate.trim() || null,
    labels,
  };
}

const SELECT_TRIGGER_CLASS = cn(
  CRM_PIPELINE_FORM_FIELD_CLASS,
  'w-full border-0 shadow-none data-[placeholder]:text-muted-foreground/55',
);

export type ProjectTaskFormMode = 'plan' | 'execution' | 'readonly';

export function ProjectTaskFormDialog({
  open,
  onOpenChange,
  phases,
  editingTask,
  defaultPhaseId,
  mode = 'plan',
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phases: readonly ProjectTaskBoardPhase[];
  editingTask: ProjectTask | null;
  defaultPhaseId?: string;
  mode?: ProjectTaskFormMode;
  onSubmit: (payload: ReturnType<typeof formToPayload>) => Promise<void>;
}) {
  const toast = useAdminToast();
  const { pending, run } = useAsyncAction();
  const [form, setForm] = useState<FormState>(() =>
    emptyForm(defaultPhaseId ?? phases[0]?.id ?? '', phases),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form when dialog opens
    setFieldErrors({});
    if (editingTask) setForm(taskToForm(editingTask));
    else setForm(emptyForm(defaultPhaseId ?? phases[0]?.id ?? '', phases));
  }, [open, editingTask, defaultPhaseId, phases]);

  const executionOnly = mode === 'execution';
  const planOnly = mode === 'plan';
  const viewOnly = mode === 'readonly';
  const title = viewOnly
    ? 'Task details'
    : editingTask
      ? executionOnly
        ? 'Update task progress'
        : 'Edit task'
      : 'Add task';

  const handleSave = async () => {
    if (viewOnly) return;
    const fullPayload = formToPayload(form);
    const payload: UpdateProjectTaskRequest =
      executionOnly && editingTask
        ? {
            status: fullPayload.status,
            assigneeAdminId: fullPayload.assigneeAdminId,
            labels: fullPayload.labels,
          }
        : fullPayload;
    const schema = editingTask ? updateProjectTaskRequestSchema : createProjectTaskRequestSchema;
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      setFieldErrors(zodIssuesToFieldMap(parsed.error));
      focusFirstInvalidField();
      return;
    }

    const selectedPhase = phases.find((phase) => phase.id === form.phaseId);
    if (selectedPhase && !executionOnly) {
      const phaseDateErrors = collectTaskPhaseDateFieldErrors(
        { startDate: form.startDate, dueDate: form.dueDate },
        {
          phaseStartDate: selectedPhase.startDate,
          phaseExpectedEndDate: selectedPhase.expectedEndDate,
        },
      );
      if (phaseDateErrors.startDate || phaseDateErrors.dueDate) {
        setFieldErrors(phaseDateErrors);
        focusFirstInvalidField();
        return;
      }
    }

    setFieldErrors({});
    try {
      await run(() => onSubmit(parsed.data as ReturnType<typeof formToPayload>));
      onOpenChange(false);
    } catch (error) {
      toast.error(describeCrmError(error));
    }
  };

  const phaseOptions = useMemo(() => phases.map((p) => ({ id: p.id, name: p.name })), [phases]);
  const selectedPhase = useMemo(
    () => phases.find((phase) => phase.id === form.phaseId),
    [form.phaseId, phases],
  );
  const phaseDateHint = selectedPhase
    ? `Task dates must stay within ${formatProjectDateOnly(selectedPhase.startDate)} – ${formatProjectDateOnly(selectedPhase.expectedEndDate)}.`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={PROJECT_TASK_FORM_DIALOG_CLASS}>
        <DialogHeader className="shrink-0 space-y-0 px-6 pt-6 pb-2 text-left">
          <DialogTitle className="text-foreground pr-10 text-xl font-semibold tracking-tight">
            {title}
          </DialogTitle>
          {!viewOnly ? (
            <p className="text-muted-foreground pt-1 text-sm">
              {executionOnly
                ? 'Update status and assignee during production. Planned task details stay locked.'
                : 'Tasks belong to a project phase. Start and due dates must fall within that phase’s schedule.'}
            </p>
          ) : null}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <CrmFieldLabel htmlFor="task-title" required>
                Title
              </CrmFieldLabel>
              <Input
                id="task-title"
                value={form.title}
                disabled={executionOnly || viewOnly || pending}
                aria-invalid={Boolean(fieldErrors.title)}
                className={cn(
                  CRM_PIPELINE_FORM_FIELD_CLASS,
                  formControlStateClass(fieldErrors.title ? 'invalid' : 'neutral'),
                )}
                onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
              />
              <CrmInlineFieldError message={fieldErrors.title} reserveSpace={false} />
            </div>

            <div className="grid gap-2">
              <CrmFieldLabel htmlFor="task-phase" required>
                Phase
              </CrmFieldLabel>
              <Select
                value={form.phaseId}
                disabled={executionOnly || viewOnly || pending}
                onValueChange={(value) => setForm((c) => ({ ...c, phaseId: value }))}
              >
                <SelectTrigger
                  id="task-phase"
                  aria-invalid={Boolean(fieldErrors.phaseId)}
                  className={cn(
                    SELECT_TRIGGER_CLASS,
                    formControlStateClass(fieldErrors.phaseId ? 'invalid' : 'neutral'),
                  )}
                >
                  <SelectValue placeholder="Select phase" />
                </SelectTrigger>
                <SelectContent>
                  {phaseOptions.map((phase) => (
                    <SelectItem key={phase.id} value={phase.id}>
                      {phase.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <CrmInlineFieldError message={fieldErrors.phaseId} reserveSpace={false} />
            </div>

            <div
              className={cn(
                'grid gap-2',
                !planOnly && 'sm:grid-cols-2 sm:gap-3',
              )}
            >
              <div className="grid gap-2">
                <CrmFieldLabel htmlFor="task-priority" required>
                  Priority
                </CrmFieldLabel>
                <Select
                  value={form.priority}
                  disabled={executionOnly || viewOnly || pending}
                  onValueChange={(value) =>
                    setForm((c) => ({ ...c, priority: value as FormState['priority'] }))
                  }
                >
                  <SelectTrigger id="task-priority" className={SELECT_TRIGGER_CLASS}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TASK_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {labelProjectTaskPriority(p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!planOnly ? (
                <div className="grid gap-2">
                  <CrmFieldLabel htmlFor="task-status" required>
                    Status
                  </CrmFieldLabel>
                  <Select
                    value={form.status}
                    disabled={viewOnly || pending}
                    onValueChange={(value) =>
                      setForm((c) => ({ ...c, status: value as FormState['status'] }))
                    }
                  >
                    <SelectTrigger id="task-status" className={SELECT_TRIGGER_CLASS}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_TASK_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {labelProjectTaskStatus(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>

            <div className="grid gap-2">
              <CrmFieldLabel htmlFor="task-assignee" optional>
                Assignee
              </CrmFieldLabel>
              <EmployeeAssigneeSelect
                id="task-assignee"
                value={form.assigneeAdminId}
                disabled={viewOnly || pending}
                invalid={Boolean(fieldErrors.assigneeAdminId)}
                onChange={(assigneeAdminId) => setForm((c) => ({ ...c, assigneeAdminId }))}
              />
              <CrmInlineFieldError message={fieldErrors.assigneeAdminId} reserveSpace={false} />
            </div>

            <div className="grid gap-2">
              {phaseDateHint && !executionOnly && !viewOnly ? (
                <p className="text-muted-foreground text-xs leading-snug">{phaseDateHint}</p>
              ) : null}
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <div className="grid gap-2">
                  <CrmFieldLabel htmlFor="task-start" optional>
                    Start date
                  </CrmFieldLabel>
                  <Input
                    id="task-start"
                    type="date"
                    value={form.startDate}
                    min={selectedPhase?.startDate}
                    max={selectedPhase?.expectedEndDate}
                    disabled={executionOnly || viewOnly || pending}
                    aria-invalid={Boolean(fieldErrors.startDate)}
                    className={cn(
                      CRM_PIPELINE_FORM_FIELD_CLASS,
                      formControlStateClass(fieldErrors.startDate ? 'invalid' : 'neutral'),
                    )}
                    onChange={(e) => setForm((c) => ({ ...c, startDate: e.target.value }))}
                  />
                  <CrmInlineFieldError message={fieldErrors.startDate} reserveSpace={false} />
                </div>
                <div className="grid gap-2">
                  <CrmFieldLabel htmlFor="task-due" optional>
                    Due date
                  </CrmFieldLabel>
                  <Input
                    id="task-due"
                    type="date"
                    value={form.dueDate}
                    min={selectedPhase?.startDate}
                    max={selectedPhase?.expectedEndDate}
                    disabled={executionOnly || viewOnly || pending}
                    aria-invalid={Boolean(fieldErrors.dueDate)}
                    className={cn(
                      CRM_PIPELINE_FORM_FIELD_CLASS,
                      formControlStateClass(fieldErrors.dueDate ? 'invalid' : 'neutral'),
                    )}
                    onChange={(e) => setForm((c) => ({ ...c, dueDate: e.target.value }))}
                  />
                  <CrmInlineFieldError message={fieldErrors.dueDate} reserveSpace={false} />
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <CrmFieldLabel htmlFor="task-description" optional>
                Description
              </CrmFieldLabel>
              <Textarea
                id="task-description"
                rows={3}
                value={form.description}
                disabled={executionOnly || viewOnly || pending}
                className={CRM_PIPELINE_FORM_TEXTAREA_CLASS}
                onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <CrmFieldLabel htmlFor="task-labels" optional>
                Labels
              </CrmFieldLabel>
              <Input
                id="task-labels"
                placeholder="Comma-separated labels"
                value={form.labelsText}
                disabled={viewOnly || pending}
                className={CRM_PIPELINE_FORM_FIELD_CLASS}
                onChange={(e) => setForm((c) => ({ ...c, labelsText: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border/60 px-6 py-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className={PROJECT_TASK_FORM_SECONDARY_BTN}
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          {!viewOnly ? (
            <Button
              type="button"
              className={cn(PROJECT_TASK_FORM_PRIMARY_BTN)}
              disabled={pending}
              onClick={() => void handleSave()}
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Saving…
                </>
              ) : executionOnly ? (
                'Save progress'
              ) : editingTask ? (
                'Save changes'
              ) : (
                'Add task'
              )}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
