'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AdminBreadcrumb } from '@/features/admin/components/admin-page-header';
import { CrmToolbarHeader } from '@/features/admin/crm/components/crm-toolbar-header';
import { cn } from '@/shared/lib/utils';
import { fetchDailyTaskWorkflowStages, listMyDailyTasks } from '../api/daily-tasks';
import type { DailyTaskListItem, DailyTaskListResponse, DailyTaskWorkflowStage } from '../types';
import { localDateInputValue } from '../utils/local-date';
import { DailyTaskDetailDrawer } from './daily-task-detail-drawer';
import { priorityBadgeClass } from '../utils/stage-colors';
import { moveDailyTaskStage } from '../api/daily-tasks';
import { useAdminToast } from '@/features/admin/components/toast';

const SCOPES = [
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'all', label: 'All my tasks' },
  { id: 'completed', label: 'Completed' },
  { id: 'overdue', label: 'Overdue' },
] as const;

export function MyDailyTasksPage() {
  const toast = useAdminToast();
  const clientToday = localDateInputValue();
  const [scope, setScope] = useState<(typeof SCOPES)[number]['id']>('today');
  const [data, setData] = useState<DailyTaskListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [stages, setStages] = useState<readonly DailyTaskWorkflowStage[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listMyDailyTasks({
        scope,
        assignDate: scope === 'today' ? clientToday : undefined,
        clientToday,
      });
      setData(response);
    } catch {
      setData({ items: [], total: 0, page: 1, pageSize: 50 });
    } finally {
      setLoading(false);
    }
  }, [scope, clientToday]);

  useEffect(() => {
    void fetchDailyTaskWorkflowStages().then((r) => setStages(r.stages));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startTask = async (task: DailyTaskListItem) => {
    const inProgress = stages.find((s) => s.stageKey === 'in_progress');
    if (!inProgress) return;
    try {
      await moveDailyTaskStage(task.id, { workflowStageId: inProgress.id });
      await load();
    } catch {
      toast.error('Could not update task.');
    }
  };

  return (
    <div className="space-y-4 pb-8">
      <AdminBreadcrumb
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Tasks', href: '/admin/daily-tasks' },
          { label: 'My work' },
        ]}
      />
      <CrmToolbarHeader
        title="My work"
        description="Your assigned daily and project tasks."
        toolbar={
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/admin/daily-tasks">Team workspace</Link>
          </Button>
        }
      />
      <div className="flex flex-wrap gap-2">
        {SCOPES.map((s) => (
          <Button
            key={s.id}
            type="button"
            size="sm"
            variant={scope === s.id ? 'default' : 'outline'}
            onClick={() => setScope(s.id)}
          >
            {s.label}
          </Button>
        ))}
      </div>
      {loading ? (
        <p className="text-muted-foreground py-12 text-center text-sm">Loading…</p>
      ) : (data?.items.length ?? 0) === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">No tasks in this view.</p>
      ) : (
        <ul className="space-y-2">
          {data!.items.map((task) => (
            <li key={task.id} className="border-border bg-card flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => { setDetailId(task.id); setDetailOpen(true); }}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium uppercase', priorityBadgeClass(task.priority))}>
                    {task.priority}
                  </span>
                  <span className="text-muted-foreground text-xs">{task.type === 'PROJECT' ? task.projectName : 'General'}</span>
                </div>
                <p className="mt-1 font-medium">{task.title}</p>
                <p className="text-muted-foreground text-xs">
                  Assigned {task.assignDate}
                  {task.dueDate ? ` · Due ${task.dueDate}` : ''} · {task.stageName}
                </p>
              </button>
                  {task.type === 'GENERAL' && task.workflowStageKey === 'todo' ? (
                <Button type="button" size="sm" variant="outline" onClick={() => void startTask(task)}>
                  Start
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <DailyTaskDetailDrawer
        taskId={detailId}
        open={detailOpen}
        stages={stages}
        onOpenChange={setDetailOpen}
        onChanged={load}
      />
    </div>
  );
}
