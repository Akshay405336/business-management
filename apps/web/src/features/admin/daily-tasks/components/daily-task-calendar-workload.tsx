'use client';

import { cn } from '@/shared/lib/utils';
import { EmployeeAvatar } from '@/features/employees/components/employee-avatar';
import type { EmployeeWorkloadRow } from '../utils/task-metrics';

export function DailyTaskCalendarWorkload({
  rows,
  selectedEmployeeId,
  onSelectEmployee,
}: {
  rows: readonly EmployeeWorkloadRow[];
  selectedEmployeeId: string;
  onSelectEmployee: (employeeId: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed bg-muted/20 px-3 py-4 text-center text-xs">
        No assigned tasks in this period for the current filters.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">Employee workload</h4>
        {selectedEmployeeId ? (
          <button
            type="button"
            className="text-primary text-xs font-medium hover:underline"
            onClick={() => onSelectEmployee('')}
          >
            Show all employees
          </button>
        ) : null}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {rows.map((row) => {
          const selected = selectedEmployeeId === row.employeeId;
          return (
            <button
              key={row.employeeId}
              type="button"
              onClick={() => onSelectEmployee(selected ? '' : row.employeeId)}
              className={cn(
                'border-border bg-card shrink-0 rounded-lg border px-3 py-2 text-left shadow-xs transition-colors hover:bg-muted/40',
                selected && 'ring-primary/30 bg-primary/5 ring-2',
              )}
            >
              <div className="flex items-center gap-2">
                <EmployeeAvatar displayName={row.displayName} size="sm" />
                <div className="min-w-0">
                  <p className="max-w-[8rem] truncate text-xs font-semibold">{row.displayName}</p>
                  <p className="text-muted-foreground text-[10px]">{row.total} tasks</p>
                </div>
              </div>
              <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px]">
                <span className="text-emerald-700">{row.completed} done</span>
                <span className="text-blue-700">{row.inProgress} active</span>
                <span>{row.pending} pending</span>
                {row.overdue > 0 ? <span className="text-rose-700">{row.overdue} overdue</span> : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
