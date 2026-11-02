'use client';

import type { OrgTaskSummary } from '../utils/task-metrics';

function SummaryCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="border-border bg-card min-w-[7.5rem] flex-1 rounded-lg border px-3 py-2.5 shadow-xs">
      <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">{label}</p>
      <p className={accent ? `mt-0.5 text-xl font-semibold tabular-nums ${accent}` : 'mt-0.5 text-xl font-semibold tabular-nums'}>
        {value}
      </p>
      {sub ? <p className="text-muted-foreground mt-0.5 text-[11px]">{sub}</p> : null}
    </div>
  );
}

export function DailyTaskCalendarSummary({ summary }: { summary: OrgTaskSummary }) {
  return (
    <div className="flex flex-wrap gap-2">
      <SummaryCard label="Total tasks" value={summary.total} />
      <SummaryCard label="Completed" value={summary.completed} accent="text-emerald-700" />
      <SummaryCard label="In progress" value={summary.inProgress} accent="text-blue-700" />
      <SummaryCard label="Pending" value={summary.pending} accent="text-slate-700" />
      <SummaryCard label="Overdue" value={summary.overdue} accent="text-rose-700" />
      <SummaryCard label="Unassigned" value={summary.unassigned} accent="text-amber-800" />
      <SummaryCard
        label="Completion"
        value={`${summary.completionPercent}%`}
        sub="Organization-wide"
      />
    </div>
  );
}
