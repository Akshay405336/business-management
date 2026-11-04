'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { hasDailyTaskUpdateStatusPermission } from '@techwin/contracts';
import { usePermissions } from '@/features/auth/components/permissions-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useAdminToast } from '@/features/admin/components/toast';
import { EmployeeAvatar } from '@/features/admin/employees/components/employee-avatar';
import { getProject } from '@/features/admin/projects/api/projects';
import type { ProjectPhase } from '@/features/admin/projects/types';
import {
  addDailyTaskComment,
  deleteDailyTask,
  fetchDailyTask,
  fetchDailyTaskActivities,
  moveDailyTaskStage,
  rescheduleDailyTask,
  updateDailyTask,
} from '../api/daily-tasks';
import type { DailyTaskActivityItem, DailyTaskDetail, DailyTaskWorkflowStage } from '../types';
import { priorityBadgeClass } from '../utils/stage-colors';
import { DailyTaskActivityPanel } from './daily-task-activity-panel';

export function DailyTaskDetailDrawer({
  taskId,
  open,
  stages,
  onOpenChange,
  onChanged,
  focusReschedule = false,
  employeeMode = false,
}: {
  taskId: string | null;
  open: boolean;
  stages: readonly DailyTaskWorkflowStage[];
  onOpenChange: (open: boolean) => void;
  onChanged: () => void | Promise<void>;
  focusReschedule?: boolean;
  employeeMode?: boolean;
}) {
  const toast = useAdminToast();
  const { has, permissionSet } = usePermissions();
  const canUpdateStatus =
    has('tasks.update') || hasDailyTaskUpdateStatusPermission(permissionSet);
  const canManage = !employeeMode && (has('tasks.update') || has('tasks.delete'));
  const canDelete = !employeeMode && has('tasks.delete');
  const rescheduleRef = useRef<HTMLDivElement>(null);
  const [task, setTask] = useState<DailyTaskDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [projectPhases, setProjectPhases] = useState<readonly ProjectPhase[]>([]);
  const [activities, setActivities] = useState<readonly DailyTaskActivityItem[]>([]);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  useEffect(() => {
    if (!open || !taskId) {
      setTask(null);
      setActivities([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    void Promise.all([
      fetchDailyTask(taskId, controller.signal),
      fetchDailyTaskActivities(taskId, controller.signal),
    ])
      .then(([detail, activityResponse]) => {
        setTask(detail);
        setActivities(activityResponse.items);
        setRescheduleDate(detail.assignDate);
        if (!employeeMode && detail.type === 'PROJECT' && detail.projectId) {
          void getProject(detail.projectId).then((p) =>
            setProjectPhases([...p.phases].sort((a, b) => a.sortOrder - b.sortOrder)),
          );
        } else {
          setProjectPhases([]);
        }
      })
      .catch(() => toast.error('Could not load task.'))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [employeeMode, open, taskId, toast]);

  useEffect(() => {
    if (!open || !focusReschedule || loading) return;
    rescheduleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [open, focusReschedule, loading, task]);

  const onWorkflowChange = async (value: string) => {
    if (!task) return;
    try {
      const updated = await moveDailyTaskStage(task.id, { workflowStageId: value });
      setTask(updated);
      await onChanged();
    } catch {
      toast.error('Could not update workflow status.');
    }
  };

  const onProjectPhaseChange = async (value: string) => {
    if (!task || task.type !== 'PROJECT') return;
    try {
      const updated = await updateDailyTask(task.id, { projectPhaseId: value });
      setTask(updated);
      await onChanged();
    } catch {
      toast.error('Could not update project stage.');
    }
  };

  const onReschedule = async () => {
    if (!task || !rescheduleDate || rescheduleDate === task.assignDate) return;
    try {
      const updated = await rescheduleDailyTask(task.id, { assignDate: rescheduleDate });
      setTask(updated);
      toast.success('Task rescheduled.');
      await onChanged();
    } catch {
      toast.error('Could not reschedule task.');
    }
  };

  const onAddNote = async () => {
    if (!task || !noteDraft.trim()) return;
    setNoteSaving(true);
    try {
      const scope = employeeMode ? 'employee' : has('tasks.update') ? 'admin' : 'employee';
      const updated = await addDailyTaskComment(task.id, { text: noteDraft.trim(), scope });
      setTask(updated);
      setNoteDraft('');
      const activityResponse = await fetchDailyTaskActivities(task.id);
      setActivities(activityResponse.items);
      toast.success('Note saved.');
      await onChanged();
    } catch {
      toast.error('Could not save note.');
    } finally {
      setNoteSaving(false);
    }
  };

  const onDelete = async () => {
    if (!task || !canDelete) return;
    if (!window.confirm('Delete this task? This cannot be undone.')) return;
    try {
      await deleteDailyTask(task.id);
      toast.success('Task deleted.');
      onOpenChange(false);
      await onChanged();
    } catch {
      toast.error('Could not delete task.');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-lg">
        <div className="border-b px-6 py-4">
          <SheetTitle>{task?.title ?? 'Task details'}</SheetTitle>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </div>
          ) : task ? (
            <div className="space-y-5 text-sm">
              <section>
                <h4 className="text-muted-foreground mb-1 text-xs font-medium uppercase">Description</h4>
                <p className="text-foreground whitespace-pre-wrap">{task.description || '—'}</p>
              </section>
              <section className="grid grid-cols-2 gap-3">
                <div>
                  <h4 className="text-muted-foreground mb-1 text-xs font-medium uppercase">Type</h4>
                  <p>{task.type === 'PROJECT' ? 'Project task' : 'General task'}</p>
                </div>
                {task.projectName ? (
                  <div>
                    <h4 className="text-muted-foreground mb-1 text-xs font-medium uppercase">Project</h4>
                    <p>{task.projectName}</p>
                  </div>
                ) : null}
                {task.projectPhaseName ? (
                  <div>
                    <h4 className="text-muted-foreground mb-1 text-xs font-medium uppercase">Project stage</h4>
                    <p>{task.projectPhaseName}</p>
                  </div>
                ) : null}
                <div>
                  <h4 className="text-muted-foreground mb-1 text-xs font-medium uppercase">Priority</h4>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${priorityBadgeClass(task.priority)}`}
                  >
                    {task.priority}
                  </span>
                </div>
                <div>
                  <h4 className="text-muted-foreground mb-1 text-xs font-medium uppercase">Workflow status</h4>
                  <p>{task.workflowStageName ?? task.stageName}</p>
                </div>
                <div>
                  <h4 className="text-muted-foreground mb-1 text-xs font-medium uppercase">Assigned date</h4>
                  <p>{task.assignDate}</p>
                </div>
                <div>
                  <h4 className="text-muted-foreground mb-1 text-xs font-medium uppercase">Due date</h4>
                  <p>{task.dueDate ?? '—'}</p>
                </div>
              </section>
              <section>
                <h4 className="text-muted-foreground mb-2 text-xs font-medium uppercase">Daily workflow status</h4>
                {canUpdateStatus ? (
                  <Select value={task.workflowStageId ?? ''} onValueChange={(v) => void onWorkflowChange(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.filter((s) => s.isActive).map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {task.workflowStageName ?? task.stageName} — status updates are not enabled for your role.
                  </p>
                )}
              </section>
              {!employeeMode && task.type === 'PROJECT' ? (
                <section>
                  <h4 className="text-muted-foreground mb-2 text-xs font-medium uppercase">Project stage</h4>
                  <Select value={task.projectPhaseId ?? ''} onValueChange={(v) => void onProjectPhaseChange(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {projectPhases.map((phase) => (
                        <SelectItem key={phase.id} value={phase.id}>
                          {phase.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </section>
              ) : null}
              {!employeeMode ? (
                <section>
                  <h4 className="text-muted-foreground mb-2 text-xs font-medium uppercase">Assignees</h4>
                  <ul className="space-y-2">
                    {task.assignees.map((a) => (
                      <li key={a.id} className="flex items-center gap-2">
                        <EmployeeAvatar displayName={a.displayName} profileImageUrl={a.profileImageUrl} className="size-8" />
                        <div>
                          <p className="font-medium">{a.displayName}</p>
                          <p className="text-muted-foreground text-xs">{a.jobTitle}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="text-muted-foreground mt-2 text-xs">Use Edit from the task menu to change assignees.</p>
                </section>
              ) : null}
              {canManage ? (
                <section ref={rescheduleRef}>
                  <h4 className="text-muted-foreground mb-2 text-xs font-medium uppercase">Reschedule</h4>
                  <div className="flex gap-2">
                    <Input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} />
                    <Button type="button" variant="outline" onClick={() => void onReschedule()}>
                      Apply
                    </Button>
                  </div>
                </section>
              ) : null}
              <section>
                <h4 className="text-muted-foreground mb-2 text-xs font-medium uppercase">Notes & activity</h4>
                <div className="space-y-2">
                  <Textarea
                    value={noteDraft}
                    onChange={(event) => setNoteDraft(event.target.value)}
                    placeholder={employeeMode ? 'Report progress, blockers or questions…' : 'Add an administrative note…'}
                    rows={3}
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={noteSaving || !noteDraft.trim()}
                    onClick={() => void onAddNote()}
                  >
                    {noteSaving ? 'Saving…' : 'Add note'}
                  </Button>
                </div>
                <div className="mt-4">
                  <DailyTaskActivityPanel items={activities} />
                </div>
              </section>
            </div>
          ) : null}
        </div>
        {task && canDelete ? (
          <div className="border-t px-6 py-3">
            <Button type="button" variant="destructive" size="sm" onClick={() => void onDelete()}>
              <Trash2 className="mr-1 size-4" /> Delete task
            </Button>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
