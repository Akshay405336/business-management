'use client';

import { createDailyTaskRequestSchema } from '@techwin/validation';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { useAdminToast } from '@/features/admin/components/toast';
import { CrmFormField } from '@/features/admin/crm/components/crm-feedback';
import {
  CRM_PIPELINE_FORM_DIALOG_CLASS,
  CRM_PIPELINE_FORM_FIELD_CLASS,
  CRM_PIPELINE_FORM_TEXTAREA_CLASS,
} from '@/features/admin/crm/constants';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { listEmployees } from '@/features/admin/employees/api/employees';
import { getProject, listProjects } from '@/features/admin/projects/api/projects';
import type { ProjectPhase } from '@/features/admin/projects/types';
import { cn } from '@/shared/lib/utils';
import { zodErrorToFieldMap } from '@/shared/form/zod-field-error';
import {
  createDailyTask,
  fetchDailyTaskWorkflowStages,
  moveDailyTaskStage,
  rescheduleDailyTask,
  updateDailyTask,
} from '../api/daily-tasks';
import type { DailyTaskListItem, DailyTaskType, DailyTaskWorkflowStage } from '../types';

const BTN_SECONDARY =
  'h-11 shrink-0 rounded-lg border border-input bg-card px-3.5 text-sm font-medium text-foreground shadow-none hover:bg-muted/50';
const BTN_PRIMARY =
  'border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900';

const CATEGORIES = [
  'DEVELOPMENT',
  'DESIGN',
  'TESTING',
  'DOCUMENTATION',
  'MEETING',
  'SUPPORT',
  'ADMINISTRATION',
  'RESEARCH',
  'OTHER',
] as const;

export function DailyTaskAssignDialog({
  open,
  assignDate,
  prefillWorkflowStageId,
  editTask,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  assignDate: string;
  prefillWorkflowStageId?: string | null;
  /** When set, the dialog edits this task instead of creating a new one. */
  editTask?: DailyTaskListItem | null;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void | Promise<void>;
}) {
  const isEdit = Boolean(editTask);
  const toast = useAdminToast();
  const pendingPhaseIdRef = useRef<string | null>(null);
  const { pending, run } = useAsyncAction();
  const [dailyStages, setDailyStages] = useState<readonly DailyTaskWorkflowStage[]>([]);
  const [employees, setEmployees] = useState<
    readonly { id: string; displayName: string; jobTitle: string }[]
  >([]);
  const [projects, setProjects] = useState<readonly { id: string; name: string }[]>([]);
  const [projectPhases, setProjectPhases] = useState<readonly ProjectPhase[]>([]);
  const [phasesLoading, setPhasesLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [type, setType] = useState<DailyTaskType>('GENERAL');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('DEVELOPMENT');
  const [workflowStageId, setWorkflowStageId] = useState('');
  const [projectPhaseId, setProjectPhaseId] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [projectId, setProjectId] = useState('');
  const [employeeIds, setEmployeeIds] = useState<string[]>([]);
  const [formAssignDate, setFormAssignDate] = useState(assignDate);
  const [dueDate, setDueDate] = useState('');

  const defaultDailyStageId = useMemo(
    () => dailyStages.find((s) => s.stageKey === 'todo')?.id ?? dailyStages[0]?.id ?? '',
    [dailyStages],
  );

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (editTask) {
      pendingPhaseIdRef.current = editTask.projectPhaseId;
      setType(editTask.type);
      setTitle(editTask.title);
      setDescription(editTask.description);
      setCategory(editTask.category ?? 'DEVELOPMENT');
      setPriority(editTask.priority);
      setProjectId(editTask.projectId ?? '');
      setEmployeeIds(editTask.assignees.map((a) => a.employeeId));
      setFormAssignDate(editTask.assignDate);
      setDueDate(editTask.dueDate ?? '');
    } else {
      pendingPhaseIdRef.current = null;
      setType('GENERAL');
      setTitle('');
      setDescription('');
      setCategory('DEVELOPMENT');
      setPriority('MEDIUM');
      setProjectId('');
      setEmployeeIds([]);
      setFormAssignDate(assignDate);
      setDueDate('');
    }
    void fetchDailyTaskWorkflowStages().then((r) => {
      setDailyStages(r.stages);
      const activeIds = new Set(r.stages.filter((s) => s.isActive).map((s) => s.id));
      const preferred = editTask?.workflowStageId ?? prefillWorkflowStageId;
      const prefill = preferred && activeIds.has(preferred) ? preferred : null;
      const fallback =
        prefill ??
        r.stages.find((s) => s.stageKey === 'todo' && s.isActive)?.id ??
        r.stages.find((s) => s.isActive)?.id ??
        '';
      if (fallback) setWorkflowStageId(fallback);
    });
    void listEmployees({ pageSize: 100, status: 'ACTIVE' }).then((r) => {
      const active = r.items.map((e) => ({ id: e.id, displayName: e.displayName, jobTitle: e.jobTitle }));
      const activeIds = new Set(active.map((e) => e.id));
      const assignedElsewhere = (editTask?.assignees ?? [])
        .filter((a) => !activeIds.has(a.employeeId))
        .map((a) => ({ id: a.employeeId, displayName: a.displayName, jobTitle: a.jobTitle }));
      setEmployees([...active, ...assignedElsewhere]);
    });
    void listProjects({ pageSize: 100, status: 'ACTIVE' }).then((r) => {
      const active = r.items.map((p) => ({ id: p.id, name: p.name }));
      const current =
        editTask?.projectId && !active.some((p) => p.id === editTask.projectId)
          ? [{ id: editTask.projectId, name: editTask.projectName ?? 'Current project' }]
          : [];
      setProjects([...active, ...current]);
    });
  }, [open, assignDate, prefillWorkflowStageId, editTask]);

  useEffect(() => {
    if (type !== 'PROJECT' || !projectId) {
      setProjectPhases([]);
      setProjectPhaseId('');
      return;
    }
    const pendingPhaseId = pendingPhaseIdRef.current;
    pendingPhaseIdRef.current = null;
    setProjectPhaseId(pendingPhaseId ?? '');
    setPhasesLoading(true);
    void getProject(projectId)
      .then((detail) => {
        const phases = [...detail.phases].sort((a, b) => a.sortOrder - b.sortOrder);
        setProjectPhases(phases);
      })
      .catch(() => {
        setProjectPhases([]);
        toast.error('Could not load project stages.');
      })
      .finally(() => setPhasesLoading(false));
  }, [type, projectId, toast]);

  const toggleEmployee = (id: string) => {
    setEmployeeIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  };

  const onSubmit = async () => {
    const payload =
      type === 'GENERAL'
        ? {
            type,
            title,
            description: description.trim() || undefined,
            category,
            workflowStageId: workflowStageId || defaultDailyStageId,
            priority,
            assignDate: formAssignDate,
            dueDate: dueDate.trim() ? dueDate : null,
            employeeIds,
          }
        : {
            type,
            title,
            description: description.trim() || undefined,
            category,
            projectId,
            projectPhaseId,
            workflowStageId: workflowStageId || defaultDailyStageId,
            priority,
            assignDate: formAssignDate,
            dueDate: dueDate.trim() ? dueDate : null,
            employeeIds,
          };

    const parsed = createDailyTaskRequestSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(zodErrorToFieldMap(parsed.error));
      return;
    }
    setErrors({});

    if (editTask) {
      const data = parsed.data;
      try {
        await run(async () => {
          await updateDailyTask(editTask.id, {
            title: data.title,
            description: description.trim(),
            category: data.category ?? null,
            priority: data.priority,
            dueDate: data.dueDate ?? null,
            employeeIds: data.employeeIds,
            ...(data.type === 'PROJECT'
              ? { projectId: data.projectId, projectPhaseId: data.projectPhaseId }
              : {}),
          });
          if (data.assignDate !== editTask.assignDate) {
            await rescheduleDailyTask(editTask.id, { assignDate: data.assignDate });
          }
          if (data.workflowStageId && data.workflowStageId !== editTask.workflowStageId) {
            await moveDailyTaskStage(editTask.id, { workflowStageId: data.workflowStageId });
          }
        });
        toast.success('Task updated.');
        onOpenChange(false);
        await onCreated();
      } catch {
        toast.error('Could not update task.');
      }
      return;
    }

    try {
      await run(() => createDailyTask(parsed.data));
      toast.success('Task assigned.');
      onOpenChange(false);
      setTitle('');
      setDescription('');
      setEmployeeIds([]);
      setProjectId('');
      setProjectPhaseId('');
      await onCreated();
    } catch {
      toast.error('Could not assign task.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(CRM_PIPELINE_FORM_DIALOG_CLASS, 'sm:max-w-xl')}>
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{isEdit ? 'Edit task' : 'Assign task'}</DialogTitle>
        </DialogHeader>
        <div className="grid max-h-[min(70vh,640px)] gap-4 overflow-y-auto px-6 py-2">
          <CrmFormField label="Task type" required>
            <Select
              value={type}
              disabled={isEdit}
              onValueChange={(v) => {
                const next = v as DailyTaskType;
                setType(next);
                setProjectPhaseId('');
                if (next === 'GENERAL') setProjectId('');
              }}
            >
              <SelectTrigger className={CRM_PIPELINE_FORM_FIELD_CLASS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GENERAL">General task</SelectItem>
                <SelectItem value="PROJECT">Project task</SelectItem>
              </SelectContent>
            </Select>
          </CrmFormField>
          {type === 'PROJECT' ? (
            <CrmFormField label="Project" required error={errors.projectId}>
              <Select
                value={projectId || '__none__'}
                onValueChange={(v) => setProjectId(v === '__none__' ? '' : v)}
              >
                <SelectTrigger className={CRM_PIPELINE_FORM_FIELD_CLASS}>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CrmFormField>
          ) : null}
          <CrmFormField label="Title" required error={errors.title}>
            <Input value={title} className={CRM_PIPELINE_FORM_FIELD_CLASS} onChange={(e) => setTitle(e.target.value)} />
          </CrmFormField>
          <CrmFormField label="Description" optional>
            <Textarea
              rows={3}
              value={description}
              className={CRM_PIPELINE_FORM_TEXTAREA_CLASS}
              onChange={(e) => setDescription(e.target.value)}
            />
          </CrmFormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <CrmFormField label="Category" optional>
              <Select value={category} onValueChange={(v) => setCategory(v as (typeof CATEGORIES)[number])}>
                <SelectTrigger className={CRM_PIPELINE_FORM_FIELD_CLASS}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.charAt(0) + c.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CrmFormField>
            <CrmFormField label="Daily workflow status" required error={errors.workflowStageId}>
              <Select value={workflowStageId} onValueChange={setWorkflowStageId}>
                <SelectTrigger className={CRM_PIPELINE_FORM_FIELD_CLASS}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dailyStages.filter((s) => s.isActive).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CrmFormField>
            {type === 'PROJECT' ? (
              <CrmFormField label="Project stage" required error={errors.projectPhaseId}>
                <Select
                  value={projectPhaseId || '__none__'}
                  onValueChange={(v) => setProjectPhaseId(v === '__none__' ? '' : v)}
                  disabled={!projectId || phasesLoading}
                >
                  <SelectTrigger className={CRM_PIPELINE_FORM_FIELD_CLASS}>
                    <SelectValue placeholder={phasesLoading ? 'Loading stages…' : 'Select stage'} />
                  </SelectTrigger>
                  <SelectContent>
                    {projectPhases.map((phase) => (
                      <SelectItem key={phase.id} value={phase.id}>
                        {phase.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CrmFormField>
            ) : null}
            <CrmFormField label="Priority" required>
              <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                <SelectTrigger className={CRM_PIPELINE_FORM_FIELD_CLASS}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((p) => (
                    <SelectItem key={p} value={p}>
                      {p.charAt(0) + p.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CrmFormField>
            <CrmFormField label="Assign date" required error={errors.assignDate}>
              <Input
                type="date"
                value={formAssignDate}
                className={CRM_PIPELINE_FORM_FIELD_CLASS}
                onChange={(e) => setFormAssignDate(e.target.value)}
              />
            </CrmFormField>
            <CrmFormField label="Due date" optional error={errors.dueDate}>
              <Input
                type="date"
                value={dueDate}
                className={CRM_PIPELINE_FORM_FIELD_CLASS}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </CrmFormField>
          </div>
          <CrmFormField label="Assign employees" required error={errors.employeeIds}>
            <div className="border-border max-h-40 overflow-y-auto rounded-lg border p-2">
              {employees.length === 0 ? (
                <p className="text-muted-foreground text-sm">No active employees found.</p>
              ) : (
                employees.map((employee) => (
                  <label key={employee.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50">
                    <input
                      type="checkbox"
                      checked={employeeIds.includes(employee.id)}
                      onChange={() => toggleEmployee(employee.id)}
                    />
                    <span className="text-sm font-medium">{employee.displayName}</span>
                    <span className="text-muted-foreground text-xs">{employee.jobTitle}</span>
                  </label>
                ))
              )}
            </div>
          </CrmFormField>
        </div>
        <DialogFooter className="gap-2 border-t px-6 py-4">
          <Button type="button" variant="outline" className={BTN_SECONDARY} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" className={cn('h-11 px-5', BTN_PRIMARY)} disabled={pending} onClick={() => void onSubmit()}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> {isEdit ? 'Saving…' : 'Assigning…'}
              </>
            ) : isEdit ? (
              'Save changes'
            ) : (
              'Assign task'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
