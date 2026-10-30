'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CrmPageHeader } from '@/features/admin/crm/components/crm-feedback';
import { fetchDailyTaskWorkflowStages, listDailyTasks } from '../api/daily-tasks';
import type { DailyTaskListItem, DailyTaskListResponse, DailyTaskWorkflowStage } from '../types';
import { localDateInputValue } from '../utils/local-date';
import { DailyTaskDetailDrawer } from './daily-task-detail-drawer';
import { DailyTaskListView } from './daily-task-list-view';

export function DailyTasksHistoryPage() {
  const clientToday = localDateInputValue();
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return localDateInputValue(d);
  });
  const [to, setTo] = useState(clientToday);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'GENERAL' | 'PROJECT'>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [data, setData] = useState<DailyTaskListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [stages, setStages] = useState<readonly DailyTaskWorkflowStage[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await listDailyTasks({
        assignDateFrom: from,
        assignDateTo: to,
        clientToday,
        search: search.trim() || undefined,
        type: typeFilter === 'ALL' ? undefined : typeFilter,
        page,
        pageSize,
        sortBy: 'assignDate',
        sortDir: 'desc',
      });
      setData(response);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [from, to, clientToday, search, typeFilter, page, pageSize]);

  useEffect(() => {
    void fetchDailyTaskWorkflowStages().then((r) => setStages(r.stages));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onOpenTask = (task: DailyTaskListItem) => {
    setDetailId(task.id);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-4 pb-8">
      <CrmPageHeader
        title="Task history"
        description="All daily tasks across dates with filters and pagination."
      />
      <div className="border-border bg-card flex flex-wrap items-end gap-3 rounded-xl border p-4">
        <label className="text-sm">
          <span className="text-muted-foreground mb-1 block text-xs">From</span>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground mb-1 block text-xs">To</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <Input
          className="h-10 min-w-[200px]"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
          <SelectTrigger className="h-10 w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types</SelectItem>
            <SelectItem value="GENERAL">General</SelectItem>
            <SelectItem value="PROJECT">Project</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" onClick={() => setPage(1)}>
          Apply
        </Button>
      </div>
      <DailyTaskListView
        data={data}
        loading={loading}
        error={error}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        onRetry={() => void load()}
        onOpenTask={onOpenTask}
      />
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
