'use client';

import {
  createProjectTaskRequestSchema,
  updateProjectTaskRequestSchema,
} from '@techwin/validation';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { CrmFormField, CrmInlineFieldError } from '@/features/admin/crm/components/crm-feedback';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import { listProjectManagers } from '@/features/admin/projects/api/projects';
import { focusFirstInvalidField } from '@/shared/form/form-control-state';
import { formGridClass, formGridFullWidthClass } from '@/shared/form/form-layout';
import { zodIssuesToFieldMap } from '@/shared/form/zod-field-error';
import { useAdminToast } from '@/features/admin/components/toast';
import { PROJECT_TASK_FORM_DIALOG_CLASS, PROJECT_TASK_PRIORITIES, PROJECT_TASK_STATUSES } from '../constants';
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

const emptyForm = (phaseId: string): FormState => ({
  title: '',
  phaseId,
  priority: 'MEDIUM',
  status: 'TODO',
  description: '',
  assigneeAdminId: '',
  startDate: '',
  dueDate: '',
  labelsText: '',
});

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

export function ProjectTaskFormDialog({
  open,
  onOpenChange,
  phases,
  editingTask,
  defaultPhaseId,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phases: readonly ProjectTaskBoardPhase[];
  editingTask: ProjectTask | null;
  defaultPhaseId?: string;
  onSubmit: (payload: ReturnType<typeof formToPayload>) => Promise<void>;
}) {
  const toast = useAdminToast();
  const { pending, run } = useAsyncAction();
  const [form, setForm] = useState<FormState>(() =>
    emptyForm(defaultPhaseId ?? phases[0]?.id ?? ''),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [managers, setManagers] = useState<readonly { id: string; displayName: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form when dialog opens
    setFieldErrors({});
    if (editingTask) setForm(taskToForm(editingTask));
    else setForm(emptyForm(defaultPhaseId ?? phases[0]?.id ?? ''));
    void listProjectManagers().then((res) => setManagers(res.managers));
  }, [open, editingTask, defaultPhaseId, phases]);

  const title = editingTask ? 'Edit task' : 'Add task';

  const handleSave = async () => {
    const payload = formToPayload(form);
    const schema = editingTask ? updateProjectTaskRequestSchema : createProjectTaskRequestSchema;
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      setFieldErrors(zodIssuesToFieldMap(parsed.error));
      focusFirstInvalidField();
      return;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={PROJECT_TASK_FORM_DIALOG_CLASS}>
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Tasks belong to a project phase. Dates and assignee are optional.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto px-6 pb-2">
          <div className={formGridClass}>
            <CrmFormField label="Title" required className={formGridFullWidthClass}>
              <Input
                value={form.title}
                onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
              />
              <CrmInlineFieldError message={fieldErrors.title} />
            </CrmFormField>
            <CrmFormField label="Phase" required className={formGridFullWidthClass}>
              <Select
                value={form.phaseId}
                onValueChange={(value) => setForm((c) => ({ ...c, phaseId: value }))}
              >
                <SelectTrigger>
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
              <CrmInlineFieldError message={fieldErrors.phaseId} />
            </CrmFormField>
            <CrmFormField label="Priority" required>
              <Select
                value={form.priority}
                onValueChange={(value) =>
                  setForm((c) => ({ ...c, priority: value as FormState['priority'] }))
                }
              >
                <SelectTrigger>
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
            </CrmFormField>
            <CrmFormField label="Status" required>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((c) => ({ ...c, status: value as FormState['status'] }))
                }
              >
                <SelectTrigger>
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
            </CrmFormField>
            <CrmFormField label="Assignee" className={formGridFullWidthClass}>
              <Select
                value={form.assigneeAdminId || '__none__'}
                onValueChange={(value) =>
                  setForm((c) => ({
                    ...c,
                    assigneeAdminId: value === '__none__' ? '' : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Unassigned</SelectItem>
                  {managers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CrmFormField>
            <CrmFormField label="Start date">
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((c) => ({ ...c, startDate: e.target.value }))}
              />
              <CrmInlineFieldError message={fieldErrors.startDate} />
            </CrmFormField>
            <CrmFormField label="Due date">
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((c) => ({ ...c, dueDate: e.target.value }))}
              />
              <CrmInlineFieldError message={fieldErrors.dueDate} />
            </CrmFormField>
            <CrmFormField label="Description" className={formGridFullWidthClass}>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
              />
            </CrmFormField>
            <CrmFormField label="Labels" className={formGridFullWidthClass}>
              <Input
                placeholder="Comma-separated labels"
                value={form.labelsText}
                onChange={(e) => setForm((c) => ({ ...c, labelsText: e.target.value }))}
              />
            </CrmFormField>
          </div>
        </div>
        <DialogFooter className="px-6 pb-6">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={pending} onClick={() => void handleSave()}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
